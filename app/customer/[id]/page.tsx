'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/calculations';
import { CustomerViewActions } from '@/components/CustomerViewActions';
import { PaymentModal } from '@/components/PaymentModal';

interface QuoteData {
  id: string;
  client_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city_state: string | null;
  repair_description: string | null;
  quote_price: number;
  deposit: number;
  requires_deposit: boolean;
  client_signature: string | null;
  base_cost: number;
  status: 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';
  scheduled_date: string | null;
}

export default function CustomerViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const quoteId = params.id as string;
  const isInternal = searchParams.get('internal') === 'true';

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const fetchQuote = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('repair_quotes')
        .select('id, client_name, phone, email, address, city_state, repair_description, quote_price, deposit, requires_deposit, client_signature, base_cost, status, scheduled_date')
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
  };

  useEffect(() => {
    if (quoteId) {
      fetchQuote();
    }
  }, [quoteId]);

  const handleSignComplete = () => {
    // Refresh quote data to get updated signature status
    fetchQuote();
  };

  const handlePaymentComplete = async () => {
    // Update status to 'paid' in database
    await supabase
      .from('repair_quotes')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', quoteId);

    setShowPayment(false);
    setPaymentComplete(true);
    fetchQuote(); // Refresh to get updated status
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
          <p className="text-red-700">{error || 'Quote not found'}</p>
        </div>
      </div>
    );
  }

  const amountDue = quote.requires_deposit ? quote.deposit : quote.quote_price;
  const isPaidOrScheduled = quote.status === 'paid' || quote.status === 'repair_scheduled' || paymentComplete;
  const needsSignature = quote.status === 'awaiting_signature' && !quote.client_signature;
  const needsPayment = quote.status === 'awaiting_payment' || (quote.status === 'awaiting_signature' && quote.client_signature);

  const formatScheduledDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr} at ${timeStr}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <img
              src="/fence-boys-logo.jpg"
              alt="Fence Boys"
              className="h-12 w-auto rounded"
            />
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">Fence Boys</h1>
              <p className="text-sm text-gray-500">Repair Quote</p>
            </div>
          </div>
        </div>
      </header>

      <main className={`max-w-lg mx-auto px-4 py-6 ${isInternal ? '' : 'pb-32'}`}>
        {/* Quote Summary */}
        <section className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Quote Summary
          </h2>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{quote.client_name || '—'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Property Address</p>
              <p className="font-medium">
                {quote.address || '—'}
                {quote.city_state && `, ${quote.city_state}`}
              </p>
            </div>

            {quote.repair_description && (
              <div>
                <p className="text-sm text-gray-500">Repair Description</p>
                <p className="font-medium">{quote.repair_description}</p>
              </div>
            )}

            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Price:</span>
                <span className="text-xl font-bold">
                  {formatCurrency(quote.quote_price)}
                </span>
              </div>
              {quote.requires_deposit && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">Deposit Due (50%):</span>
                  <span className="text-lg font-semibold text-blue-600">
                    {formatCurrency(quote.deposit)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Status-based UI */}

        {/* Awaiting Signature - prompt to sign */}
        {needsSignature && !isInternal && (
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <svg className="h-8 w-8 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <div>
                <p className="font-semibold text-blue-800">Signature Required</p>
                <p className="text-sm text-blue-600">Please review and sign to proceed.</p>
              </div>
            </div>
          </section>
        )}

        {/* Awaiting Payment - signed, needs payment */}
        {needsPayment && !isPaidOrScheduled && (
          <section className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <svg className="h-8 w-8 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-green-800">Contract Signed</p>
                <p className="text-sm text-green-600">Ready to pay your {quote.requires_deposit ? 'deposit' : 'balance'}.</p>
              </div>
            </div>

            <button
              onClick={() => setShowPayment(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Pay {formatCurrency(amountDue)} Now
            </button>
          </section>
        )}

        {/* Paid - waiting for scheduling */}
        {quote.status === 'paid' && (
          <section className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <svg className="h-8 w-8 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-green-800">Payment Received</p>
                <p className="text-sm text-green-600">Thank you! We'll be in touch to schedule your repair.</p>
              </div>
            </div>
          </section>
        )}

        {/* Repair Scheduled - show appointment date */}
        {quote.status === 'repair_scheduled' && quote.scheduled_date && (
          <section className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <svg className="h-8 w-8 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="font-semibold text-green-800">Repair Scheduled</p>
                <p className="text-sm text-green-600">{formatScheduledDate(quote.scheduled_date)}</p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Action Buttons */}
      <CustomerViewActions
        quote={quote}
        onSignComplete={handleSignComplete}
        isInternal={isInternal}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        amount={amountDue}
        quoteId={quote.id}
        customerName={quote.client_name}
        customerEmail={quote.email}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
}
