'use client';

interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === 'idle') return null;

  const indicators = {
    saving: {
      icon: (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
      ),
      text: 'Saving...',
      className: 'text-blue-600',
    },
    saved: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      text: 'Saved',
      className: 'text-green-600',
    },
    error: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      text: 'Error saving',
      className: 'text-red-600',
    },
  };

  const indicator = indicators[status];

  return (
    <div className={`flex items-center gap-1.5 text-sm ${indicator.className}`}>
      {indicator.icon}
      <span>{indicator.text}</span>
    </div>
  );
}
