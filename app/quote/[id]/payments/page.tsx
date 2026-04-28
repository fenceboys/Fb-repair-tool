'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/calculations';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

interface QuoteData {
  id: string;
  title: string | null;
  client_name: string | null;
  email: string | null;
  address: string | null;
  city_state: string | null;
  repair_description: string | null;
  quote_price: number;
  base_cost: number;
  material_cost: number | null;
  labor_cost: number | null;
  materials_notes: string | null;
  misc: number;
  deposit: number;
  requires_deposit: boolean;
  status: string;
  updated_at: string;
  customer_id: string | null;
  payment_client_secret: string | null;
}

const PAID_STATUSES = new Set([
  'paid',
  'requesting_permit',
  'scheduling_repair',
  'repair_scheduled',
  'repair_complete',
]);

export default function PaymentLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const { data, error: fetchError } = await supabase
          .from('repair_quotes')
          .select(
            'id, title, client_name, email, address, city_state, repair_description, quote_price, base_cost, material_cost, labor_cost, materials_notes, misc, deposit, requires_deposit, status, updated_at, customer_id, payment_client_secret'
          )
          .eq('id', quoteId)
          .single();
        if (fetchError) throw fetchError;
        setQuote(data as QuoteData);
      } catch (err) {
        console.error(err);
        setError('Quote not found');
      } finally {
        setLoading(false);
      }
    }
    if (quoteId) fetchQuote();
  }, [quoteId]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const handleCopyPortalLink = async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/customer/${quoteId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
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
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  const material = quote.material_cost ?? 0;
  const labor = quote.labor_cost ?? 0;
  const totalCost = material + labor || quote.base_cost || 0;
  const sellPrice = quote.quote_price || 0;
  const minPrice = totalCost > 0 ? Math.ceil((totalCost / 0.75) / 10) * 10 : 0;
  const calculatedMisc = sellPrice - minPrice;
  const coltPayout = sellPrice * 0.75;
  const fbMargin = sellPrice * 0.25;
  const hasStripeIntent = !!quote.payment_client_secret;
  const isPaid = PAID_STATUSES.has(quote.status);
  const amountDue = quote.requires_deposit && quote.status === 'awaiting_payment' ? quote.deposit : sellPrice;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm">Back</span>
          </button>
          <StatusBadge status={quote.status} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {quote.title || quote.repair_description || 'Untitled quote'}
          </h1>
          <div className="mt-1 flex items-center gap-2 flex-wrap text-sm">
            {quote.customer_id && quote.client_name && (
              <Link
                href={`/customers/${quote.customer_id}`}
                className="text-blue-600 hover:text-blue-700"
              >
                {quote.client_name}
              </Link>
            )}
            {quote.address && (
              <span className="text-gray-500">· {quote.address}{quote.city_state ? `, ${quote.city_state}` : ''}</span>
            )}
          </div>

          {isPaid ? (
            <div className="mt-4 flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-semibold text-green-900">Payment received</p>
                <p className="text-sm text-green-700 mt-0.5">
                  {formatCurrency(amountDue)} · {formatDate(quote.updated_at)}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-amber-900">
                  {quote.status === 'awaiting_payment' ? 'Awaiting payment' : 'Not yet due'}
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {hasStripeIntent
                    ? 'Stripe PaymentIntent is primed on the customer portal; customer has not yet completed checkout.'
                    : quote.status === 'awaiting_signature'
                    ? 'Proposal sent — customer must sign before paying.'
                    : 'Send proposal to collect payment.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Cost Breakdown</h2>
          <div className="space-y-2 text-sm">
            <Row label="Material" value={formatCurrency(material)} />
            <Row label="Labor" value={formatCurrency(labor)} />
            <div className="border-t border-gray-100 pt-2">
              <Row label="Total Cost" value={formatCurrency(totalCost)} strong />
            </div>
            {quote.materials_notes?.trim() && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Materials breakdown</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{quote.materials_notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Pricing</h2>
          <div className="space-y-2 text-sm">
            <Row label="Min (w/ 25%)" value={formatCurrency(minPrice)} />
            <Row label="Sell Price" value={formatCurrency(sellPrice)} strong />
            {calculatedMisc !== 0 && (
              <Row
                label="Miscellaneous"
                value={`${calculatedMisc >= 0 ? '+' : ''}${formatCurrency(calculatedMisc)}`}
                valueClassName={calculatedMisc >= 0 ? 'text-green-600' : 'text-red-600'}
              />
            )}
            {quote.requires_deposit && (
              <div className="border-t border-gray-100 pt-2 space-y-2">
                <Row label="Deposit (50%)" value={formatCurrency(quote.deposit)} />
                <Row label="Balance at completion" value={formatCurrency(sellPrice - quote.deposit)} />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Payout Breakdown</h2>
          <div className="space-y-2 text-sm">
            <Row label="Colt (75%)" value={formatCurrency(coltPayout)} valueClassName="text-blue-700" />
            <Row label="FB Margin (25%)" value={formatCurrency(fbMargin)} valueClassName="text-red-700" />
            <div className="border-t border-gray-100 pt-2">
              <Row label="Quote Total" value={formatCurrency(sellPrice)} strong />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Customer Portal</h2>
          <div className="flex items-center justify-between gap-3">
            <a
              href={`/customer/${quoteId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 truncate"
            >
              View portal page
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              type="button"
              onClick={handleCopyPortalLink}
              className="shrink-0 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium inline-flex items-center gap-1.5"
              title="Copy portal URL"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy link
                </>
              )}
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  valueClassName,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={strong ? 'font-semibold text-gray-900' : 'text-gray-600'}>{label}</span>
      <span className={`${strong ? 'font-bold text-gray-900' : 'font-medium text-gray-900'} ${valueClassName ?? ''}`}>
        {value}
      </span>
    </div>
  );
}
