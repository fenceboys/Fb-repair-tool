'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStatusConfig } from '@/hooks/useStatusConfig';
import { getStatusColorClasses } from '@/types/admin';

type QuoteStatus = 'scheduling_quote' | 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';

interface StatusBadgeProps {
  status: string;
  onChange?: (newStatus: QuoteStatus) => void;
  onQuoteScheduled?: (date: string) => void; // Called when quote_scheduled is selected with a date
}

// Default styles (used as fallback)
const defaultStatusStyles: Record<string, string> = {
  scheduling_quote: 'bg-orange-100 text-orange-700',
  quote_scheduled: 'bg-gray-100 text-gray-700',
  draft: 'bg-amber-100 text-amber-700',
  awaiting_signature: 'bg-blue-100 text-blue-700',
  awaiting_payment: 'bg-green-100 text-green-700',
  paid: 'bg-purple-100 text-purple-700',
  repair_scheduled: 'bg-teal-100 text-teal-700',
};

// Default labels (used as fallback)
const defaultStatusLabels: Record<string, string> = {
  scheduling_quote: 'Scheduling Quote',
  quote_scheduled: 'Quote Scheduled',
  draft: 'Draft',
  awaiting_signature: 'Awaiting Signature',
  awaiting_payment: 'Awaiting Payment',
  paid: 'Paid',
  repair_scheduled: 'Repair Scheduled',
};

const defaultAllStatuses: QuoteStatus[] = ['scheduling_quote', 'quote_scheduled', 'draft', 'awaiting_signature', 'awaiting_payment', 'paid', 'repair_scheduled'];

export function StatusBadge({ status, onChange, onQuoteScheduled }: StatusBadgeProps) {
  const { statuses, loading } = useStatusConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get status config from database or use defaults
  const getStatusStyle = (statusKey: string): string => {
    const statusConfig = statuses.find((s) => s.status_key === statusKey);
    if (statusConfig) {
      const colors = getStatusColorClasses(statusConfig.color);
      return `${colors.bg} ${colors.text}`;
    }
    return defaultStatusStyles[statusKey] || defaultStatusStyles.draft;
  };

  const getStatusLabel = (statusKey: string): string => {
    const statusConfig = statuses.find((s) => s.status_key === statusKey);
    return statusConfig?.label || defaultStatusLabels[statusKey] || 'Draft';
  };

  const getAllStatuses = (): QuoteStatus[] => {
    if (statuses.length > 0) {
      return statuses
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => s.status_key as QuoteStatus);
    }
    return defaultAllStatuses;
  };

  const style = getStatusStyle(status);
  const label = getStatusLabel(status);
  const allStatuses = getAllStatuses();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen]);

  const handleSelect = (newStatus: QuoteStatus) => {
    if (newStatus === status) {
      setIsOpen(false);
      return;
    }

    // If selecting quote_scheduled, show date picker
    if (newStatus === 'quote_scheduled') {
      setIsOpen(false);
      setScheduledDate('');
      setScheduledTime('09:00');
      setShowDatePicker(true);
      return;
    }

    if (onChange) {
      onChange(newStatus);
    }
    setIsOpen(false);
  };

  const handleDateConfirm = () => {
    if (!scheduledDate || !scheduledTime) return;

    const timestamp = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

    if (onQuoteScheduled) {
      onQuoteScheduled(timestamp);
    } else if (onChange) {
      // Fallback to just changing status if no date handler provided
      onChange('quote_scheduled');
    }

    setShowDatePicker(false);
    setScheduledDate('');
    setScheduledTime('09:00');
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onChange) {
      e.stopPropagation();
      setIsOpen(!isOpen);
    }
  };

  if (!onChange) {
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${style}`}>
        {label}
      </span>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleClick}
          className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${style} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 transition-all flex items-center gap-1`}
        >
          {label}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && typeof document !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            {allStatuses.map((s) => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(s);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  s === status ? 'bg-gray-50' : ''
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${getStatusStyle(s).split(' ')[0]}`} />
                {getStatusLabel(s)}
                {s === 'quote_scheduled' && s !== status && (
                  <svg className="w-3 h-3 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {s === status && (
                  <svg className="w-4 h-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>

      {/* Date Picker Modal for Quote Scheduled */}
      {showDatePicker && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowDatePicker(false)}
        >
          <div
            className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Schedule Quote</h3>
                <p className="text-sm text-gray-500">When is the quote appointment?</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDatePicker(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDateConfirm}
                disabled={!scheduledDate || !scheduledTime}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
