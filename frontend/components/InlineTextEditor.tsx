'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';

interface Props {
  initialValue: string;
  onChange: (newValue: string) => void;
  className?: string;
}

export function InlineTextEditor({ initialValue, onChange, className = '' }: Props) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="relative group w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        className={`w-full bg-transparent border border-transparent hover:border-neutral-700 focus:border-blue-500/50 focus:bg-neutral-900/50 rounded-lg outline-none resize-none overflow-hidden transition-all py-1 px-2 -ml-2 ${className}`}
        rows={1}
        placeholder="Click to edit..."
      />
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 pointer-events-none text-neutral-600 transition-opacity">
        <Pencil className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}
