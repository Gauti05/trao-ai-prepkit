'use client';

import React, { useState } from 'react';
import { Upload, FileJson, XCircle, PlayCircle } from 'lucide-react';
import { z } from 'zod';

const BatchItemSchema = z.object({
  jd: z.string().min(10, 'JD must be at least 10 chars'),
  companyUrl: z.string().url('Must be a valid URL'),
  days: z.number().int().min(1).max(60)
});

const BatchSchema = z.array(BatchItemSchema);

export type BatchItem = z.infer<typeof BatchItemSchema>;

interface Props {
  onStartBatch: (items: BatchItem[]) => void;
}

export function BatchUpload({ onStartBatch }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<BatchItem[] | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setItems(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        
        const result = BatchSchema.safeParse(json);
        if (!result.success) {
          const firstError = result.error.issues[0];
          const index = firstError.path[0];
          setError(`Validation failed at item [${String(index)}]: ${firstError.message}`);
          return;
        }

        setItems(result.data);
      } catch (err) {
        setError('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-neutral-700 rounded-2xl p-10 text-center hover:border-blue-500/50 transition-colors bg-neutral-900/40 relative">
        <input 
          type="file" 
          accept=".json" 
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Upload cases.json</h3>
            <p className="text-sm text-neutral-400 mt-1">Drag and drop or click to browse</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {items && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileJson className="w-5 h-5 text-blue-400" />
              <h4 className="text-white font-medium">Ready to process {items.length} items</h4>
            </div>
            <button
              onClick={() => onStartBatch(items)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              Start Batch
            </button>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {items.map((item, idx) => (
              <div key={idx} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex justify-between items-center">
                <span className="text-sm text-neutral-300 truncate max-w-[200px]">{item.companyUrl}</span>
                <span className="text-xs text-neutral-500">{item.days} days</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
