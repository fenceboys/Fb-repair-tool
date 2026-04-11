'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/calculations';

interface QuoteData {
  id: string;
  client_name: string | null;
  email: string | null;
  quote_price: number;
  base_cost: number;
  misc: number;
  deposit: number;
  requires_deposit: boolean;
  status: 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';
  updated_at: string;
}

export default function PaymentLedgerPage() {
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
          .select('id, client_name, email, quote_price, base_cost, misc, deposit, requires_deposit, status, updated_at')
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

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

  const amountDue = quote.requires_deposit ? quote.deposit : quote.quote_price;
  const isPaid = quote.status === 'paid';

  // Calculate misc the same way as PricingSection (sell price - min price with 25% margin)
  const minPrice = quote.base_cost > 0 ? Math.round((quote.base_cost / 0.75) * 100) / 100 : 0;
  const calculatedMisc = quote.quote_price - minPrice;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
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
            <h1 className="text-lg font-semibold text-gray-900">Payment Ledger</h1>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6">
        {/* Customer Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {quote.client_name || 'Unnamed Customer'}
          </h2>
          {quote.email && (
            <p className="text-gray-500">{quote.email}</p>
          )}
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Payment Summary
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Quote Total</span>
              <span className="font-medium">{formatCurrency(quote.quote_price)}</span>
            </div>

            {quote.requires_deposit && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Deposit (50%)</span>
                  <span className="font-medium">{formatCurrency(quote.deposit)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Balance Due on Completion</span>
                  <span className="font-medium">{formatCurrency(quote.quote_price - quote.deposit)}</span>
                </div>
              </>
            )}

            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">
                  {isPaid ? 'Amount Paid' : 'Amount Due Now'}
                </span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(amountDue)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payout Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Payout Breakdown
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Colt (75%)</span>
              <span className="font-medium">{formatCurrency(quote.quote_price * 0.75)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">FB Margin (25%)</span>
              <span className="font-medium">{formatCurrency(quote.quote_price * 0.25)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">Quote Total</span>
                <span className="font-bold text-gray-900">{formatCurrency(quote.quote_price)}</span>
              </div>
            </div>
            {calculatedMisc !== 0 && (
              <div className="flex justify-between items-center pt-2 text-sm">
                <span className="text-gray-500">Misc (above min price)</span>
                <span className={`${calculatedMisc >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {calculatedMisc >= 0 ? '+' : ''}{formatCurrency(calculatedMisc)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Payment Status
          </h3>

          {isPaid ? (
            <div className="space-y-4">
              {/* Paid Status */}
              <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-green-800">Payment Received</p>
                  <p className="text-sm text-green-600 mt-1">
                    {formatCurrency(amountDue)} paid on {formatDate(quote.updated_at)}
                  </p>
                </div>
              </div>

              {/* Receipt Info */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Receipt Sent</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {quote.email
                      ? `A receipt was emailed to ${quote.email}`
                      : 'Receipt sent to customer email on file'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Status */}
              <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-amber-800">Awaiting Payment</p>
                  <p className="text-sm text-amber-600 mt-1">
                    {quote.status === 'awaiting_payment'
                      ? 'Contract signed. Waiting for customer payment.'
                      : quote.status === 'awaiting_signature'
                      ? 'Quote sent. Waiting for signature and payment.'
                      : 'Quote is in draft. Send to customer to collect payment.'}
                  </p>
                </div>
              </div>

              {/* Payment Link */}
              <div className="text-center pt-2">
                <p className="text-sm text-gray-500 mb-3">
                  Customer can pay at their portal:
                </p>
                <code className="text-xs bg-gray-100 px-3 py-2 rounded-lg text-gray-700 block overflow-x-auto">
                  {typeof window !== 'undefined' ? `${window.location.origin}/customer/${quoteId}` : `/customer/${quoteId}`}
                </code>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
