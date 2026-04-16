'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RepairQuote } from '@/types/quote';
import { formatCurrency } from '@/lib/calculations';
import { generatePDF } from '@/lib/pdf';

interface QuoteSentViewProps {
  quote: RepairQuote;
}

export function QuoteSentView({ quote }: QuoteSentViewProps) {
  const router = useRouter();
  const [pdfLoading, setPdfLoading] = useState(false);

  const getStatusInfo = () => {
    switch (quote.status) {
      case 'awaiting_signature':
        return {
          label: 'Proposal Sent',
          color: 'blue',
          description: 'Waiting for customer to sign',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          ),
        };
      case 'awaiting_payment':
        return {
          label: 'Awaiting Payment',
          color: 'amber',
          description: 'Customer signed, waiting for payment',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          ),
        };
      case 'paid':
        return {
          label: 'Paid',
          color: 'green',
          description: 'Payment received - scheduling repair',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          ),
        };
      case 'repair_scheduled':
        return {
          label: 'Scheduled',
          color: 'green',
          description: quote.scheduled_date ? formatScheduledDate(quote.scheduled_date) : 'Date set',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          ),
        };
      default:
        return {
          label: 'Sent',
          color: 'gray',
          description: '',
          icon: null,
        };
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const viewPDF = async () => {
    const newWindow = window.open('about:blank', '_blank');
    if (!newWindow) {
      alert('Please allow popups to view the PDF');
      return;
    }

    newWindow.document.write('<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui;"><p>Loading PDF...</p></body></html>');

    setPdfLoading(true);
    try {
      const pdfBytes = await generatePDF(quote);
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

  const statusInfo = getStatusInfo();
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  };
  const colors = colorClasses[statusInfo.color as keyof typeof colorClasses];

  // Calculate pricing
  const minPrice = quote.base_cost > 0 ? Math.round((quote.base_cost / 0.75) * 100) / 100 : 0;
  const misc = quote.quote_price - minPrice;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <span className="text-sm text-gray-500">
              Created {formatDate(quote.created_at)}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Status Card */}
        <div className={`bg-white rounded-xl border ${colors.border} p-6`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 ${colors.bg} rounded-full flex items-center justify-center`}>
              <svg className={`w-7 h-7 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {statusInfo.icon}
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{statusInfo.label}</h1>
              <p className="text-gray-600">{statusInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Internal Notes */}
        {quote.internal_notes && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <h2 className="text-sm font-medium text-amber-800">Internal Notes</h2>
            </div>
            <p className="text-amber-900 whitespace-pre-wrap">{quote.internal_notes}</p>
          </div>
        )}

        {/* Customer Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Customer</h2>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-900">{quote.client_name || 'No name'}</p>
            <p className="text-gray-700">
              {quote.address}
              {quote.city_state && <>, {quote.city_state}</>}
              {quote.zip && <> {quote.zip}</>}
            </p>
            {quote.phone && (
              <a href={`tel:${quote.phone}`} className="text-blue-600 hover:text-blue-700 block">
                {quote.phone}
              </a>
            )}
          </div>
        </div>

        {/* Repair Description */}
        {quote.repair_description && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Repair Description</h2>
            <p className="text-gray-900 whitespace-pre-wrap">{quote.repair_description}</p>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Price</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Your Cost</span>
              <span className="font-medium">{formatCurrency(quote.base_cost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sell Price</span>
              <span className="font-semibold text-lg">{formatCurrency(quote.quote_price)}</span>
            </div>
            {misc !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Misc</span>
                <span className={misc >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {misc >= 0 ? '+' : ''}{formatCurrency(misc)}
                </span>
              </div>
            )}
            {quote.requires_deposit && (
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-600">Deposit (50%)</span>
                <span className="font-medium">{formatCurrency(quote.deposit)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes from Admin */}
        {quote.notes && quote.notes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Notes</h2>
            <div className="space-y-3">
              {quote.notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-900">{note.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(note.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View PDF Button */}
        <button
          onClick={viewPDF}
          disabled={pdfLoading}
          className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            {pdfLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
            ) : (
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          <span className="font-semibold text-gray-900">View Proposal PDF</span>
        </button>
      </main>
    </div>
  );
}
