'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/calculations';

interface QuoteData {
  id: string;
  client_name: string;
  address: string;
  city_state: string;
  repair_description: string;
  quote_price: number;
  deposit: number;
  requires_deposit: boolean;
  client_signature: string | null;
}

export default function CustomerSignPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('repair_quotes')
          .select('id, client_name, address, city_state, repair_description, quote_price, deposit, requires_deposit, client_signature')
          .eq('id', quoteId)
          .single();

        if (fetchError) throw fetchError;
        setQuote(data);

        if (data.client_signature) {
          setSigned(true);
        }
      } catch (err) {
        console.error('Error fetching quote:', err);
        setError('Quote not found');
      } finally {
        setLoading(false);
      }
    };

    if (quoteId) {
      fetchQuote();
    }
  }, [quoteId]);

  const handleSign = async () => {
    if (!typedName.trim() || !quote) return;

    setSubmitting(true);

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

      const { error: updateError } = await supabase
        .from('repair_quotes')
        .update({
          client_signature: signatureDataUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      setSigned(true);
    } catch (err) {
      console.error('Error saving signature:', err);
      setError('Failed to save signature. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-700">{error || 'Quote not found'}</p>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <img
              src="/fence-boys-logo.jpg"
              alt="Fence Boys"
              className="h-12 w-auto rounded"
            />
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">Fence Boys</h1>
              <p className="text-sm text-gray-500">Repair Contract</p>
            </div>
          </div>
        </div>
      </header>

      {/* Back button for repair person - shown after signing */}
      {signed && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <button
            onClick={() => router.push(`/quote/${quoteId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Quote</span>
          </button>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-6">
        {signed ? (
          /* Signed Confirmation */
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <svg
              className="mx-auto h-16 w-16 text-green-500 mb-4"
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
            <h2 className="text-2xl font-bold text-green-800 mb-2">
              Contract Signed!
            </h2>
            <p className="text-green-700 mb-4">
              Thank you for signing the repair contract.
            </p>
            <p className="text-sm text-green-600">
              Signed on {today}
            </p>
          </div>
        ) : (
          <>
            {/* Quote Summary */}
            <section className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Contract Summary
              </h2>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{quote.client_name || '—'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Property Address</p>
                  <p className="font-medium">
                    {quote.address || '—'}
                    {quote.city_state && `, ${quote.city_state}`}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Repair Description</p>
                  <p className="font-medium">{quote.repair_description || '—'}</p>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      {quote.requires_deposit ? 'Total Price:' : 'Amount Due:'}
                    </span>
                    <span className="text-xl font-bold">
                      {formatCurrency(quote.quote_price)}
                    </span>
                  </div>
                  {quote.requires_deposit && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-600">Deposit Due (50%):</span>
                      <span className="text-lg font-semibold text-blue-600">
                        {formatCurrency(quote.deposit)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Signature Section */}
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Sign Contract
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                By typing your name below, you agree to the terms of this repair
                contract and authorize Fence Boys to perform the described work.
              </p>

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
            </section>
          </>
        )}
      </main>
    </div>
  );
}
