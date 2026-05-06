'use client';

import { useState } from 'react';
import { generatePDF, generatePDFBlob, generateFilename } from '@/lib/pdf';
import { SlackMessageModal } from './SlackMessageModal';
import { SendProposalModal } from './SendProposalModal';
import { InlineSignature } from './InlineSignature';
import { supabase } from '@/lib/supabase';
import { toE164 } from '@/lib/phoneUtils';
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
  status: 'scheduling_quote' | 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';
}

interface CustomerViewActionsProps {
  quote: QuoteData;
  onSignComplete: () => void;
  isInternal?: boolean;
}

export function CustomerViewActions({ quote, onSignComplete, isInternal = false }: CustomerViewActionsProps) {
  const [showSignature, setShowSignature] = useState(false);
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [showSendProposalModal, setShowSendProposalModal] = useState(false);
  const [slackLoading, setSlackLoading] = useState(false);
  const [slackSent, setSlackSent] = useState(false);
  const [sendingProposal, setSendingProposal] = useState(false);
  const [proposalSent, setProposalSent] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isPaidOrScheduled = quote.status === 'paid' || quote.status === 'repair_scheduled';
  // Status is the source of truth - ignore old signatures
  const canSign = quote.status === 'awaiting_signature';
  // Show send options only for draft/scheduling_quote/quote_scheduled
  const canSendProposal = quote.status === 'draft' || quote.status === 'scheduling_quote' || quote.status === 'quote_scheduled';

  const handleSendProposal = async (methods: { sms: boolean; email: boolean }) => {
    setSendingProposal(true);
    try {
      const link = `${window.location.origin}/customer/${quote.id}`;

      // Send SMS via Quo (OpenPhone). Runs server-side through /api/send-sms
      // so the API key never reaches the browser. Failure is logged but
      // non-fatal — the rest of the Send Proposal flow still completes.
      if (methods.sms) {
        const to = toE164(quote.phone);
        const firstName = quote.client_name?.split(' ')[0] || 'there';
        const message = `Hi ${firstName}, your Fence Boys repair proposal is ready to view and sign: ${link}`;
        if (to) {
          try {
            const res = await fetch('/api/send-sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to, content: message }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data?.success === false) {
              console.error('[CustomerViewActions] SMS send failed:', data);
            }
          } catch (err) {
            console.error('[CustomerViewActions] SMS send threw:', err);
          }
        } else {
          console.warn('[CustomerViewActions] SMS skipped — phone not E.164-able:', quote.phone);
        }
      }

      // Email will be added later with Google API
      if (methods.email) {
        // Placeholder for email sending
        console.log('Email sending not yet implemented');
      }

      // Update status to awaiting_signature
      if (quote.status === 'draft' || quote.status === 'scheduling_quote' || quote.status === 'quote_scheduled') {
        await supabase
          .from('repair_quotes')
          .update({ status: 'awaiting_signature', updated_at: new Date().toISOString() })
          .eq('id', quote.id);
      }

      // Send full Slack notification when proposal is sent
      await sendFullSlackNotification();

      setShowSendProposalModal(false);
      setProposalSent(true);
      setTimeout(() => setProposalSent(false), 3000);
    } finally {
      setSendingProposal(false);
    }
  };

  const sendFullSlackNotification = async () => {
    try {
      const { data: freshQuote } = await supabase
        .from('repair_quotes')
        .select('*')
        .eq('id', quote.id)
        .single();

      if (!freshQuote) return;

      // Generate PDF
      const pdfBlob = await generatePDFBlob(freshQuote as RepairQuote);
      const filename = generateFilename(freshQuote as RepairQuote);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);

      // Send full notification to Slack
      await fetch('/api/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: {
            id: freshQuote.id,
            client_name: freshQuote.client_name,
            phone: freshQuote.phone,
            email: freshQuote.email,
            address: freshQuote.address,
            city_state: freshQuote.city_state,
            quote_price: freshQuote.quote_price,
            base_cost: freshQuote.base_cost,
            material_cost: freshQuote.material_cost ?? null,
            labor_cost: freshQuote.labor_cost ?? null,
            materials_notes: freshQuote.materials_notes ?? null,
            deposit: freshQuote.deposit,
            requires_deposit: freshQuote.requires_deposit ?? false,
            repair_description: freshQuote.repair_description,
            status: 'awaiting_signature',
            link_sent: true,
          },
          pdfBase64: base64,
          filename,
          customMessage: 'Proposal sent to customer',
        }),
      });
    } catch (err) {
      console.error('Error sending Slack notification:', err);
    }
  };

  // Simplified Slack - just sends basic contact info with custom message
  const handleSendToSlack = async (customMessage: string) => {
    setSlackLoading(true);
    try {
      // Send just basic contact info to Slack (no PDF, no full quote details)
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
          },
          customMessage,
          basicInfoOnly: true, // Flag to indicate simplified message
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

  // Fetch fresh quote data to get latest signature
  const fetchFreshQuote = async (): Promise<RepairQuote> => {
    const { data, error } = await supabase
      .from('repair_quotes')
      .select('*')
      .eq('id', quote.id)
      .single();

    if (error || !data) {
      console.error('Failed to fetch fresh quote:', error);
      return quoteForModals; // Fallback to prop data
    }
    return data;
  };

  const handleViewPDF = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMobileSafari = isIOS || isSafari;

    let newWindow: Window | null = null;
    if (!isMobileSafari) {
      newWindow = window.open('about:blank', '_blank');
      if (newWindow) {
        newWindow.document.write('<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui;"><p>Loading PDF...</p></body></html>');
      }
    }

    setPdfLoading(true);
    try {
      const freshQuote = await fetchFreshQuote();
      const bytes = await generatePDF(freshQuote);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });

      if (isMobileSafari) {
        const filename = generateFilename(freshQuote);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const blobUrl = URL.createObjectURL(blob);
        if (newWindow) {
          newWindow.location.href = blobUrl;
        } else {
          window.open(blobUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (newWindow) newWindow.close();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate PDF: ${errorMsg}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSharePDF = async () => {
    setPdfLoading(true);
    try {
      const freshQuote = await fetchFreshQuote();
      const bytes = await generatePDF(freshQuote);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const filename = generateFilename(freshQuote);
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Fence Boys Repair Contract',
        });
      } else {
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
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing PDF:', error);
        alert('Failed to share PDF');
      }
    } finally {
      setPdfLoading(false);
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
    internal_notes: null,
    payment_client_secret: null,
    material_cost: null,
    labor_cost: null,
    materials_notes: null,
    customer_id: null,
    deleted_at: null,
    title: null,
  };

  return (
    <>
      {/* Inline Signature Section - appears above the action bar when active */}
      {showSignature && canSign && (
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

      {/* Action Bar - for internal (Colt's view) */}
      {isInternal ? (
        <div className="max-w-lg mx-auto px-4 pb-6">
          <div className="space-y-3">
            {/* View PDF + Share PDF row */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleViewPDF}
                disabled={pdfLoading}
                className="flex items-center justify-center gap-2 px-4 py-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors border border-gray-300 disabled:opacity-50"
              >
                {pdfLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-600 border-t-transparent" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
                <span>View PDF</span>
              </button>
              <button
                onClick={handleSharePDF}
                disabled={pdfLoading}
                className="flex items-center justify-center gap-2 px-4 py-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors border border-gray-300 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Share PDF</span>
              </button>
            </div>

            {/* Send Proposal + Slack row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Send Proposal Button */}
              <button
                onClick={() => setShowSendProposalModal(true)}
                disabled={proposalSent}
                className={`flex items-center justify-center gap-2 px-4 py-4 font-medium rounded-lg transition-colors ${
                  proposalSent
                    ? 'bg-green-600 text-white'
                    : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                }`}
              >
                {proposalSent ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Sent!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Send Proposal</span>
                  </>
                )}
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
        </div>
      ) : (
        // External customer view - only show actions when relevant
        // Don't show action bar when paid or scheduled (they've completed their actions)
        isPaidOrScheduled ? null : (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-8 sm:pb-4 shadow-lg z-30">
            <div className="max-w-lg mx-auto flex gap-3">
              {/* Sign Button - only show when awaiting_signature and not signed */}
              {canSign && (
                <button
                  onClick={() => setShowSignature(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
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
                  <span>Sign Contract</span>
                </button>
              )}

              {/* View PDF Button */}
              <button
                onClick={handleViewPDF}
                disabled={pdfLoading}
                className={`flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 active:bg-gray-800 transition-colors disabled:opacity-50 ${canSign ? 'flex-1' : 'flex-1'}`}
              >
                {pdfLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span>View Proposal</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* Modals */}
      <SlackMessageModal
        quote={quoteForModals}
        isOpen={showSlackModal}
        onClose={() => setShowSlackModal(false)}
        onSend={handleSendToSlack}
        loading={slackLoading}
      />

      <SendProposalModal
        isOpen={showSendProposalModal}
        onClose={() => setShowSendProposalModal(false)}
        onSend={handleSendProposal}
        customerName={quote.client_name}
        customerPhone={quote.phone}
        customerEmail={quote.email}
        loading={sendingProposal}
      />
    </>
  );
}
