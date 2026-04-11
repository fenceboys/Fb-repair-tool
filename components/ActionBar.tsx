'use client';

import { useState, useEffect } from 'react';
import type { RepairQuote } from '@/types/quote';
import { supabase } from '@/lib/supabase';

interface ActionBarProps {
  quote: RepairQuote;
  onUpdate?: () => void;
}

// Parse existing timestamp to get date and time parts
function parseScheduledDateTime(timestamp: string | null): { date: string; time: string } {
  if (!timestamp) return { date: '', time: '09:00' };

  try {
    const dt = new Date(timestamp);
    const date = dt.toISOString().split('T')[0];
    const hours = dt.getHours().toString().padStart(2, '0');
    const minutes = dt.getMinutes().toString().padStart(2, '0');
    return { date, time: `${hours}:${minutes}` };
  } catch {
    return { date: '', time: '09:00' };
  }
}

export function ActionBar({ quote, onUpdate }: ActionBarProps) {
  const parsed = parseScheduledDateTime(quote.scheduled_date);
  const [scheduledDate, setScheduledDate] = useState(parsed.date);
  const [scheduledTime, setScheduledTime] = useState(parsed.time);
  const [saving, setSaving] = useState(false);

  // Update state when quote changes
  useEffect(() => {
    const parsed = parseScheduledDateTime(quote.scheduled_date);
    setScheduledDate(parsed.date);
    setScheduledTime(parsed.time);
  }, [quote.scheduled_date]);

  // Validation - all fields required
  const isValid =
    quote.client_name?.trim() &&
    quote.phone?.trim() &&
    quote.email?.trim() &&
    quote.address?.trim() &&
    quote.city_state?.trim() &&
    quote.zip?.trim() &&
    quote.repair_description?.trim() &&
    (quote.quote_price > 0 || quote.base_cost > 0);

  // Check if quote has been sent to customer
  const isSent = quote.status === 'awaiting_signature' || quote.status === 'awaiting_payment';
  const isPaidOrScheduled = quote.status === 'paid' || quote.status === 'repair_scheduled';

  const handleNext = () => {
    if (!isValid) {
      alert('Please fill in all required fields');
      return;
    }
    // Open customer view in new tab (with internal flag for Colt's view)
    window.open(`/customer/${quote.id}?internal=true`, '_blank');
  };

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) return;
    setSaving(true);

    // Combine date and time into ISO timestamp
    const timestamp = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

    await supabase
      .from('repair_quotes')
      .update({
        scheduled_date: timestamp,
        status: 'repair_scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', quote.id);

    setSaving(false);
    onUpdate?.();
  };

  const formatDisplayDateTime = (timestamp: string) => {
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

  // After payment - show scheduling UI or scheduled date
  if (isPaidOrScheduled) {
    // Already scheduled - show the date and time
    if (quote.status === 'repair_scheduled' && quote.scheduled_date) {
      return (
        <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 py-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Repair Scheduled</p>
                <p className="text-sm text-green-600">{formatDisplayDateTime(quote.scheduled_date)}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Paid but not scheduled - show date and time picker
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <button
              onClick={handleSchedule}
              disabled={!scheduledDate || !scheduledTime || saving}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mt-6"
            >
              {saving ? 'Saving...' : 'Schedule'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // After sending quote - no action bar needed (Colt sees QuoteSentView, admin uses admin page)
  if (isSent) {
    return null;
  }

  // Default - show Next button for drafts
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={handleNext}
          disabled={!isValid}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg"
        >
          <span>Next</span>
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
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
