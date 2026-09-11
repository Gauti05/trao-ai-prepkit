'use client';

import React from 'react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  confidence?: 'uncovered' | 'low' | 'medium' | 'high';
}

interface Props {
  flashcards: Flashcard[];
}

export function FlashcardSummary({ flashcards }: Props) {
  const total = flashcards.length;
  const uncovered = flashcards.filter(f => !f.confidence || f.confidence === 'uncovered').length;
  const covered = total - uncovered;
  const low = flashcards.filter(f => f.confidence === 'low').length;
  const medium = flashcards.filter(f => f.confidence === 'medium').length;
  const high = flashcards.filter(f => f.confidence === 'high').length;

  const percentComplete = total === 0 ? 0 : Math.round((covered / total) * 100);

  return (
    <div className="bg-neutral-900/40 rounded-2xl p-6 border border-neutral-800 mb-8">
      <h3 className="text-xl font-bold text-white mb-6">Practice Summary</h3>
      
      <div className="mb-6">
        <div className="flex justify-between text-sm text-neutral-400 mb-2">
          <span>Overall Progress</span>
          <span>{percentComplete}%</span>
        </div>
        <div className="w-full bg-neutral-800 rounded-full h-3">
          <div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${percentComplete}%` }}></div>
        </div>
        <div className="text-xs text-neutral-500 mt-2">
          {covered} of {total} cards covered
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-neutral-950 p-4 rounded-xl border border-red-900/30">
          <div className="text-2xl font-bold text-red-500">{low}</div>
          <div className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Low Confidence</div>
        </div>
        <div className="bg-neutral-950 p-4 rounded-xl border border-amber-900/30">
          <div className="text-2xl font-bold text-amber-500">{medium}</div>
          <div className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Medium Confidence</div>
        </div>
        <div className="bg-neutral-950 p-4 rounded-xl border border-green-900/30">
          <div className="text-2xl font-bold text-green-500">{high}</div>
          <div className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">High Confidence</div>
        </div>
      </div>
    </div>
  );
}
