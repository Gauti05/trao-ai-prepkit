'use client';

import React, { useEffect, useState } from 'react';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { DraggableQuestionsList } from './DraggableQuestionsList';
import { FlashcardPlayer } from './FlashcardPlayer';
import { FlashcardSummary } from './FlashcardSummary';
import { AlertTriangle, CheckCircle2, Save, LayoutTemplate, BrainCircuit } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function KitBuilder({ kitId, initialData }: { kitId: string; initialData: any }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'builder' | 'practice'>('builder');
  const { data, updateData, flushSave, isSaving, saveError } = useDebouncedSave({ kitId, initialData });

  const handleQuestionsUpdate = (newQuestions: any[]) => {
    updateData({ ...data, questions: newQuestions });
  };

  const reloadData = async () => {
    // A full page refresh after regeneration guarantees we have the latest server state,
    // though we could also just fetch the single kit again here. Let's do a soft refresh:
    router.refresh();
  };

  const handleConfidenceUpdate = async (id: string, confidence: 'low' | 'medium' | 'high') => {
    const newFlashcards = (data.flashcards || []).map((f: any) => 
      f.id === id ? { ...f, confidence } : f
    );
    
    // Update local state optimistically
    updateData({ ...data, flashcards: newFlashcards });

    // Immediate flush for practice mode (no debounce)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/kits/${kitId}`, { credentials: 'include',  method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcards: newFlashcards })
      });
    } catch (err) {
      console.error('Failed to save confidence immediately', err);
    }
  };

  // Sort logic: uncovered -> low -> medium -> high
  const getSortedFlashcards = () => {
    const cards = data.flashcards || [];
    const weight = { uncovered: 0, low: 1, medium: 2, high: 3 };
    return [...cards].sort((a, b) => {
      const wA = weight[(a.confidence as keyof typeof weight) || 'uncovered'];
      const wB = weight[(b.confidence as keyof typeof weight) || 'uncovered'];
      return wA - wB;
    });
  };

  if (!data) return <div>No data available</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header & Global Save Status */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-neutral-800 pb-4 mb-8 pt-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{data.role?.title || 'Unknown Role'}</h1>
            <p className="text-neutral-400">{data.source?.company || 'Unknown Company'}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {isSaving && (
              <span className="flex items-center gap-2 text-sm text-neutral-400">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Saving...
              </span>
            )}
            {saveError && (
              <span className="flex items-center gap-2 text-sm text-red-400">
                <AlertTriangle className="w-4 h-4" />
                Save failed
              </span>
            )}
            {!isSaving && !saveError && (
              <span className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Saved
              </span>
            )}
            <button onClick={() => flushSave()} className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors">
              <Save className="w-4 h-4" /> Force Save
            </button>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1 bg-neutral-900 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'builder' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'}`}
          >
            <LayoutTemplate className="w-4 h-4" />
            Builder Mode
          </button>
          <button
            onClick={() => {
              flushSave(); // flush before switching to practice
              setActiveTab('practice');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'practice' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'}`}
          >
            <BrainCircuit className="w-4 h-4" />
            Practice Mode
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12">
          
          {activeTab === 'builder' && (
            <div className="mb-12 animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white mb-6">Interview Questions</h2>
              <DraggableQuestionsList 
                kitId={kitId}
                questions={data.questions || []} 
                onUpdate={handleQuestionsUpdate}
                flushSave={flushSave}
                onRegenerateSuccess={reloadData}
              />
            </div>
          )}

          {activeTab === 'practice' && (
            <div className="mb-12 animate-in fade-in duration-300 max-w-4xl mx-auto">
              <FlashcardSummary flashcards={data.flashcards || []} />
              
              <h2 className="text-2xl font-bold text-white mb-6">Flashcard Queue</h2>
              <FlashcardPlayer 
                kitId={kitId}
                sortedFlashcards={getSortedFlashcards()}
                onUpdateConfidence={handleConfidenceUpdate}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
