'use client';

import { useState } from 'react';
import type { RepairQuote } from '@/types/quote';
import { generatePDFBlob, generateFilename } from '@/lib/pdf';
import { PDFPreviewModal } from './PDFPreviewModal';
import { SlackMessageModal } from './SlackMessageModal';

interface ActionBarProps {
  quote: RepairQuote;
}

export function ActionBar({ quote }: ActionBarProps) {
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [slackLoading, setSlackLoading] = useState(false);
  const [slackSent, setSlackSent] = useState(false);

  // Validation - either sell price or base cost must be set
  const isValid =
    quote.client_name?.trim() &&
    quote.phone?.trim() &&
    quote.address?.trim() &&
    (quote.quote_price > 0 || quote.base_cost > 0);

  const handleViewPDF = () => {
    if (!isValid) {
      alert('Please fill in required fields: Client Name, Phone, Address, and either Cost or Sell Price');
      return;
    }
    setShowPDFPreview(true);
  };

  const handleSlackButtonClick = () => {
    if (!isValid) {
      alert('Please fill in required fields: Client Name, Phone, Address, and either Cost or Sell Price');
      return;
    }
    setShowSlackModal(true);
  };

  const handleSendToSlack = async (customMessage: string) => {
    setSlackLoading(true);
    try {
      // Generate PDF blob
      const pdfBlob = await generatePDFBlob(quote);
      const filename = generateFilename(quote);

      // Convert PDF blob to base64
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);

      // Send directly to Slack API with file attachment
      const response = await fetch('/api/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: {
            client_name: quote.client_name,
            phone: quote.phone,
            email: quote.email,
            address: quote.address,
            city_state: quote.city_state,
            quote_price: quote.quote_price,
            deposit: quote.deposit,
            requires_deposit: quote.requires_deposit ?? false,
            repair_description: quote.repair_description,
            is_signed: !!quote.client_signature,
          },
          pdfBase64: base64,
          filename,
          customMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send to Slack');
      }

      setSlackSent(true);
      setTimeout(() => setSlackSent(false), 3000);
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
            onClick={handleSlackButtonClick}
            disabled={slackLoading || slackSent || !isValid}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-lg transition-colors ${
              slackSent
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {slackSent ? (
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

      <SlackMessageModal
        quote={quote}
        isOpen={showSlackModal}
        onClose={() => setShowSlackModal(false)}
        onSend={handleSendToSlack}
        loading={slackLoading}
      />
    </>
  );
}
