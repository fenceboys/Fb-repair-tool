'use client';

import { useState } from 'react';
import type { RepairQuote } from '@/types/quote';
import { generatePDF, generateFilename } from '@/lib/pdf';
import { formatCurrency } from '@/lib/calculations';

interface PDFPreviewModalProps {
  quote: RepairQuote;
  isOpen: boolean;
  onClose: () => void;
}

export function PDFPreviewModal({ quote, isOpen, onClose }: PDFPreviewModalProps) {
  const [loading, setLoading] = useState(false);

  const handleViewPDF = async () => {
    setLoading(true);
    try {
      const bytes = await generatePDF(quote);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Create a link and click it to open in new tab
      // This works better on iOS Safari than window.open()
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleSharePDF = async () => {
    setLoading(true);
    try {
      const bytes = await generatePDF(quote);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const filename = generateFilename(quote);
      const file = new File([blob], filename, { type: 'application/pdf' });

      // Use Web Share API if available (works great on iOS)
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Fence Boys Repair Contract',
        });
      } else {
        // Fallback: create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      // User cancelled share - not an error
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing PDF:', error);
        alert('Failed to share PDF');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const amountDue = quote.requires_deposit ? quote.deposit : quote.quote_price;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Contract</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 active:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Customer</span>
            <span className="font-medium text-gray-900">{quote.client_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Address</span>
            <span className="font-medium text-gray-900 text-right max-w-[60%]">{quote.address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Price</span>
            <span className="font-medium text-gray-900">{formatCurrency(quote.quote_price)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="text-gray-700 font-medium">
              {quote.requires_deposit ? 'Deposit Due' : 'Amount Due'}
            </span>
            <span className="text-xl font-bold text-gray-900">{formatCurrency(amountDue)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pb-8 sm:pb-4 bg-gray-50 space-y-3">
          <button
            onClick={handleViewPDF}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-blue-600 text-white font-medium rounded-xl active:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
            View PDF
          </button>

          <button
            onClick={handleSharePDF}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl active:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share / Save
          </button>
        </div>
      </div>
    </div>
  );
}
