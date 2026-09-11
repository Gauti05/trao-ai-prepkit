'use client';

import React, { useState } from 'react';
import { useKitPoller } from '../hooks/useKitPoller';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface RowProps {
  initialPayload: { jd: string; companyUrl: string; days: number };
}

export function BatchRow({ initialPayload }: RowProps) {
  const [kitId, setKitId] = useState<string | null>(null);
  const [kickoffError, setKickoffError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const { kit, loading, error } = useKitPoller(kitId);

  // Auto start on mount
  React.useEffect(() => {
    if (started) return;
    setStarted(true);

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/kits`, { credentials: 'include',  method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initialPayload)
    })
    .then(r => r.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      setKitId(data.kitId);
    })
    .catch(err => setKickoffError(err.message));
  }, [initialPayload, started]);

  const displayStatus = kickoffError ? 'Failed to start' : error ? 'Error polling' : kit ? kit.status : 'Queued...';
  const isFailed = kickoffError || error || (kit && kit.status === 'failed');
  const isCompleted = kit && kit.status === 'completed';

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white truncate max-w-xs">{initialPayload.companyUrl}</span>
        <span className="text-xs text-neutral-400 mt-1">
          {kit ? `Stage: ${kit.stage}` : 'Initializing...'}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        {isCompleted ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready
          </span>
        ) : isFailed ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            Failed
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {displayStatus}
          </span>
        )}
      </div>
    </div>
  );
}
