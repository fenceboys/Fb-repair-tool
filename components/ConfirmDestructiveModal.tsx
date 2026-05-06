'use client';

import { useEffect, useState } from 'react';

interface ConfirmDestructiveModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmWord?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

// Modal that requires typing a specific word (default "DELETE") before the
// confirm button enables. Used for permanent-delete flows where a one-click
// confirm would be too dangerous.
export function ConfirmDestructiveModal({
  isOpen,
  title,
  description,
  confirmWord = 'DELETE',
  confirmLabel = 'Permanently delete',
  onConfirm,
  onClose,
}: ConfirmDestructiveModalProps) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setBusy(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const matches = input === confirmWord;

  const handleConfirm = async () => {
    if (!matches) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">This cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4">{description}</p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type <span className="font-mono font-bold text-red-600">{confirmWord}</span> to confirm
        </label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
        />

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
            onClick={handleConfirm}
            disabled={!matches || busy}
            className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
