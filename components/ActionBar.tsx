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

  const handleNext = () => {
    if (!isValid) {
      alert('Please fill in all required fields');
      return;
    }
    // Open customer view in new tab (with internal flag for Colt's view)
    window.open(`/customer/${quote.id}?internal=true`, '_blank');
  };

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
