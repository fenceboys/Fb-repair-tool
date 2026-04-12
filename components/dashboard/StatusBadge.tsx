'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

type QuoteStatus = 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';

interface StatusBadgeProps {
  status: string;
  onChange?: (newStatus: QuoteStatus) => void;
}

const statusStyles: Record<string, string> = {
  quote_scheduled: 'bg-gray-100 text-gray-700',
  draft: 'bg-amber-100 text-amber-700',
  awaiting_signature: 'bg-blue-100 text-blue-700',
  awaiting_payment: 'bg-green-100 text-green-700',
  paid: 'bg-purple-100 text-purple-700',
  repair_scheduled: 'bg-teal-100 text-teal-700',
};

const statusLabels: Record<string, string> = {
  quote_scheduled: 'Quote Scheduled',
  draft: 'Draft',
  awaiting_signature: 'Awaiting Signature',
  awaiting_payment: 'Awaiting Payment',
  paid: 'Paid',
  repair_scheduled: 'Repair Scheduled',
};

const allStatuses: QuoteStatus[] = ['quote_scheduled', 'draft', 'awaiting_signature', 'awaiting_payment', 'paid', 'repair_scheduled'];

export function StatusBadge({ status, onChange }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const style = statusStyles[status] || statusStyles.draft;
  const label = statusLabels[status] || 'Draft';

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
    if (onChange && newStatus !== status) {
      onChange(newStatus);
    }
    setIsOpen(false);
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
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
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
              <span className={`w-2 h-2 rounded-full ${statusStyles[s].split(' ')[0]}`} />
              {statusLabels[s]}
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
  );
}
