'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuotesList } from '@/hooks/useQuotesList';
import { StatCard } from './StatCard';
import { QuotesTable } from './QuotesTable';

type StatusFilter = 'all' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';

export function DashboardView() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const {
    quotes,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    createQuote,
    deleteQuote,
    updateStatus,
  } = useQuotesList();

  const stats = useMemo(
    () => ({
      all: quotes.length,
      awaiting_signature: quotes.filter((q) => q.status === 'awaiting_signature').length,
      awaiting_payment: quotes.filter((q) => q.status === 'awaiting_payment').length,
      paid: quotes.filter((q) => q.status === 'paid').length,
      repair_scheduled: quotes.filter((q) => q.status === 'repair_scheduled').length,
    }),
    [quotes]
  );

  const filteredQuotes = useMemo(() => {
    if (statusFilter === 'all') return quotes;
    return quotes.filter((q) => q.status === statusFilter);
  }, [quotes, statusFilter]);

  const handleNewQuote = async () => {
    const newId = await createQuote();
    if (newId) {
      router.push(`/quote/${newId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/fence-boys-logo.jpg"
                alt="Fence Boys"
                className="h-10 w-auto rounded"
              />
              <h1 className="text-xl font-bold text-gray-900">Repair Quotes Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Mobile View
              </Link>
              <form action="/auth/logout" method="POST">
                <button
                  type="submit"
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard
            label="All Quotes"
            count={stats.all}
            color="gray"
            isActive={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          <StatCard
            label="Awaiting Signature"
            count={stats.awaiting_signature}
            color="blue"
            isActive={statusFilter === 'awaiting_signature'}
            onClick={() => setStatusFilter('awaiting_signature')}
          />
          <StatCard
            label="Awaiting Payment"
            count={stats.awaiting_payment}
            color="green"
            isActive={statusFilter === 'awaiting_payment'}
            onClick={() => setStatusFilter('awaiting_payment')}
          />
          <StatCard
            label="Paid"
            count={stats.paid}
            color="purple"
            isActive={statusFilter === 'paid'}
            onClick={() => setStatusFilter('paid')}
          />
          <StatCard
            label="Repair Scheduled"
            count={stats.repair_scheduled}
            color="teal"
            isActive={statusFilter === 'repair_scheduled'}
            onClick={() => setStatusFilter('repair_scheduled')}
          />
        </div>

        {/* Search and New Quote */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, address, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white"
            />
          </div>
          <button
            onClick={handleNewQuote}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Quote
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : (
          <QuotesTable quotes={filteredQuotes} onDelete={deleteQuote} onStatusChange={updateStatus} />
        )}
      </main>
    </div>
  );
}
