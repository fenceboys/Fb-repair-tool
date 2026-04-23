'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PhotosSection } from '@/components/PhotosSection';

interface QuoteData {
  id: string;
  client_name: string | null;
}

export default function PhotosPage() {
  const params = useParams();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const { data, error: fetchError } = await supabase
          .from('repair_quotes')
          .select('id, client_name')
          .eq('id', quoteId)
          .single();

        if (fetchError) throw fetchError;
        setQuote(data);
      } catch (err) {
        console.error('Error fetching quote:', err);
        setError('Quote not found');
      } finally {
        setLoading(false);
      }
    }

    if (quoteId) {
      fetchQuote();
    }
  }, [quoteId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-700">{error || 'Quote not found'}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/quote/${quoteId}`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Photos</h1>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {quote.client_name || 'Unnamed Customer'}
          </h2>
        </div>

        <PhotosSection quoteId={quote.id} />
      </main>
    </div>
  );
}
