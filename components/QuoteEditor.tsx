'use client';

import { useRouter } from 'next/navigation';
import { useQuote } from '@/hooks/useQuote';
import { CustomerSection } from './CustomerSection';
import { PricingSection } from './PricingSection';
import { ActionBar } from './ActionBar';
import { SaveIndicator } from './SaveIndicator';
import { formatCurrency } from '@/lib/calculations';

interface QuoteEditorProps {
  quoteId: string;
}

export function QuoteEditor({ quoteId }: QuoteEditorProps) {
  const router = useRouter();
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

  const handleSendToSlack = async (pdfUrl?: string) => {
    if (!quote) return;

    const response = await fetch('/api/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote: {
          client_name: quote.client_name,
          phone: quote.phone,
          email: quote.email,
          address: quote.address,
          city_state: quote.city_state,
          quote_price: quote.quote_price,
          deposit: quote.deposit,
          requires_deposit: quote.requires_deposit ?? false,
          repair_description: quote.repair_description,
        },
        pdfUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send to Slack');
    }
  };

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
        <PricingSection
          quote={quote}
          onSetBaseCost={setBaseCost}
          onSetSellPrice={setSellPrice}
          onToggleDeposit={toggleDeposit}
        />

        <CustomerSection quote={quote} onFieldChange={updateField} />
      </main>

      {/* Action Bar */}
      <ActionBar quote={quote} onSendToSlack={handleSendToSlack} />
    </div>
  );
}
