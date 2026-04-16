'use client';

import { useState, useRef, useEffect } from 'react';
import type { RepairQuote } from '@/types/quote';

interface InternalNotesSectionProps {
  quote: RepairQuote;
  onFieldChange: <K extends keyof RepairQuote>(field: K, value: RepairQuote[K]) => void;
}

export function InternalNotesSection({ quote, onFieldChange }: InternalNotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasNotes = !!quote.internal_notes?.trim();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [quote.internal_notes, isExpanded]);

  return (
    <section className="bg-white rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-lg font-semibold text-gray-900">Internal Notes</span>
          {hasNotes && !isExpanded && (
            <span className="text-sm text-gray-500 truncate max-w-[150px]">
              — {quote.internal_notes}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <textarea
            ref={textareaRef}
            value={quote.internal_notes || ''}
            onChange={(e) => {
              onFieldChange('internal_notes', e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            placeholder="Add quick reference notes (auto-saves)..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base resize-none overflow-hidden"
          />
          <p className="text-xs text-gray-400 mt-2">Not visible to customer • Auto-saves</p>
        </div>
      )}
    </section>
  );
}
