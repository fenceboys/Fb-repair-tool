'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RepairQuote } from '@/types/quote';
import { generatePDFBlob, generateFilename } from '@/lib/pdf';
import { PDFPreviewModal } from './PDFPreviewModal';

interface ActionBarProps {
  quote: RepairQuote;
  onSendToSlack: (pdfUrl?: string) => Promise<void>;
}

export function ActionBar({ quote, onSendToSlack }: ActionBarProps) {
  const router = useRouter();
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [slackLoading, setSlackLoading] = useState(false);
  const [slackSent, setSlackSent] = useState(false);

  // Validation
  const isValid =
    quote.client_name?.trim() &&
    quote.phone?.trim() &&
    quote.address?.trim() &&
    quote.quote_price > 0;

  const handleViewPDF = () => {
    if (!isValid) {
      alert('Please fill in required fields: Client Name, Phone, Address, and Quote Price');
      return;
    }
    setShowPDFPreview(true);
  };

  const handleSendToSlack = async () => {
    if (!isValid) {
      alert('Please fill in required fields before sending to Slack');
      return;
    }

    setSlackLoading(true);
    try {
      // Generate PDF and upload via API route
      const pdfBlob = await generatePDFBlob(quote);
      const filename = `quotes/${quote.id}/${generateFilename(quote)}`;

      const formData = new FormData();
      formData.append('file', pdfBlob, 'contract.pdf');
      formData.append('filename', filename);

      const uploadResponse = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      let pdfUrl: string | undefined;
      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        pdfUrl = uploadData.url;
      } else {
        const errorData = await uploadResponse.json();
        console.error('PDF upload failed:', errorData.error);
      }

      await onSendToSlack(pdfUrl);
      setSlackSent(true);
      setTimeout(() => setSlackSent(false), 3000);
    } catch (error) {
      console.error('Error sending to Slack:', error);
      alert('Failed to send to Slack');
    } finally {
      setSlackLoading(false);
    }
  };

  const handleCustomerSign = () => {
    // Open in new tab with customer flag to hide back button
    window.open(`/sign/${quote.id}?customer=true`, '_blank');
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex gap-3">
          {/* Customer Sign - Left (hidden after signing) */}
          {!quote.client_signature && (
            <button
              onClick={handleCustomerSign}
              disabled={!isValid}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-lg transition-colors bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span>Customer Sign</span>
            </button>
          )}

          {/* View PDF - Middle (Red brand color) */}
          <button
            onClick={handleViewPDF}
            disabled={!isValid}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span>View PDF</span>
          </button>

          {/* Slack - Right */}
          <button
            onClick={handleSendToSlack}
            disabled={slackLoading || slackSent || !isValid}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-lg transition-colors ${
              slackSent
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {slackLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : slackSent ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
              </svg>
            )}
            <span>{slackSent ? 'Sent!' : 'Slack'}</span>
          </button>
        </div>
      </div>

      <PDFPreviewModal
        quote={quote}
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
      />
    </>
  );
}
