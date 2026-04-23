'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuote } from '@/hooks/useQuote';
import { InternalNotesSection } from './InternalNotesSection';
import { CustomerSection } from './CustomerSection';
import { PricingSection } from './PricingSection';
import { PhotosSection } from './PhotosSection';
import { ActionBar } from './ActionBar';
import { SaveIndicator } from './SaveIndicator';
import { QuoteSentView } from './QuoteSentView';
import { formatCurrency } from '@/lib/calculations';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

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
    updateQuote,
    setSellPrice,
    setMaterialCost,
    setLaborCost,
    toggleDeposit,
    refetch,
  } = useQuote(quoteId);

  // Check if user is admin
  useEffect(() => {
    async function checkRole() {
      const supabase = createBrowserSupabaseClient();
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

  // Show simplified info view after proposal is sent (for Colt)
  const isSent = quote.status === 'awaiting_signature' ||
                 quote.status === 'awaiting_payment' ||
                 quote.status === 'paid' ||
                 quote.status === 'repair_scheduled';

  if (isSent && !isAdmin) {
    return <QuoteSentView quote={quote} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
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

            <div className="flex items-center gap-4">
              <SaveIndicator status={saveStatus} />
              {isAdmin && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <span>Admin Dashboard</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
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

      {/* Quote Appointment Banner */}
      {quote.status === 'quote_scheduled' && quote.quote_appointment_date && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Quote Appointment</p>
                <p className="text-blue-700">
                  {new Date(quote.quote_appointment_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })} at {new Date(quote.quote_appointment_date).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <InternalNotesSection quote={quote} onFieldChange={updateField} />

        <CustomerSection quote={quote} onFieldChange={updateField} />

        <PhotosSection quoteId={quote.id} />

        <PricingSection
          quote={quote}
          onSetMaterialCost={setMaterialCost}
          onSetLaborCost={setLaborCost}
          onSetSellPrice={setSellPrice}
          onToggleDeposit={toggleDeposit}
          onMaterialsNotesChange={(notes) => updateField('materials_notes', notes)}
          onLegacySplit={(material, labor) => {
            // Atomically commit the legacy split: material + labor == existing base_cost,
            // so base_cost stays the same; only misc cascade re-fires via the sell-price path.
            const baseCost = material + labor;
            const markedUpPrice = baseCost > 0 ? baseCost / 0.67 : 0;
            const total = Math.ceil(markedUpPrice / 10) * 10;
            const sellPrice = quote.quote_price || 0;
            const misc = sellPrice - total;
            updateQuote({
              material_cost: material,
              labor_cost: labor,
              base_cost: baseCost,
              misc,
            });
          }}
        />
      </main>

      {/* Action Bar */}
      <ActionBar quote={quote} onUpdate={refetch} />
    </div>
  );
}
