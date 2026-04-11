'use client';

import { useState, useEffect } from 'react';
import type { RepairQuote } from '@/types/quote';
import { supabase } from '@/lib/supabase';

interface SchedulingSectionProps {
  quote: RepairQuote;
  onUpdate?: () => void;
}

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

export function SchedulingSection({ quote, onUpdate }: SchedulingSectionProps) {
  const parsed = parseScheduledDateTime(quote.scheduled_date);
  const [scheduledDate, setScheduledDate] = useState(parsed.date);
  const [scheduledTime, setScheduledTime] = useState(parsed.time);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const parsed = parseScheduledDateTime(quote.scheduled_date);
    setScheduledDate(parsed.date);
    setScheduledTime(parsed.time);
  }, [quote.scheduled_date]);

  const isScheduled = quote.status === 'repair_scheduled' && quote.scheduled_date;

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) return;
    setSaving(true);

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

  // Only show for paid or scheduled quotes
  if (quote.status !== 'paid' && quote.status !== 'repair_scheduled') {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isScheduled ? 'bg-green-100' : 'bg-amber-100'}`}>
          <svg
            className={`w-5 h-5 ${isScheduled ? 'text-green-600' : 'text-amber-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          {isScheduled ? 'Repair Scheduled' : 'Schedule Repair'}
        </h3>
      </div>

      {isScheduled && quote.scheduled_date ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">
              {formatDisplayDateTime(quote.scheduled_date)}
            </p>
          </div>
          <button
            onClick={() => {
              // Allow rescheduling by resetting to date picker
              const parsed = parseScheduledDateTime(quote.scheduled_date);
              setScheduledDate(parsed.date);
              setScheduledTime(parsed.time);
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Reschedule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Payment received. Schedule the repair appointment for Colt.
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
          <button
            onClick={handleSchedule}
            disabled={!scheduledDate || !scheduledTime || saving}
            className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Scheduling...' : 'Schedule Repair'}
          </button>
        </div>
      )}
    </div>
  );
}
