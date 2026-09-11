'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface Props {
  kitId: string;
  section: string;
  category?: string;
  flushSave: () => Promise<void>;
  onSuccess: () => void;
}

export function RegenerateButton({ kitId, section, category, flushSave, onSuccess }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      // Critical: Ensure any pending edits are flushed first so they aren't lost
      await flushSave();

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/kits/${kitId}/regenerate-section`, { credentials: 'include',  method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, category })
      });
      
      if (!res.ok) throw new Error('Regeneration failed');
      
      onSuccess();
    } catch (err) {
      alert('Failed to regenerate section');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleRegenerate}
      disabled={isGenerating}
      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
    >
      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      Regenerate
    </button>
  );
}
