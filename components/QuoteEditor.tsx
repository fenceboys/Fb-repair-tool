'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuote } from '@/hooks/useQuote';
import { CustomerSection } from './CustomerSection';
import { PricingSection } from './PricingSection';
import { ActionBar } from './ActionBar';
import { SaveIndicator } from './SaveIndicator';
import { formatCurrency } from '@/lib/calculations';
import { supabase } from '@/lib/supabase';

interface QuoteEditorProps {
  quoteId: string;
}

export function QuoteEditor({ quoteId }: QuoteEditorProps) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const {
    quote,
    loading,
    error,
    saveStatus,
    updateField,
    setBaseCost,
    setSellPrice,
    toggleDeposit,
  } = useQuote(quoteId);

  // Check if user is admin
  useEffect(() => {
    async function checkRole() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setIsAdmin(profile?.role === 'admin');
      }
    }
    checkRole();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-700 mb-4">{error || 'Quote not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Quotes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span>Back</span>
              </button>

              {isAdmin && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Dashboard
                </Link>
              )}
            </div>

            <SaveIndicator status={saveStatus} />
          </div>

          {/* Quote Summary */}
          <div className="mt-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {quote.client_name || 'New Quote'}
              </h1>
              <p className="text-sm text-gray-500">
                {quote.address || 'No address'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {quote.quote_price > 0 ? formatCurrency(quote.quote_price) : '—'}
              </p>
              <p className="text-sm text-gray-500">
                {quote.requires_deposit ? `Deposit: ${formatCurrency(quote.deposit)}` : 'Full payment'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <CustomerSection quote={quote} onFieldChange={updateField} />

        <PricingSection
          quote={quote}
          onSetBaseCost={setBaseCost}
          onSetSellPrice={setSellPrice}
          onToggleDeposit={toggleDeposit}
        />
      </main>

      {/* Action Bar */}
      <ActionBar quote={quote} />
    </div>
  );
}
