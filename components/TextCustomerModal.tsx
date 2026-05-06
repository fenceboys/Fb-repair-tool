'use client';

import { useEffect, useState } from 'react';
import { toE164, formatPhoneDisplay } from '@/lib/phoneUtils';

interface TextCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  onSent?: () => void;
}

const MAX_LEN = 320;

export function TextCustomerModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  customerPhone,
  onSent,
}: TextCustomerModalProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setContent('');
      setError(null);
      setSending(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const to = toE164(customerPhone);
  const displayPhone = formatPhoneDisplay(customerPhone);
  const firstName = customerName?.split(' ')[0] || 'there';

  const handleSend = async () => {
    if (!to) {
      setError('Customer phone number is missing or invalid.');
      return;
    }
    if (!content.trim()) {
      setError('Message cannot be empty.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, content: content.trim(), customerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.error || `Send failed (${res.status})`);
        setSending(false);
        return;
      }
      onClose();
      onSent?.();
    } catch (err) {
      console.error(err);
      setError('Network error — try again.');
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Text {firstName}</h2>
            <p className="text-sm text-gray-500">{displayPhone || 'No phone on file'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_LEN))}
          rows={5}
          autoFocus
          placeholder={`Hi ${firstName}, ...`}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
        />
        <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
          <span>Sends from 740-527-8899 via Quo</span>
          <span>
            {content.length} / {MAX_LEN}
          </span>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !content.trim() || !to}
            className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending…' : 'Send text'}
          </button>
        </div>
      </div>
    </div>
  );
}
