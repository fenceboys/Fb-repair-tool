'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/calculations';
import { notifyPaymentReceived } from '@/lib/slackNotifications';
import { CustomerViewActions } from '@/components/CustomerViewActions';
import { PaymentModal } from '@/components/PaymentModal';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { usePortalCopy } from '@/hooks/usePortalCopy';
import { getAlertColorClasses } from '@/types/admin';

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
  status: 'scheduling_quote' | 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';
  scheduled_date: string | null;
  portal_closed: boolean;
}

export default function CustomerViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const quoteId = params.id as string;
  const isInternal = searchParams.get('internal') === 'true';

  const { config } = useAdminConfig();
  const { getCopyByStatus } = usePortalCopy();

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const fetchQuote = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('repair_quotes')
        .select('id, client_name, phone, email, address, city_state, repair_description, quote_price, deposit, requires_deposit, client_signature, base_cost, status, scheduled_date, portal_closed')
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

    // Fetch fresh quote data and send Slack notification
    const { data: freshQuote } = await supabase
      .from('repair_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (freshQuote) {
      notifyPaymentReceived(freshQuote);
    }

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

  // Block access if portal is closed (unless internal view)
  if (quote.portal_closed && !isInternal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Quote Unavailable</h1>
          <p className="text-gray-600">{config?.portal_closed_message || 'This quote is no longer available. Please contact Fence Boys if you have questions.'}</p>
        </div>
      </div>
    );
  }

  const amountDue = quote.requires_deposit ? quote.deposit : quote.quote_price;
  const isPaidOrScheduled = quote.status === 'paid' || quote.status === 'repair_scheduled' || paymentComplete;
  // Status is the source of truth - ignore old signatures if status says awaiting_signature
  const needsSignature = quote.status === 'awaiting_signature';
  const needsPayment = quote.status === 'awaiting_payment';

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
              src={config?.portal_logo_url || '/fence-boys-logo.jpg'}
              alt={config?.portal_brand_name || 'Fence Boys'}
              className="h-12 w-auto rounded"
            />
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">{config?.portal_brand_name || 'Fence Boys'}</h1>
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

        {/* Status-based UI - Now using portal copy from admin config */}

        {/* Awaiting Signature - prompt to sign */}
        {needsSignature && !isInternal && (() => {
          const copy = getCopyByStatus('awaiting_signature');
          return (
            <section className="bg-white border border-gray-200 rounded-lg p-6 mb-4 text-center">
              {/* Pen Icon */}
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 mb-1">{copy?.title || 'Signature Required'}</h3>
              <p className="text-gray-500 mb-6">{copy?.description || 'Please review your quote and sign below to proceed'}</p>

              {/* Info Box */}
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 mb-4">
                <p className="text-sm text-blue-800">
                  {copy?.custom_message || 'By signing, you agree to the repair work and pricing outlined in your quote.'}
                </p>
              </div>
            </section>
          );
        })()}

        {/* Awaiting Payment - signed, needs payment */}
        {needsPayment && !isPaidOrScheduled && (() => {
          const copy = getCopyByStatus('awaiting_payment');
          return (
            <section className="bg-white border border-gray-200 rounded-lg p-6 mb-4 text-center">
              {/* Checkmark Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 mb-1">{copy?.title || 'Contract Signed!'}</h3>
              <p className="text-gray-500 mb-6">{copy?.description || 'Thank you! Complete your payment to get scheduled.'}</p>

              {/* Payment Amount Box */}
              <div className="bg-gray-50 rounded-xl py-5 px-6 mb-4">
                <p className="text-sm text-gray-500 mb-1">{quote.requires_deposit ? 'Deposit Due' : 'Amount Due'}</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(amountDue)}</p>
              </div>

              {copy?.custom_message && (
                <p className="text-sm text-gray-600 mb-4">{copy.custom_message}</p>
              )}

              <button
                onClick={() => setShowPayment(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Pay Now
              </button>
            </section>
          );
        })()}

        {/* Paid - waiting for scheduling */}
        {quote.status === 'paid' && (() => {
          const copy = getCopyByStatus('paid');
          return (
            <section className="bg-white border border-gray-200 rounded-lg p-6 mb-4 text-center">
              {/* Checkmark Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 mb-1">{copy?.title || 'Payment Received!'}</h3>
              <p className="text-gray-500 mb-6">{copy?.description || "Thank you! We'll contact you soon to schedule your repair."}</p>

              {/* Info Box */}
              <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                <p className="text-sm text-green-800">
                  {copy?.custom_message || 'Our team will reach out within 1-2 business days to schedule your repair appointment.'}
                </p>
              </div>
            </section>
          );
        })()}

        {/* Repair Scheduled - show appointment date prominently */}
        {quote.status === 'repair_scheduled' && quote.scheduled_date && (() => {
          const copy = getCopyByStatus('repair_scheduled');
          const scheduledDate = new Date(quote.scheduled_date);
          return (
            <section className="bg-white border border-gray-200 rounded-lg p-6 mb-4 text-center">
              {/* Calendar Icon */}
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 mb-1">{copy?.title || 'Repair Scheduled!'}</h3>
              <p className="text-gray-500 mb-6">{copy?.description || 'Mark your calendar - we\'re coming to fix your fence'}</p>

              {/* Large Date Display */}
              <div className="bg-gray-50 rounded-xl py-6 px-8 mb-4">
                <p className="text-2xl font-bold text-gray-900">
                  {scheduledDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-xl text-blue-600 font-semibold mt-1">
                  {scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>

              {copy?.custom_message && (
                <p className="text-sm text-gray-600">{copy.custom_message}</p>
              )}
            </section>
          );
        })()}
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
