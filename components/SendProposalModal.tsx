'use client';

import { useState } from 'react';

interface SendProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (methods: { sms: boolean; email: boolean }) => Promise<void>;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  loading: boolean;
}

export function SendProposalModal({
  isOpen,
  onClose,
  onSend,
  customerName,
  customerPhone,
  customerEmail,
  loading,
}: SendProposalModalProps) {
  const [sendSMS, setSendSMS] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);

  if (!isOpen) return null;

  const hasPhone = !!customerPhone;
  const hasEmail = !!customerEmail;
  const canSend = (sendSMS && hasPhone) || (sendEmail && hasEmail);

  const handleSend = async () => {
    if (!canSend) return;
    await onSend({ sms: sendSMS && hasPhone, email: sendEmail && hasEmail });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Send Proposal</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">
            Send the proposal to <span className="font-medium">{customerName || 'customer'}</span> via:
          </p>

          <div className="space-y-3">
            {/* SMS Option */}
            <label
              className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                sendSMS
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${!hasPhone ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                checked={sendSMS}
                onChange={(e) => setSendSMS(e.target.checked)}
                disabled={!hasPhone}
                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="font-medium text-gray-900">Text Message (SMS)</span>
                </div>
                {hasPhone ? (
                  <p className="text-sm text-gray-500 mt-1">{customerPhone}</p>
                ) : (
                  <p className="text-sm text-red-500 mt-1">No phone number available</p>
                )}
              </div>
              {!hasPhone && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Coming Soon</span>
              )}
            </label>

            {/* Email Option */}
            <label
              className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                sendEmail
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${!hasEmail ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={!hasEmail}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-gray-900">Email</span>
                </div>
                {hasEmail ? (
                  <p className="text-sm text-gray-500 mt-1">{customerEmail}</p>
                ) : (
                  <p className="text-sm text-red-500 mt-1">No email available</p>
                )}
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Coming Soon</span>
            </label>
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Customer will receive a link to view and sign the proposal
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend || loading}
            className="flex-1 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Proposal
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
