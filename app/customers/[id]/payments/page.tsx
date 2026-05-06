'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { formatCurrency } from '@/lib/calculations';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

interface QuoteRow {
  id: string;
  title: string | null;
  repair_description: string | null;
  status: string;
  quote_price: number;
  deposit: number;
  requires_deposit: boolean;
  updated_at: string;
}

interface CustomerRow {
  id: string;
  name: string;
}

const PAID_STATUSES = new Set(['paid', 'requesting_permit', 'scheduling_repair', 'repair_scheduled', 'repair_complete']);

export default function CustomerPaymentLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: c }, { data: qs }] = await Promise.all([
        supabase.from('customers').select('id, name').eq('id', customerId).single(),
        supabase
          .from('repair_quotes')
          .select('id, title, repair_description, status, quote_price, deposit, requires_deposit, updated_at')
          .eq('customer_id', customerId)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false }),
      ]);
      setCustomer(c as CustomerRow | null);
      setQuotes((qs ?? []) as QuoteRow[]);
      setLoading(false);
    }
    load();
  }, [customerId, supabase]);

  const totals = useMemo(() => {
    let invoiced = 0;
    let paid = 0;
    for (const q of quotes) {
      invoiced += q.quote_price || 0;
      if (PAID_STATUSES.has(q.status)) {
        paid += q.requires_deposit && q.status === 'paid' ? q.deposit || 0 : q.quote_price || 0;
      }
    }
    return { invoiced, paid, outstanding: invoiced - paid };
  }, [quotes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-700">Customer not found</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
            Back
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Payment Ledger</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Invoiced</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(totals.invoiced)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Paid</p>
              <p className="text-lg font-semibold text-green-700">{formatCurrency(totals.paid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Outstanding</p>
              <p className="text-lg font-semibold text-amber-700">{formatCurrency(totals.outstanding)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Amounts inferred from each quote option's status. Status → Paid is calculated: Paid = deposit (if required), Repair Scheduled/Complete = full.
          </p>
        </div>

        {quotes.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
            No quote options yet.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {quotes.map((q) => {
                const isPaid = PAID_STATUSES.has(q.status);
                const paidAmount = isPaid
                  ? q.requires_deposit && q.status === 'paid'
                    ? q.deposit || 0
                    : q.quote_price || 0
                  : 0;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/quote/${q.id}/payments`)}
                      className="w-full px-6 py-4 text-left hover:bg-gray-50 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {q.title || q.repair_description || 'Untitled quote'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <StatusBadge status={q.status} />
                          <span className="text-xs text-gray-500">Updated {formatDate(q.updated_at)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {q.quote_price > 0 ? formatCurrency(q.quote_price) : '—'}
                        </p>
                        <p className={`text-xs ${isPaid ? 'text-green-700' : 'text-gray-500'}`}>
                          {isPaid ? `Paid ${formatCurrency(paidAmount)}` : 'Unpaid'}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
