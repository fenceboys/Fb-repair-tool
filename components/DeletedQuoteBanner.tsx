'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DeletedQuoteBannerProps {
  quoteId: string;
  deletedAt: string;
  onRestored?: () => void;
}

export function DeletedQuoteBanner({ quoteId, deletedAt, onRestored }: DeletedQuoteBannerProps) {
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRestore = async () => {
    setRestoring(true);
    setError(null);
    const { error: uErr } = await supabase
      .from('repair_quotes')
      .update({ deleted_at: null })
      .eq('id', quoteId);
    setRestoring(false);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    onRestored?.();
  };

  const deletedDate = new Date(deletedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-red-50 border-b border-red-200">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-900">This quote is in the trash</p>
            <p className="text-xs text-red-700">Deleted {deletedDate}. Restore to make it editable and visible on dashboards.</p>
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={handleRestore}
          disabled={restoring}
          className="shrink-0 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:bg-red-300"
        >
          {restoring ? 'Restoring…' : 'Restore'}
        </button>
      </div>
    </div>
  );
}
