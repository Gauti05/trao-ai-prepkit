'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { InlineTextEditor } from './InlineTextEditor';
import { RegenerateButton } from './RegenerateButton';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

interface Question {
  id: string;
  prompt: string;
  answer_outline: string;
  category: string;
  source: 'ai' | 'edited' | 'manual';
}

interface Props {
  kitId: string;
  questions: Question[];
  onUpdate: (questions: Question[]) => void;
  flushSave: () => Promise<void>;
  onRegenerateSuccess: () => void;
}

const CATEGORIES = ['technical', 'behavioural', 'system-design', 'company-fit'];

export function DraggableQuestionsList({ kitId, questions, onUpdate, flushSave, onRegenerateSuccess }: Props) {
  
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    const sourceCategory = result.source.droppableId;
    const destCategory = result.destination.droppableId;

    // We only have one big flat array for state, but the UI shows multiple lists.
    // Let's create a mapped view of lists
    const sourceQuestions = questions.filter(q => q.category === sourceCategory);
    const destQuestions = sourceCategory === destCategory ? sourceQuestions : questions.filter(q => q.category === destCategory);
    
    const [movedItem] = sourceQuestions.splice(sourceIndex, 1);
    
    // If moved to a different category, mark it as edited (unless manual)
    if (sourceCategory !== destCategory) {
      movedItem.category = destCategory;
      if (movedItem.source !== 'manual') {
        movedItem.source = 'edited';
      }
      destQuestions.splice(destIndex, 0, movedItem);
    } else {
      sourceQuestions.splice(destIndex, 0, movedItem);
    }

    // Now reconstruct the full flat array
    const otherQuestions = questions.filter(q => q.category !== sourceCategory && q.category !== destCategory);
    let newQuestions = [];
    if (sourceCategory === destCategory) {
      newQuestions = [...otherQuestions, ...sourceQuestions];
    } else {
      newQuestions = [...otherQuestions, ...sourceQuestions, ...destQuestions];
    }

    onUpdate(newQuestions);
  };

  const handleEditPrompt = (id: string, newText: string) => {
    const newQuestions = questions.map(q => {
      if (q.id === id) {
        return {
          ...q,
          prompt: newText,
          source: q.source === 'manual' ? 'manual' : 'edited'
        };
      }
      return q;
    });
    onUpdate(newQuestions as Question[]);
  };

  const handleEditAnswer = (id: string, newText: string) => {
    const newQuestions = questions.map(q => {
      if (q.id === id) {
        return {
          ...q,
          answer_outline: newText,
          source: q.source === 'manual' ? 'manual' : 'edited'
        };
      }
      return q;
    });
    onUpdate(newQuestions as Question[]);
  };

  const handleDelete = (id: string) => {
    onUpdate(questions.filter(q => q.id !== id));
  };

  const handleAdd = (category: string) => {
    const newQ: Question = {
      id: `manual_${Date.now()}`,
      prompt: 'New manual question...',
      answer_outline: 'Answer outline here...',
      category,
      source: 'manual'
    };
    onUpdate([...questions, newQ]);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-12">
        {CATEGORIES.map(category => {
          const catQuestions = questions.filter(q => q.category === category);
          
          return (
            <div key={category} className="bg-neutral-900/40 rounded-2xl p-6 border border-neutral-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white capitalize">{category.replace('-', ' ')}</h3>
                <div className="flex gap-3">
                  <button onClick={() => handleAdd(category)} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition-colors">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                  <RegenerateButton kitId={kitId} section="questions" category={category} flushSave={flushSave} onSuccess={onRegenerateSuccess} />
                </div>
              </div>
              
              <Droppable droppableId={category}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3 min-h-[50px]"
                  >
                    {catQuestions.map((q, index) => (
                      <Draggable key={q.id} draggableId={q.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex gap-3 bg-neutral-950 border ${snapshot.isDragging ? 'border-blue-500 shadow-xl z-50' : 'border-neutral-800'} rounded-xl p-4 group transition-colors`}
                          >
                            <div {...provided.dragHandleProps} className="mt-1 text-neutral-600 hover:text-neutral-400 cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-5 h-5" />
                            </div>
                            
                            <div className="flex-1 space-y-4">
                              <div>
                                <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mb-1 block">Question Prompt</label>
                                <InlineTextEditor
                                  initialValue={q.prompt}
                                  onChange={(val) => handleEditPrompt(q.id, val)}
                                  className="text-neutral-200 text-lg font-medium"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mb-1 block">Answer Outline</label>
                                <InlineTextEditor
                                  initialValue={q.answer_outline || ''}
                                  onChange={(val) => handleEditAnswer(q.id, val)}
                                  className="text-neutral-400 text-sm"
                                />
                              </div>
                              <div className="mt-2 flex gap-2">
                                {q.source === 'edited' && (
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Edited</span>
                                )}
                                {q.source === 'manual' && (
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Your Addition</span>
                                )}
                              </div>
                            </div>

                            <button onClick={() => handleDelete(q.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all h-fit">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
