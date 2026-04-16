'use client';

import type { RepairQuote } from '@/types/quote';

interface InternalNotesSectionProps {
  quote: RepairQuote;
  onFieldChange: <K extends keyof RepairQuote>(field: K, value: RepairQuote[K]) => void;
}

export function InternalNotesSection({ quote, onFieldChange }: InternalNotesSectionProps) {
  return (
    <section className="bg-amber-50 rounded-lg border border-amber-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <h2 className="text-sm font-semibold text-amber-800">Internal Notes</h2>
        <span className="text-xs text-amber-600">(not visible to customer)</span>
      </div>

      <textarea
        value={quote.internal_notes || ''}
        onChange={(e) => onFieldChange('internal_notes', e.target.value)}
        placeholder="Add quick reference notes..."
        rows={2}
        className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm bg-white resize-none placeholder-amber-400"
      />
    </section>
  );
}
