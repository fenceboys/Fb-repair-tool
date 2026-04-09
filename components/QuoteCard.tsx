'use client';

import Link from 'next/link';
import type { RepairQuote } from '@/types/quote';
import { formatCurrency } from '@/lib/calculations';

interface QuoteCardProps {
  quote: RepairQuote;
  onDelete: (id: string) => void;
}

export function QuoteCard({ quote, onDelete }: QuoteCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-amber-100 text-amber-700',
      sent: 'bg-blue-100 text-blue-700',
      signed: 'bg-green-100 text-green-700',
    };
    return styles[status] || styles.draft;
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this quote? This cannot be undone.')) {
      onDelete(quote.id);
    }
  };

  return (
    <Link href={`/quote/${quote.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all active:bg-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {quote.client_name || 'Unnamed Quote'}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              {quote.address || 'No address'}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(quote.status)}`}>
              {quote.status}
            </span>
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              aria-label="Delete quote"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{formatDate(quote.created_at)}</span>
            {quote.phone && (
              <>
                <span>•</span>
                <span>{quote.phone}</span>
              </>
            )}
          </div>
          <span className="text-lg font-bold text-gray-900">
            {quote.quote_price > 0 ? formatCurrency(quote.quote_price) : '—'}
          </span>
        </div>
      </div>
    </Link>
  );
}
