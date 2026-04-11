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
}

export default function QuoteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const copyCustomerLink = () => {
    const url = `${window.location.origin}/customer/${quoteId}`;
    navigator.clipboard.writeText(url);
    alert('Customer portal link copied to clipboard!');
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
              <p className="text-gray-500 mt-1">Created {formatDate(quote.created_at)}</p>
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
            onClick={copyCustomerLink}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-purple-400 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center w-full"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Customer Repair Portal</p>
              <p className="text-sm text-gray-500">Copy link to send</p>
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

          {/* Notes */}
          <Link
            href={`/quote/${quoteId}/notes`}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-teal-400 hover:shadow-md transition-all flex flex-col items-center gap-3 text-center col-span-2"
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
        </div>
      </main>
    </div>
  );
}
