'use client';

import type { RepairQuote } from '@/types/quote';

interface ActionBarProps {
  quote: RepairQuote;
}

export function ActionBar({ quote }: ActionBarProps) {
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

  const handleViewPortal = () => {
    window.open(`/customer/${quote.id}?internal=true`, '_blank');
  };

  // After payment - show status instead of button
  if (isPaidOrScheduled) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 py-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {quote.status === 'paid' ? 'Paid - Needs Scheduling' : 'Repair Scheduled'}
              </p>
              <p className="text-sm text-gray-500">
                {quote.status === 'paid'
                  ? 'Contact customer to schedule repair'
                  : 'Appointment confirmed'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // After sending quote - show View Customer Portal
  if (isSent) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleViewPortal}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors text-lg border border-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>View Customer Portal</span>
          </button>
        </div>
      </div>
    );
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
