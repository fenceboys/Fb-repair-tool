'use client';

import { useState } from 'react';
import { generatePDFBlob, generateFilename } from '@/lib/pdf';
import { PDFPreviewModal } from './PDFPreviewModal';
import { SlackMessageModal } from './SlackMessageModal';
import { InlineSignature } from './InlineSignature';
import { supabase } from '@/lib/supabase';
import type { RepairQuote } from '@/types/quote';

interface QuoteData {
  id: string;
  client_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city_state: string | null;
  repair_description: string | null;
  quote_price: number;
  deposit: number;
  requires_deposit: boolean;
  client_signature: string | null;
  base_cost: number;
  status: 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';
}

interface CustomerViewActionsProps {
  quote: QuoteData;
  onSignComplete: () => void;
  isInternal?: boolean;
}

export function CustomerViewActions({ quote, onSignComplete, isInternal = false }: CustomerViewActionsProps) {
  const [showSignature, setShowSignature] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [slackLoading, setSlackLoading] = useState(false);
  const [slackSent, setSlackSent] = useState(false);

  const isSigned = !!quote.client_signature;

  const handleSendSMS = async () => {
    // Get the customer's phone number (strip formatting for SMS)
    const phoneDigits = (quote.phone || '').replace(/\D/g, '');
    if (!phoneDigits) {
      alert('No phone number available');
      return;
    }

    // Build the link to this page
    const link = `${window.location.origin}/customer/${quote.id}`;

    // Pre-fill message
    const message = `Hi ${quote.client_name?.split(' ')[0] || 'there'}, here's your Fence Boys repair quote. You can view and sign it here: ${link}`;

    // Mark as 'awaiting_signature' if currently draft or quote_scheduled
    if (quote.status === 'draft' || quote.status === 'quote_scheduled') {
      await supabase
        .from('repair_quotes')
        .update({ status: 'awaiting_signature', updated_at: new Date().toISOString() })
        .eq('id', quote.id);
    }

    // Open native SMS app
    window.location.href = `sms:${phoneDigits}&body=${encodeURIComponent(message)}`;
  };

  const handleSendToSlack = async (customMessage: string) => {
    setSlackLoading(true);
    try {
      // Fetch fresh quote data to get latest signature
      const { data: freshQuote } = await supabase
        .from('repair_quotes')
        .select('*')
        .eq('id', quote.id)
        .single();

      if (!freshQuote) throw new Error('Quote not found');

      // Generate PDF blob
      const pdfBlob = await generatePDFBlob(freshQuote as RepairQuote);
      const filename = generateFilename(freshQuote as RepairQuote);

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
            client_name: freshQuote.client_name,
            phone: freshQuote.phone,
            email: freshQuote.email,
            address: freshQuote.address,
            city_state: freshQuote.city_state,
            quote_price: freshQuote.quote_price,
            base_cost: freshQuote.base_cost,
            deposit: freshQuote.deposit,
            requires_deposit: freshQuote.requires_deposit ?? false,
            repair_description: freshQuote.repair_description,
            status: freshQuote.status || 'draft',
            link_sent: freshQuote.status === 'awaiting_signature' || freshQuote.status === 'awaiting_payment' || freshQuote.status === 'paid' || freshQuote.status === 'repair_scheduled',
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

      // Update status to 'awaiting_signature' if still in draft
      if (freshQuote.status === 'draft' || freshQuote.status === 'quote_scheduled') {
        await supabase
          .from('repair_quotes')
          .update({ status: 'awaiting_signature', updated_at: new Date().toISOString() })
          .eq('id', quote.id);
      }

      setSlackSent(true);
      setTimeout(() => setSlackSent(false), 3000);
    } finally {
      setSlackLoading(false);
    }
  };

  // Convert QuoteData to RepairQuote for modals
  const quoteForModals: RepairQuote = {
    id: quote.id,
    created_at: '',
    updated_at: '',
    client_name: quote.client_name,
    phone: quote.phone,
    email: quote.email,
    address: quote.address,
    city_state: quote.city_state,
    zip: null,
    repair_description: quote.repair_description,
    line_items: [],
    base_cost: quote.base_cost,
    quote_price: quote.quote_price,
    misc: 0,
    deposit: quote.deposit,
    requires_deposit: quote.requires_deposit,
    status: quote.status,
    pdf_url: null,
    signed_copy_url: null,
    client_signature: quote.client_signature,
    salesperson_signature: null,
    notes: [],
    scheduled_date: null,
    quote_appointment_date: null,
    revision_count: 0,
    revised_at: null,
    portal_closed: false,
  };

  return (
    <>
      {/* Inline Signature Section - appears above the action bar when active */}
      {showSignature && !isSigned && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-gray-50 w-full sm:max-w-lg sm:rounded-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Sign Contract</h2>
                <button
                  onClick={() => setShowSignature(false)}
                  className="p-2 -mr-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <InlineSignature
                quoteId={quote.id}
                onSignComplete={() => {
                  setShowSignature(false);
                  onSignComplete();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Bar - 2x2 grid for internal, sticky horizontal for customer */}
      {isInternal ? (
        <div className="max-w-lg mx-auto px-4 pb-6">
          <div className="grid grid-cols-2 gap-3">
            {/* Text to Customer Button - hidden if signed */}
            {!isSigned && (
              <button
                onClick={handleSendSMS}
                className="flex items-center justify-center gap-2 px-4 py-4 font-medium rounded-lg transition-colors bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span>Text</span>
              </button>
            )}

            {/* Sign In-Person Button - hidden if signed */}
            {!isSigned && (
              <button
                onClick={() => setShowSignature(true)}
                className="flex items-center justify-center gap-2 px-4 py-4 font-medium rounded-lg transition-colors bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800"
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

            {/* View PDF Button */}
            <button
              onClick={() => setShowPDFPreview(true)}
              className="flex items-center justify-center gap-2 px-4 py-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors"
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

            {/* Slack Button */}
            <button
              onClick={() => setShowSlackModal(true)}
              disabled={slackLoading || slackSent}
              className={`flex items-center justify-center gap-2 px-4 py-4 font-medium rounded-lg transition-colors ${
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
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-8 sm:pb-4 shadow-lg z-30">
          <div className="max-w-lg mx-auto flex gap-3">
            {/* Sign Button - hidden if signed */}
            {!isSigned && (
              <button
                onClick={() => setShowSignature(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-lg transition-colors bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800"
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
                <span>Sign</span>
              </button>
            )}

            {/* View PDF Button */}
            <button
              onClick={() => setShowPDFPreview(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors"
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
          </div>
        </div>
      )}

      {/* Modals */}
      <PDFPreviewModal
        quote={quoteForModals}
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
      />

      <SlackMessageModal
        quote={quoteForModals}
        isOpen={showSlackModal}
        onClose={() => setShowSlackModal(false)}
        onSend={handleSendToSlack}
        loading={slackLoading}
      />
    </>
  );
}
