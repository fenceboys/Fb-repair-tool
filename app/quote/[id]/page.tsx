'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/calculations';
import { generatePDF } from '@/lib/pdf';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import type { RepairQuote } from '@/types/quote';

interface QuoteData {
  id: string;
  created_at: string;
  client_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city_state: string | null;
  zip: string | null;
  repair_description: string | null;
  quote_price: number;
  deposit: number;
  requires_deposit: boolean;
  status: 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';
  pdf_url: string | null;
  scheduled_date: string | null;
  quote_appointment_date: string | null;
  revision_count: number;
  revised_at: string | null;
}

type ScheduleType = 'quote' | 'repair';

function parseScheduledDateTime(timestamp: string | null): { date: string; time: string } {
  if (!timestamp) return { date: '', time: '09:00' };
  try {
    const dt = new Date(timestamp);
    const date = dt.toISOString().split('T')[0];
    const hours = dt.getHours().toString().padStart(2, '0');
    const minutes = dt.getMinutes().toString().padStart(2, '0');
    return { date, time: `${hours}:${minutes}` };
  } catch {
    return { date: '', time: '09:00' };
  }
}

export default function QuoteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [scheduling, setScheduling] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('quote');
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [revising, setRevising] = useState(false);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const { data, error: fetchError } = await supabase
          .from('repair_quotes')
          .select('*')
          .eq('id', quoteId)
          .single();

        if (fetchError) throw fetchError;
        setQuote(data);

        // Set initial scheduled date/time if exists
        if (data?.scheduled_date) {
          const parsed = parseScheduledDateTime(data.scheduled_date);
          setScheduledDate(parsed.date);
          setScheduledTime(parsed.time);
        }
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

  const handleStatusChange = async (newStatus: QuoteData['status']) => {
    if (!quote) return;

    try {
      const { error: updateError } = await supabase
        .from('repair_quotes')
        .update({ status: newStatus })
        .eq('id', quoteId);

      if (updateError) throw updateError;
      setQuote({ ...quote, status: newStatus });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSchedule = async () => {
    if (!quote || !scheduledDate || !scheduledTime) return;

    setScheduling(true);
    try {
      const timestamp = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

      if (scheduleType === 'quote') {
        const { error: updateError } = await supabase
          .from('repair_quotes')
          .update({
            quote_appointment_date: timestamp,
            status: 'quote_scheduled',
            updated_at: new Date().toISOString()
          })
          .eq('id', quoteId);

        if (updateError) throw updateError;
        setQuote({ ...quote, quote_appointment_date: timestamp, status: 'quote_scheduled' });
      } else {
        const { error: updateError } = await supabase
          .from('repair_quotes')
          .update({
            scheduled_date: timestamp,
            status: 'repair_scheduled',
            updated_at: new Date().toISOString()
          })
          .eq('id', quoteId);

        if (updateError) throw updateError;
        setQuote({ ...quote, scheduled_date: timestamp, status: 'repair_scheduled' });
      }
      setShowScheduleModal(false);
    } catch (err) {
      console.error('Error scheduling:', err);
    } finally {
      setScheduling(false);
    }
  };

  const handleRevise = async () => {
    if (!quote) return;

    setRevising(true);
    try {
      const { error: updateError } = await supabase
        .from('repair_quotes')
        .update({
          status: 'draft',
          client_signature: null,
          salesperson_signature: null,
          signed_copy_url: null,
          revision_count: (quote.revision_count || 0) + 1,
          revised_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      setQuote({
        ...quote,
        status: 'draft',
        revision_count: (quote.revision_count || 0) + 1,
        revised_at: new Date().toISOString()
      });
      setShowReviseModal(false);
    } catch (err) {
      console.error('Error revising quote:', err);
      alert('Failed to revise quote');
    } finally {
      setRevising(false);
    }
  };

  const openScheduleModal = (defaultType: ScheduleType) => {
    setScheduleType(defaultType);
    const existingDate = defaultType === 'quote' ? quote?.quote_appointment_date : quote?.scheduled_date;
    if (existingDate) {
      const parsed = parseScheduledDateTime(existingDate);
      setScheduledDate(parsed.date);
      setScheduledTime(parsed.time);
    } else {
      setScheduledDate('');
      setScheduledTime('09:00');
    }
    setShowScheduleModal(true);
  };

  const formatDisplayDateTime = (timestamp: string) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const viewPDF = async () => {
    if (!quote) return;

    // Open window immediately on user click (iOS Safari blocks delayed window.open)
    const newWindow = window.open('about:blank', '_blank');
    if (!newWindow) {
      alert('Please allow popups to view the PDF');
      return;
    }

    newWindow.document.write('<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui;"><p>Loading PDF...</p></body></html>');

    setPdfLoading(true);
    try {
      // Fetch fresh quote data for PDF generation
      const { data: freshQuote } = await supabase
        .from('repair_quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      const pdfBytes = await generatePDF(freshQuote as RepairQuote);
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      newWindow.location.href = blobUrl;
    } catch (err) {
      console.error('Error generating PDF:', err);
      newWindow.close();
      alert('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
            <StatusBadge status={quote.status} onChange={handleStatusChange} />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6">
        {/* Quote Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {quote.client_name || 'Unnamed Quote'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-500">Created {formatDate(quote.created_at)}</p>
                {quote.revision_count > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    Revision {quote.revision_count}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Quote Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {quote.quote_price > 0 ? formatCurrency(quote.quote_price) : '—'}
              </p>
              {quote.requires_deposit && quote.deposit > 0 && (
                <p className="text-sm text-blue-600">
                  Deposit: {formatCurrency(quote.deposit)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 text-sm">
            <div>
              <p className="text-gray-500">Address</p>
              <p className="font-medium text-gray-900">
                {quote.address || '—'}
                {quote.city_state && <>, {quote.city_state}</>}
                {quote.zip && <> {quote.zip}</>}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Phone</p>
              <p className="font-medium text-gray-900">{quote.phone || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{quote.email || '—'}</p>
            </div>
          </div>
          {quote.repair_description && (
            <div className="mt-4 text-sm">
              <p className="text-gray-500">Repair Description</p>
              <p className="font-medium text-gray-900">{quote.repair_description}</p>
            </div>
          )}
        </div>

        {/* Action Buttons - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Edit Quote */}
          <Link
            href={`/quote/${quoteId}/edit`}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Edit Quote</p>
              <p className="text-sm text-gray-500">Modify quote details</p>
            </div>
          </Link>

          {/* View Proposal */}
          <button
            onClick={viewPDF}
            disabled={pdfLoading}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-green-400 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center w-full disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              {pdfLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-600 border-t-transparent" />
              ) : (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">View Proposal</p>
              <p className="text-sm text-gray-500">Open PDF in new tab</p>
            </div>
          </button>

          {/* Customer Portal */}
          <button
            onClick={() => window.open(`/customer/${quoteId}`, '_blank')}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-purple-400 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center w-full"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Customer Portal</p>
              <p className="text-sm text-gray-500">Open in new tab</p>
            </div>
          </button>

          {/* Payment Ledger */}
          <Link
            href={`/quote/${quoteId}/payments`}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-amber-400 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Payment Ledger</p>
              <p className="text-sm text-gray-500">View payment status</p>
            </div>
          </Link>

          {/* Schedule */}
          <button
            onClick={() => openScheduleModal(quote.status === 'paid' || quote.status === 'repair_scheduled' ? 'repair' : 'quote')}
            className={`bg-white rounded-lg border border-gray-200 p-6 hover:border-purple-400 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center w-full ${
              (quote.quote_appointment_date || quote.scheduled_date) ? 'border-purple-300 bg-purple-50' : ''
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              (quote.quote_appointment_date || quote.scheduled_date) ? 'bg-purple-200' : 'bg-purple-100'
            }`}>
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Schedule</p>
              <p className="text-sm text-gray-500">
                {quote.scheduled_date
                  ? `Repair: ${formatDisplayDateTime(quote.scheduled_date)}`
                  : quote.quote_appointment_date
                  ? `Quote: ${formatDisplayDateTime(quote.quote_appointment_date)}`
                  : 'Set date and time'}
              </p>
            </div>
          </button>

          {/* Notes */}
          <Link
            href={`/quote/${quoteId}/notes`}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-teal-400 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center"
          >
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Notes</p>
              <p className="text-sm text-gray-500">Add internal notes</p>
            </div>
          </Link>

          {/* Revise Quote - only show when proposal has been sent */}
          {(quote.status === 'awaiting_signature' || quote.status === 'awaiting_payment' || quote.status === 'paid' || quote.status === 'repair_scheduled') && (
            <button
              onClick={() => setShowReviseModal(true)}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:border-red-400 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center w-full"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Revise Quote</p>
                <p className="text-sm text-gray-500">Reset to draft & edit</p>
              </div>
            </button>
          )}
        </div>

        {/* Revise Quote Confirmation Modal */}
        {showReviseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Revise Quote?</h2>
                  <p className="text-sm text-gray-500">This will reset the proposal</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800">
                  This will revoke the current proposal and allow editing. Any signatures will be cleared and the customer will need to sign again after you resend.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviseModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevise}
                  disabled={revising}
                  className="flex-1 px-4 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {revising ? 'Revising...' : 'Yes, Revise Quote'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Schedule</h2>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Type Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setScheduleType('quote')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    scheduleType === 'quote'
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  Quote Appointment
                </button>
                <button
                  onClick={() => setScheduleType('repair')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    scheduleType === 'repair'
                      ? 'bg-green-100 text-green-700 border-2 border-green-500'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  Repair
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {scheduleType === 'quote'
                  ? 'When should Colt visit to give the quote?'
                  : 'When should Colt come to do the repair?'}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={handleSchedule}
                  disabled={!scheduledDate || !scheduledTime || scheduling}
                  className={`w-full px-6 py-3 text-white font-semibold rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors ${
                    scheduleType === 'quote'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {scheduling ? 'Scheduling...' : scheduleType === 'quote' ? 'Schedule Quote' : 'Schedule Repair'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
