'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { TextCustomerModal } from './TextCustomerModal';

interface MessageRow {
  id: string;
  created_at: string;
  direction: 'outbound' | 'inbound';
  content: string;
  status: string | null;
}

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
}

export function MessagesModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  customerPhone,
}: MessagesModalProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);

  const fetch = useCallback(async () => {
    if (!customerId) return;
    const { data } = await supabase
      .from('customer_messages')
      .select('id, created_at, direction, content, status')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setMessages((data ?? []) as MessageRow[]);
  }, [customerId, supabase]);

  useEffect(() => {
    if (isOpen) fetch();
  }, [isOpen, fetch]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
              <p className="text-sm text-gray-500">
                {customerName || 'Customer'}
                {messages.length > 0 && ` · ${messages.length}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                disabled={!customerPhone}
                className="px-3 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                New text
              </button>
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
          </div>

          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">
                  No messages yet. Hit <span className="font-medium">New text</span> to send the first one.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {messages.map((m) => (
                  <li key={m.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                        {m.direction === 'outbound' ? 'Sent' : 'Received'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(m.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{m.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <TextCustomerModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        customerId={customerId}
        customerName={customerName}
        customerPhone={customerPhone}
        onSent={fetch}
      />
    </>
  );
}
