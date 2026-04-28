'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import type { Customer } from '@/types/customer';
import type { RepairQuote } from '@/types/quote';
import { formatPhoneDisplay } from '@/lib/phoneUtils';
import { formatCurrency } from '@/lib/calculations';
import { ConfirmDestructiveModal } from '@/components/ConfirmDestructiveModal';

type PendingDelete =
  | { kind: 'customer'; id: string; label: string }
  | { kind: 'quote'; id: string; label: string }
  | null;

type DeletedCustomer = Customer & { deleted_at: string };
type DeletedQuote = RepairQuote & { deleted_at: string };

export default function TrashPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [customers, setCustomers] = useState<DeletedCustomer[]>([]);
  const [quotes, setQuotes] = useState<DeletedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: cRows, error: cErr }, { data: qRows, error: qErr }] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false }),
        supabase
          .from('repair_quotes')
          .select('*')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false }),
      ]);
      if (cErr) throw cErr;
      if (qErr) throw qErr;
      setCustomers((cRows ?? []) as DeletedCustomer[]);
      setQuotes((qRows ?? []) as DeletedQuote[]);
    } catch (err) {
      console.error(err);
      setError('Failed to load trash');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const restoreCustomer = async (id: string) => {
    await supabase.from('customers').update({ deleted_at: null }).eq('id', id);
    fetchAll();
  };

  const restoreQuote = async (id: string) => {
    await supabase.from('repair_quotes').update({ deleted_at: null }).eq('id', id);
    fetchAll();
  };

  const confirmPermanentDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'customer') {
      await supabase.from('customers').delete().eq('id', pendingDelete.id);
    } else {
      await supabase.from('repair_quotes').delete().eq('id', pendingDelete.id);
    }
    setPendingDelete(null);
    fetchAll();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Recently Deleted</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : (
          <>
            <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Deleted Customers</h2>
                <span className="text-sm text-gray-500">{customers.length}</span>
              </div>
              {customers.length === 0 ? (
                <p className="p-6 text-sm text-gray-500">No deleted customers.</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3 hidden md:table-cell">Phone</th>
                      <th className="px-4 py-3 hidden lg:table-cell">Address</th>
                      <th className="px-4 py-3">Deleted</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-medium text-gray-900">{c.name || 'Untitled'}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-700">{formatPhoneDisplay(c.phone)}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-700">
                          {c.address || '—'}
                          {c.city_state ? `, ${c.city_state}` : ''}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(c.deleted_at)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => restoreCustomer(c.id)}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDelete({
                                kind: 'customer',
                                id: c.id,
                                label: c.name || 'this customer',
                              })
                            }
                            className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
                          >
                            Permanently delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Deleted Quotes</h2>
                <span className="text-sm text-gray-500">{quotes.length}</span>
              </div>
              {quotes.length === 0 ? (
                <p className="p-6 text-sm text-gray-500">No deleted quotes.</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3 hidden md:table-cell">Address</th>
                      <th className="px-4 py-3 hidden md:table-cell">Status</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Deleted</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => (
                      <tr key={q.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-medium text-gray-900">{q.client_name || 'Untitled'}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-700">{q.address || '—'}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-700 capitalize">
                          {q.status.replaceAll('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {q.quote_price > 0 ? formatCurrency(q.quote_price) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(q.deleted_at)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => restoreQuote(q.id)}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDelete({
                                kind: 'quote',
                                id: q.id,
                                label: q.client_name || 'this quote',
                              })
                            }
                            className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
                          >
                            Permanently delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>

      <ConfirmDestructiveModal
        isOpen={pendingDelete !== null}
        title={
          pendingDelete?.kind === 'customer'
            ? 'Permanently delete customer'
            : 'Permanently delete quote'
        }
        description={
          pendingDelete?.kind === 'customer'
            ? `You are about to permanently delete ${pendingDelete.label}. Any still-linked quotes lose their customer reference (they stay in the dashboard but become orphaned). This cannot be undone.`
            : pendingDelete?.kind === 'quote'
            ? `You are about to permanently delete the quote for ${pendingDelete.label}, along with every photo attached to it. This cannot be undone.`
            : ''
        }
        onConfirm={confirmPermanentDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
