'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCustomer } from '@/hooks/useCustomer';
import { CustomerEditModal } from '@/components/CustomerEditModal';
import { DeletedCustomerBanner } from '@/components/DeletedCustomerBanner';
import { TextCustomerModal } from '@/components/TextCustomerModal';
import { PhotoGallery } from '@/components/PhotoGallery';
import { AddPhotoTile } from '@/components/AddPhotoTile';
import { useCustomerPhotos } from '@/hooks/useCustomerPhotos';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { formatPhoneDisplay } from '@/lib/phoneUtils';
import { formatCurrency } from '@/lib/calculations';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

interface MessageRow {
  id: string;
  created_at: string;
  direction: 'outbound' | 'inbound';
  content: string;
  status: string | null;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const {
    customer,
    quotes,
    loading,
    error,
    updateCustomer,
    createQuoteForCustomer,
    duplicateQuote,
    softDeleteQuote,
    softDeleteCustomer,
  } = useCustomer(customerId);

  const [editOpen, setEditOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [messagesExpanded, setMessagesExpanded] = useState(false);
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { photos, uploadPhoto, deletePhoto } = useCustomerPhotos(customerId);

  const fetchMessages = useCallback(async () => {
    if (!customerId) return;
    const { data } = await supabase
      .from('customer_messages')
      .select('id, created_at, direction, content, status')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setMessages((data ?? []) as MessageRow[]);
  }, [customerId, supabase]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (customer?.quote_appointment_date) {
      const dt = new Date(customer.quote_appointment_date);
      setScheduleDate(dt.toISOString().split('T')[0]);
      const hh = dt.getHours().toString().padStart(2, '0');
      const mm = dt.getMinutes().toString().padStart(2, '0');
      setScheduleTime(`${hh}:${mm}`);
    }
  }, [customer?.quote_appointment_date]);

  const handleSaveSchedule = async () => {
    if (!scheduleDate || !scheduleTime || !customer) return;
    setScheduleSaving(true);
    const timestamp = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    await supabase
      .from('customers')
      .update({ quote_appointment_date: timestamp, updated_at: new Date().toISOString() })
      .eq('id', customer.id);
    setScheduleSaving(false);
    setScheduleExpanded(false);
    router.refresh();
  };

  const handleClearSchedule = async () => {
    if (!customer) return;
    setScheduleSaving(true);
    await supabase
      .from('customers')
      .update({ quote_appointment_date: null, updated_at: new Date().toISOString() })
      .eq('id', customer.id);
    setScheduleSaving(false);
    router.refresh();
  };

  const formatScheduleDisplay = (iso: string) => {
    const dt = new Date(iso);
    const dateStr = dt.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateStr} at ${timeStr}`;
  };

  const handleBuild = async () => {
    setBusy(true);
    const newId = await createQuoteForCustomer();
    if (newId) router.push(`/quote/${newId}/edit`);
    else setBusy(false);
  };

  const handleDeleteQuote = async (id: string, label: string) => {
    if (!confirm(`Move "${label}" to trash? You can restore from Recently Deleted.`)) return;
    await softDeleteQuote(id);
  };

  const handleDuplicate = async (sourceId: string) => {
    setBusy(true);
    const newId = await duplicateQuote(sourceId);
    if (newId) router.push(`/quote/${newId}/edit`);
    else setBusy(false);
  };

  const handleDelete = async () => {
    if (!confirm('Move this customer to trash? Their quotes disappear from dashboards until you restore.')) return;
    const ok = await softDeleteCustomer();
    if (ok) router.push('/');
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-700">{error || 'Customer not found'}</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  const isDeleted = !!customer.deleted_at;
  const phoneDisplay = formatPhoneDisplay(customer.phone);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Customers
          </Link>
        </div>
      </header>

      {isDeleted && (
        <DeletedCustomerBanner
          customerId={customer.id}
          deletedAt={customer.deleted_at!}
          onRestored={() => router.refresh()}
        />
      )}

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Customer identity card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-900 truncate min-w-0 flex-1">{customer.name}</h1>
            <div className="flex flex-row gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setTextOpen(true)}
                disabled={isDeleted || !customer.phone}
                className="p-2 text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Text customer"
                title={customer.phone ? 'Send text via Quo' : 'No phone on file'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                disabled={isDeleted}
                className="p-2 text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Edit customer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleted}
                className="p-2 text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Delete customer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="min-w-0">
              <p className="text-gray-500">Phone</p>
              {phoneDisplay ? (
                <a href={`tel:${customer.phone}`} className="font-medium text-blue-600 hover:text-blue-700">
                  {phoneDisplay}
                </a>
              ) : (
                <p className="font-medium text-gray-400">—</p>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-gray-500">Email</p>
              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="font-medium text-blue-600 hover:text-blue-700 truncate block"
                >
                  {customer.email}
                </a>
              ) : (
                <p className="font-medium text-gray-400">—</p>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-gray-500">Address</p>
              <p className="font-medium text-gray-900 truncate">
                {customer.address || '—'}
                {customer.city_state ? `, ${customer.city_state}` : ''}
              </p>
            </div>
          </div>
          {customer.notes?.trim() && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Customer Notes</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Quote Options — priced variants Colt presents to the customer */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Quote Options</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {quotes.length === 0
                  ? 'No quote options yet.'
                  : `${quotes.length} ${quotes.length === 1 ? 'option' : 'options'} for this property.`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleBuild}
              disabled={busy || isDeleted}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              + Build New Quote
            </button>
          </div>

          {quotes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">
                Tap <span className="font-medium">Build New Quote</span> when you're on site to start the first project.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {quotes.map((q) => (
                <li key={q.id} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => router.push(`/quote/${q.id}`)}
                    className="flex-1 text-left px-6 py-4 hover:bg-gray-50 min-w-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {q.title || q.repair_description || 'Untitled quote'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <StatusBadge status={q.status} />
                          <span className="text-xs text-gray-500">{formatDate(q.created_at)}</span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 shrink-0">
                        {q.quote_price > 0 ? formatCurrency(q.quote_price) : '—'}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(q.id)}
                    disabled={busy || isDeleted}
                    className="px-4 border-l border-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Duplicate quote"
                    title="Duplicate quote"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteQuote(q.id, q.title || q.repair_description || 'this quote')
                    }
                    disabled={isDeleted}
                    className="px-4 border-l border-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Delete quote"
                    title="Move quote to trash"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Photos — property-scoped, apply to all quote options */}
        <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Photos</h2>
            <span className="text-xs text-gray-500">{photos.length} on file</span>
          </div>
          <PhotoGallery
            photos={photos}
            onDelete={isDeleted ? undefined : deletePhoto}
            leadingTile={!isDeleted && <AddPhotoTile onUpload={uploadPhoto} />}
          />
        </section>

        {/* Schedule — quote-visit appointment lives at the customer level */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setScheduleExpanded((v) => !v)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            aria-expanded={scheduleExpanded}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0 text-left">
                <p className="font-medium text-gray-900">Quote Visit</p>
                <p className="text-xs text-gray-500 truncate">
                  {customer.quote_appointment_date
                    ? formatScheduleDisplay(customer.quote_appointment_date)
                    : 'Not scheduled'}
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${scheduleExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {scheduleExpanded && (
            <div className="border-t border-gray-100 px-6 py-4 space-y-3">
              <div className="grid grid-cols-[2fr_1fr] gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {customer.quote_appointment_date && (
                  <button
                    type="button"
                    onClick={handleClearSchedule}
                    disabled={scheduleSaving}
                    className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  disabled={!scheduleDate || !scheduleTime || scheduleSaving}
                  className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {scheduleSaving
                    ? 'Saving…'
                    : customer.quote_appointment_date
                    ? 'Update visit'
                    : 'Schedule visit'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Messages — collapsible row, click to toggle the inline timeline */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setMessagesExpanded((v) => !v)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            aria-expanded={messagesExpanded}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="min-w-0 text-left">
                <p className="font-medium text-gray-900">Messages</p>
                <p className="text-xs text-gray-500 truncate">
                  {messages.length === 0
                    ? 'No messages yet'
                    : `${messages.length} ${messages.length === 1 ? 'message' : 'messages'} logged`}
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${messagesExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {messagesExpanded && (
            <div className="border-t border-gray-100">
              <div className="px-6 py-3 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setTextOpen(true)}
                  disabled={isDeleted || !customer.phone}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  New text
                </button>
              </div>
              {messages.length === 0 ? (
                <div className="px-6 py-6 text-center text-sm text-gray-500">
                  Tap <span className="font-medium">New text</span> to send the first one.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                  {messages.map((m) => (
                    <li key={m.id} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                          {m.direction === 'outbound' ? 'Sent' : 'Received'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(m.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{m.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>

      <CustomerEditModal
        isOpen={editOpen}
        customer={customer}
        onClose={() => setEditOpen(false)}
        onSave={updateCustomer}
      />

      <TextCustomerModal
        isOpen={textOpen}
        onClose={() => setTextOpen(false)}
        customerId={customer.id}
        customerName={customer.name}
        customerPhone={customer.phone}
        onSent={fetchMessages}
      />
    </div>
  );
}
