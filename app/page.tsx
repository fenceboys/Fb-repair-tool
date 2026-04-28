'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomers } from '@/hooks/useCustomers';
import { useUserRole } from '@/hooks/useUserRole';
import { NewCustomerModal } from '@/components/NewCustomerModal';
import { TextCustomerModal } from '@/components/TextCustomerModal';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { formatPhoneDisplay } from '@/lib/phoneUtils';
import { formatCurrency } from '@/lib/calculations';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import type { RepairQuote } from '@/types/quote';

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { isAdmin } = useUserRole();
  const { customers, loading, searchQuery, setSearchQuery, softDeleteCustomer, refresh } = useCustomers();
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [textTarget, setTextTarget] = useState<{
    id: string;
    name: string | null;
    phone: string | null;
  } | null>(null);

  const updateQuoteStatus = async (quoteId: string, newStatus: RepairQuote['status']) => {
    await supabase
      .from('repair_quotes')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', quoteId);
    refresh();
  };

  // Status → left-stripe border class. Matches the StatusBadge palette so the
  // expanded project list reads as a visual pipeline at a glance.
  const STATUS_BORDER: Record<string, string> = {
    scheduling_quote: 'border-orange-400',
    quote_scheduled: 'border-gray-400',
    draft: 'border-amber-400',
    awaiting_signature: 'border-blue-400',
    awaiting_payment: 'border-green-400',
    paid: 'border-purple-400',
    repair_scheduled: 'border-teal-400',
    requesting_permit: 'border-yellow-400',
    scheduling_repair: 'border-indigo-400',
    repair_complete: 'border-pink-400',
    rejected_quote: 'border-red-400',
    lost_contact: 'border-gray-300',
  };

  const [tab, setTab] = useState<'all' | 'appointments' | 'draft'>('all');

  const hasDraft = (c: typeof customers[number]) =>
    (c.quotes ?? []).some((q) => q.status === 'draft');

  const hasAppointment = (c: typeof customers[number]) =>
    (c.quotes ?? []).some((q) => q.status === 'quote_scheduled');

  const draftCount = useMemo(() => customers.filter(hasDraft).length, [customers]);
  const appointmentCount = useMemo(
    () => customers.filter(hasAppointment).length,
    [customers]
  );

  // For the appointments tab we sort customers by their nearest quote
  // appointment relative to now: today first, then upcoming ascending, then
  // past descending. Each customer's "sort key" is the smallest absolute
  // milliseconds-from-now across their quote appointments, with today pinned
  // to bucket 0 and future/past bucketed separately.
  const visibleCustomers = useMemo(() => {
    if (tab === 'all') return customers;
    if (tab === 'draft') return customers.filter(hasDraft);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

    type Keyed = { c: typeof customers[number]; bucket: number; sortBy: number };
    const keyed: Keyed[] = customers.filter(hasAppointment).map((c) => {
      let bestBucket = 99;
      let bestSort = Number.POSITIVE_INFINITY;
      for (const q of c.quotes ?? []) {
        if (q.status !== 'quote_scheduled' || !q.quote_appointment_date) continue;
        const t = new Date(q.quote_appointment_date).getTime();
        let bucket: number;
        let sortBy: number;
        if (t >= startOfToday && t < endOfToday) {
          bucket = 0;
          sortBy = t;
        } else if (t >= endOfToday) {
          bucket = 1;
          sortBy = t;
        } else {
          bucket = 2;
          sortBy = -t;
        }
        if (bucket < bestBucket || (bucket === bestBucket && sortBy < bestSort)) {
          bestBucket = bucket;
          bestSort = sortBy;
        }
      }
      return { c, bucket: bestBucket, sortBy: bestSort };
    });

    keyed.sort((a, b) => a.bucket - b.bucket || a.sortBy - b.sortBy);
    return keyed.map((k) => k.c);
  }, [customers, tab]);

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Move this customer to trash? All linked quotes also disappear from the dashboard until you restore.')) return;
    await softDeleteCustomer(id);
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <img src="/fence-boys-logo.jpg" alt="Fence Boys" className="h-10 w-auto rounded" />
              <h1 className="text-xl font-bold text-gray-900">Repair App</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                + Customer
              </button>
              {isAdmin && (
                <Link
                  href="/dashboard"
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Admin Dashboard"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/trash"
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Recently Deleted"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Link>
              )}
              <form action="/auth/logout" method="POST">
                <button
                  type="submit"
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Sign out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          <div className="flex gap-2 mb-3 overflow-x-auto">
            <TabButton active={tab === 'all'} onClick={() => setTab('all')}>All</TabButton>
            <TabButton
              active={tab === 'appointments'}
              onClick={() => setTab('appointments')}
              count={appointmentCount}
            >
              Quote Appts
            </TabButton>
            <TabButton active={tab === 'draft'} onClick={() => setTab('draft')} count={draftCount}>
              Building Proposal
            </TabButton>
          </div>

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, address, email…"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading customers…</div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
            <p className="text-gray-500 mb-4">No customers yet. Add Cielo's first lead to get started.</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              + New Customer
            </button>
          </div>
        ) : visibleCustomers.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
            <p className="text-gray-500">
              {tab === 'draft'
                ? 'No proposals currently being built. Flip to All Customers to see everyone.'
                : tab === 'appointments'
                ? 'No quote appointments scheduled. Cielo adds these from Slack/intake.'
                : 'No customers match your search.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleCustomers.map((c) => {
              const isOpen = !!expanded[c.id];
              const quotes = c.quotes ?? [];
              return (
                <div key={c.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(c.id)}
                      disabled={quotes.length === 0}
                      className="flex items-center justify-center px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:text-gray-200 disabled:cursor-default border-r border-gray-100"
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(`/customers/${c.id}`)}
                      className="flex-1 text-left p-4 hover:bg-gray-50 min-w-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{c.name || 'Untitled'}</p>
                          <p className="text-sm text-gray-500 truncate">
                            {c.address || '—'}
                            {c.city_state ? `, ${c.city_state}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatPhoneDisplay(c.phone) || 'No phone'}
                            {c.email ? ` · ${c.email}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-gray-700">
                            {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(c.last_activity || c.updated_at)}</p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTextTarget({ id: c.id, name: c.name, phone: c.phone });
                      }}
                      disabled={!c.phone}
                      className="flex items-center justify-center px-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 border-l border-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                      aria-label="Text customer"
                      title={c.phone ? 'Send text' : 'No phone on file'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                  </div>

                  {isOpen && quotes.length > 0 && (
                    <ul className="border-t border-gray-200 bg-gray-100 space-y-px">
                      {quotes.map((q) => (
                        <li
                          key={q.id}
                          className={`flex items-stretch bg-white hover:bg-gray-50 transition-colors border-l-4 ${
                            STATUS_BORDER[q.status] ?? 'border-gray-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => router.push(`/quote/${q.id}`)}
                            className="flex-1 min-w-0 text-left pl-8 pr-3 py-3 flex items-center gap-3"
                          >
                            <p className="text-sm font-semibold text-gray-900 truncate flex-1 min-w-0">
                              {q.title || q.repair_description || 'Untitled quote'}
                            </p>
                          </button>
                          <div
                            className="flex items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <StatusBadge
                              status={q.status}
                              onChange={(newStatus) => updateQuoteStatus(q.id, newStatus)}
                              onQuoteScheduled={() => {
                                updateQuoteStatus(q.id, 'quote_scheduled');
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => router.push(`/quote/${q.id}`)}
                            className="px-4 py-3 text-right shrink-0"
                          >
                            <p className="text-sm font-semibold text-gray-900">
                              {q.quote_price > 0 ? formatCurrency(q.quote_price) : '—'}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(q.created_at)}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <NewCustomerModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {textTarget && (
        <TextCustomerModal
          isOpen={!!textTarget}
          onClose={() => setTextTarget(null)}
          customerId={textTarget.id}
          customerName={textTarget.name}
          customerPhone={textTarget.phone}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
      {typeof count === 'number' && (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
