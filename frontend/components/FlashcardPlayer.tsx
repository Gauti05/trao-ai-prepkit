'use client';

import React, { useState, useEffect } from 'react';
import { Eye, ChevronRight, CheckCircle2 } from 'lucide-react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  confidence?: 'uncovered' | 'low' | 'medium' | 'high';
}

interface Props {
  kitId: string;
  sortedFlashcards: Flashcard[];
  onUpdateConfidence: (id: string, confidence: 'low' | 'medium' | 'high') => void;
}

export function FlashcardPlayer({ kitId, sortedFlashcards, onUpdateConfidence }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  // If sortedFlashcards changes from outside (e.g. reload), reset
  useEffect(() => {
    setCurrentIndex(0);
    setIsRevealed(false);
  }, [sortedFlashcards.length]);

  if (sortedFlashcards.length === 0) {
    return (
      <div className="bg-neutral-900/40 rounded-2xl p-12 border border-neutral-800 text-center">
        <p className="text-neutral-400">No flashcards available for this kit.</p>
      </div>
    );
  }

  if (currentIndex >= sortedFlashcards.length) {
    return (
      <div className="bg-neutral-900/40 rounded-2xl p-12 border border-neutral-800 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">Session Complete!</h3>
        <p className="text-neutral-400 mb-6">You've gone through all the flashcards in this queue.</p>
        <button 
          onClick={() => { setCurrentIndex(0); setIsRevealed(false); }}
          className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
        >
          Restart Queue
        </button>
      </div>
    );
  }

  const card = sortedFlashcards[currentIndex];

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleRate = (confidence: 'low' | 'medium' | 'high') => {
    onUpdateConfidence(card.id, confidence);
    setIsRevealed(false);
    setCurrentIndex(prev => prev + 1);
  };

  return (
    <div className="bg-neutral-900/40 rounded-2xl p-8 border border-neutral-800 min-h-[400px] flex flex-col relative">
      <div className="absolute top-6 right-6 text-sm text-neutral-500 font-medium">
        Card {currentIndex + 1} of {sortedFlashcards.length}
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full text-center my-8">
        <h2 className="text-3xl font-bold text-white leading-tight mb-8">
          {card.front}
        </h2>

        {!isRevealed ? (
          <button 
            onClick={handleReveal}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all hover:scale-105"
          >
            <Eye className="w-5 h-5" />
            Reveal Answer
          </button>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 bg-neutral-950 rounded-xl border border-neutral-800 mb-8">
              <p className="text-lg text-neutral-300 leading-relaxed">
                {card.back}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">How well did you know this?</p>
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => handleRate('low')}
                  className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/40 rounded-xl font-bold transition-all hover:-translate-y-1"
                >
                  Hard
                </button>
                <button 
                  onClick={() => handleRate('medium')}
                  className="px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 hover:border-amber-500/40 rounded-xl font-bold transition-all hover:-translate-y-1"
                >
                  Good
                </button>
                <button 
                  onClick={() => handleRate('high')}
                  className="px-6 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 hover:border-green-500/40 rounded-xl font-bold transition-all hover:-translate-y-1"
                >
                  Easy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
