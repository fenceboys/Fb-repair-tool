'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuotesList } from '@/hooks/useQuotesList';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useStatusConfig } from '@/hooks/useStatusConfig';
import { StatCard } from './StatCard';
import { QuotesTable } from './QuotesTable';

type StatusFilter = 'all' | 'scheduling_quote' | 'quote_scheduled' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';

export function DashboardView() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { config } = useAdminConfig();
  const { statuses } = useStatusConfig();
  const {
    quotes,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    createQuote,
    deleteQuote,
    updateStatus,
    scheduleQuote,
  } = useQuotesList();

  // Get status labels from config
  const getStatusLabel = (key: string): string => {
    const status = statuses.find((s) => s.status_key === key);
    return status?.label || key;
  };

  // Get status color from config
  const getStatusColor = (key: string): string => {
    const status = statuses.find((s) => s.status_key === key);
    return status?.color || 'gray';
  };

  const stats = useMemo(
    () => ({
      all: quotes.length,
      scheduling_quote: quotes.filter((q) => q.status === 'scheduling_quote').length,
      quote_scheduled: quotes.filter((q) => q.status === 'quote_scheduled').length,
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
                src={config?.portal_logo_url || '/fence-boys-logo.jpg'}
                alt={config?.portal_brand_name || 'Fence Boys'}
                className="h-10 w-auto rounded"
              />
              <h1 className="text-xl font-bold text-gray-900">{config?.dashboard_title || 'Repair Quotes Dashboard'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Customers"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 10-8 0 4 4 0 008 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Customers
              </Link>
              <Link
                href="/trash"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Recently Deleted"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Trash
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Admin Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin
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
        <div className="grid grid-cols-7 gap-4 mb-6">
          <StatCard
            label="All Quotes"
            count={stats.all}
            color="gray"
            isActive={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          <StatCard
            label={getStatusLabel('scheduling_quote')}
            count={stats.scheduling_quote}
            color={getStatusColor('scheduling_quote')}
            isActive={statusFilter === 'scheduling_quote'}
            onClick={() => setStatusFilter('scheduling_quote')}
          />
          <StatCard
            label={getStatusLabel('quote_scheduled')}
            count={stats.quote_scheduled}
            color={getStatusColor('quote_scheduled')}
            isActive={statusFilter === 'quote_scheduled'}
            onClick={() => setStatusFilter('quote_scheduled')}
          />
          <StatCard
            label={getStatusLabel('awaiting_signature')}
            count={stats.awaiting_signature}
            color={getStatusColor('awaiting_signature')}
            isActive={statusFilter === 'awaiting_signature'}
            onClick={() => setStatusFilter('awaiting_signature')}
          />
          <StatCard
            label={getStatusLabel('awaiting_payment')}
            count={stats.awaiting_payment}
            color={getStatusColor('awaiting_payment')}
            isActive={statusFilter === 'awaiting_payment'}
            onClick={() => setStatusFilter('awaiting_payment')}
          />
          <StatCard
            label={getStatusLabel('paid')}
            count={stats.paid}
            color={getStatusColor('paid')}
            isActive={statusFilter === 'paid'}
            onClick={() => setStatusFilter('paid')}
          />
          <StatCard
            label={getStatusLabel('repair_scheduled')}
            count={stats.repair_scheduled}
            color={getStatusColor('repair_scheduled')}
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
          <QuotesTable quotes={filteredQuotes} onDelete={deleteQuote} onStatusChange={updateStatus} onQuoteScheduled={scheduleQuote} />
        )}
      </main>
    </div>
  );
}
