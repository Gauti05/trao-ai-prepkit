'use client';

import React from 'react';
import { KitState } from '../hooks/useKitPoller';
import { RefreshCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const STAGES = ['crawling', 'extracting', 'generating', 'checking_coverage', 'scheduling', 'ready'];
const STAGE_LABELS: Record<string, string> = {
  'crawling': 'Crawling Company Data',
  'extracting': 'Extracting Requirements',
  'generating': 'Generating Material',
  'checking_coverage': 'Checking Coverage',
  'scheduling': 'Building Schedule',
  'ready': 'Ready'
};

interface Props {
  kit: KitState;
  onRetry: () => void;
}

export function ProgressTracker({ kit, onRetry }: Props) {
  const currentStageIndex = STAGES.indexOf(kit.stage);
  const isFailed = kit.status === 'failed';

  return (
    <div className="bg-neutral-900/60 backdrop-blur-xl p-6 rounded-2xl border border-neutral-800 shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-6">Generation Progress</h3>
      
      <div className="space-y-4">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentStageIndex || kit.status === 'completed';
          const isCurrent = idx === currentStageIndex && kit.status === 'generating';
          const isPending = idx > currentStageIndex && kit.status !== 'failed';
          const isFailedStep = idx === currentStageIndex && isFailed;

          return (
            <motion.div 
              key={stage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex items-center gap-4 ${isPending ? 'opacity-40' : 'opacity-100'}`}
            >
              <div className="relative flex-shrink-0">
                {isCompleted ? (
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                ) : isFailedStep ? (
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping absolute" />
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 relative" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                    <div className="w-2 h-2 rounded-full bg-neutral-600" />
                  </div>
                )}
                
                {/* Connecting line */}
                {idx < STAGES.length - 1 && (
                  <div className={`absolute top-8 left-1/2 -ml-px w-0.5 h-6 ${isCompleted && !isFailedStep ? 'bg-green-500/50' : 'bg-neutral-800'}`} />
                )}
              </div>
              
              <div>
                <p className={`font-medium ${isFailedStep ? 'text-red-400' : isCurrent ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-neutral-400'}`}>
                  {STAGE_LABELS[stage]}
                </p>
                {isFailedStep && kit.error && (
                  <p className="text-sm text-red-400/80 mt-1">{kit.error}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {isFailed && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <p className="text-red-400 text-sm">Pipeline stopped. You can safely retry without creating a duplicate.</p>
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-red-500/20"
            >
              <RefreshCcw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
