'use client';

import React, { useState, useEffect } from 'react';
import { BatchItem, BatchUpload } from './BatchUpload';
import { useKitPoller } from '../hooks/useKitPoller';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface BatchRowProps {
  item: BatchItem;
  kitId: string | null;
  status: 'pending' | 'starting' | 'polling' | 'failed_to_start';
}

function BatchRow({ item, kitId, status }: BatchRowProps) {
  const { kit, error } = useKitPoller(kitId);

  const displayStatus = status === 'pending' ? 'Waiting...' : status === 'starting' ? 'Starting...' : status === 'failed_to_start' ? 'Failed to start' : kit ? kit.status : 'Polling...';
  const isFailed = status === 'failed_to_start' || error || (kit && kit.status === 'failed');
  const isCompleted = kit && kit.status === 'completed';
  const isActive = status === 'starting' || (kit && kit.status === 'generating');

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white truncate max-w-[250px]">{item.companyUrl}</span>
        <span className="text-xs text-neutral-400 mt-1">
          {kit ? `Stage: ${kit.stage}` : status === 'pending' ? 'Queued' : 'Initializing...'}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        {isCompleted ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready
          </span>
        ) : isFailed ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Failed
          </span>
        ) : isActive ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {displayStatus}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700">
            {displayStatus}
          </span>
        )}
      </div>
    </div>
  );
}

export function BatchRunner({ items }: { items: BatchItem[] }) {
  // Store kitIds and statuses
  const [results, setResults] = useState<Record<number, { kitId: string | null, status: 'pending' | 'starting' | 'polling' | 'failed_to_start' }>>({});

  useEffect(() => {
    // Initialize state
    const initial: any = {};
    items.forEach((_, i) => initial[i] = { kitId: null, status: 'pending' });
    setResults(initial);

    let isMounted = true;

    const runBatchSequentially = async () => {
      for (let i = 0; i < items.length; i++) {
        if (!isMounted) return;

        setResults(prev => ({ ...prev, [i]: { kitId: null, status: 'starting' } }));
        
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/kits`, { credentials: 'include',  method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items[i])
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);

          if (isMounted) {
            setResults(prev => ({ ...prev, [i]: { kitId: data.kitId, status: 'polling' } }));
          }
          
          // Add a small delay between post requests to be safe
          await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
          if (isMounted) {
            setResults(prev => ({ ...prev, [i]: { kitId: null, status: 'failed_to_start' } }));
          }
        }
      }
    };

    runBatchSequentially();

    return () => { isMounted = false; };
  }, [items]);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-6">Batch Processing Results</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, idx) => (
          <BatchRow 
            key={idx} 
            item={item} 
            kitId={results[idx]?.kitId || null} 
            status={results[idx]?.status || 'pending'} 
          />
        ))}
      </div>
    </div>
  );
}
