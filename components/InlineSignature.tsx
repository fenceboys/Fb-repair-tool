'use client';

import { useState } from 'react';

interface InlineSignatureProps {
  quoteId: string;
  onSignComplete: () => void;
}

export function InlineSignature({ quoteId, onSignComplete }: InlineSignatureProps) {
  const [typedName, setTypedName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  const handleSign = async () => {
    if (!typedName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      // Create a signature from the typed name (transparent background)
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.font = 'italic 36px "Brush Script MT", cursive, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
      }

      const signatureDataUrl = canvas.toDataURL('image/png');

      // Import supabase dynamically to avoid SSR issues
      const { supabase } = await import('@/lib/supabase');

      const { error: updateError } = await supabase
        .from('repair_quotes')
        .update({
          client_signature: signatureDataUrl,
          status: 'signed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      setSigned(true);
      onSignComplete();
    } catch (err) {
      console.error('Error saving signature:', err);
      setError('Failed to save signature. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (signed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <svg
          className="mx-auto h-12 w-12 text-green-500 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-bold text-green-800 mb-1">Contract Signed!</h3>
        <p className="text-green-700 text-sm">Thank you for signing.</p>
        <p className="text-xs text-green-600 mt-2">Signed on {today}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Sign Contract</h3>

      <p className="text-sm text-gray-600 mb-4">
        By typing your name below, you agree to the terms of this repair
        contract and authorize Fence Boys to perform the described work.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type your full name to sign
        </label>
        <input
          type="text"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder="John Smith"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
        />
      </div>

      {typedName.trim() && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Signature Preview:</p>
          <p
            className="text-3xl text-center py-2"
            style={{ fontFamily: '"Brush Script MT", cursive, serif', fontStyle: 'italic' }}
          >
            {typedName}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>Date:</span>
        <span className="font-medium">{today}</span>
      </div>

      <button
        onClick={handleSign}
        disabled={!typedName.trim() || submitting}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg"
      >
        {submitting ? 'Signing...' : 'Sign Contract'}
      </button>
    </div>
  );
}
