'use client';

import { Component, ReactNode, useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type PaymentErrorBranch =
  | 'fetch_timeout'
  | 'non_ok_response'
  | 'no_client_secret'
  | 'api_error_response'
  | 'fetch_reject'
  | 'fetch_reject_unknown'
  | 'elements_mount'
  | 'elements_render'
  | 'confirm_payment';

async function logClientError(payload: {
  quoteId?: string;
  errorBranch: PaymentErrorBranch;
  httpStatus?: number;
  rawName?: string;
  rawMessage?: string;
  requestId?: string;
}): Promise<void> {
  try {
    const conn = (navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }).connection;
    await fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        source: 'payment_modal',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        connectionType: conn?.effectiveType ?? null,
        saveData: conn?.saveData ?? null,
        ...payload,
      }),
    });
  } catch {
    // Swallow — telemetry failure must not break the payment UX.
  }
}

// Catches render-time errors inside the Stripe <Elements> tree.
class PaymentElementsBoundary extends Component<
  { quoteId: string; onError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    void logClientError({
      quoteId: this.props.quoteId,
      errorBranch: 'elements_render',
      rawName: error.name,
      rawMessage: error.message,
    });
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// Test mode - set to true to simulate payments without Stripe
const TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === 'true';

// Simulated payment form for testing
function TestCheckoutForm({
  amount,
  onPaymentComplete,
  onClose
}: {
  amount: number;
  onPaymentComplete: () => void;
  onClose: () => void;
}) {
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleSimulatePayment = async () => {
    setProcessing(true);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    onPaymentComplete();
  };

  return (
    <div className="space-y-6">
      {/* Test mode banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
        <p className="text-sm font-medium text-yellow-800">TEST MODE</p>
        <p className="text-xs text-yellow-600">No real charges will be made</p>
      </div>

      {/* Amount display */}
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600">Amount Due</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {formatCurrency(amount)}
        </p>
      </div>

      {/* Simulated card input */}
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <p className="text-sm text-gray-500 text-center">
          Stripe payment form disabled in test mode
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSimulatePayment}
          disabled={processing}
          className="flex-1 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : (
            `Simulate Payment`
          )}
        </button>
      </div>

      {/* Test mode note */}
      <div className="flex items-center justify-center gap-2 text-xs text-yellow-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Test mode - disable before going live</span>
      </div>
    </div>
  );
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  quoteId: string;
  customerName: string | null;
  customerEmail: string | null;
  onPaymentComplete: () => void;
}

function CheckoutForm({
  amount,
  quoteId,
  onPaymentComplete,
  onClose,
  onElementsLoadError,
}: {
  amount: number;
  quoteId: string;
  onPaymentComplete: () => void;
  onClose: () => void;
  onElementsLoadError: (err: { error: { message?: string; type?: string } }) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setProcessing(false);
      void logClientError({
        quoteId,
        errorBranch: 'confirm_payment',
        rawName: submitError.type,
        rawMessage: submitError.message ?? submitError.code ?? 'Payment failed',
      });
    } else {
      // Payment successful
      onPaymentComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-4">
      {/* Amount display */}
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600">Amount Due</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {formatCurrency(amount)}
        </p>
      </div>

      {/* Stripe Payment Element */}
      <div className="min-h-[200px]">
        <PaymentElement
          onLoadError={onElementsLoadError}
          options={{
            layout: 'tabs',
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : (
            `Pay ${formatCurrency(amount)}`
          )}
        </button>
      </div>

      {/* Security note */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Payments secured by Stripe</span>
      </div>
    </form>
  );
}

export function PaymentModal({
  isOpen,
  onClose,
  amount,
  quoteId,
  customerName,
  customerEmail,
  onPaymentComplete
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const initializePayment = async () => {
    setLoading(true);
    setError(null);

    // Small delay to ensure modal is fully rendered (helps with iOS Safari)
    await new Promise(resolve => setTimeout(resolve, 100));

    const requestId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({
          amount,
          quoteId,
          customerName,
          customerEmail,
        }),
        signal: controller.signal,
        credentials: 'same-origin',
        mode: 'same-origin',
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Payment API error:', res.status, errorText);
        setError(`Server error (${res.status}). Please try again.`);
        void logClientError({
          quoteId,
          errorBranch: 'non_ok_response',
          httpStatus: res.status,
          rawMessage: errorText.slice(0, 500),
          requestId,
        });
        return;
      }

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        void logClientError({
          quoteId,
          errorBranch: 'api_error_response',
          httpStatus: res.status,
          rawMessage: String(data.error),
          requestId,
        });
      } else if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setError('Invalid response from payment server');
        void logClientError({
          quoteId,
          errorBranch: 'no_client_secret',
          httpStatus: res.status,
          requestId,
        });
      }
    } catch (err) {
      console.error('Payment init error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Connection timed out. Please check your internet and try again.');
        void logClientError({
          quoteId,
          errorBranch: 'fetch_timeout',
          rawName: err.name,
          rawMessage: err.message,
          requestId,
        });
      } else if (err instanceof Error) {
        setError(`Connection error: ${err.message}`);
        void logClientError({
          quoteId,
          errorBranch: 'fetch_reject',
          rawName: err.name,
          rawMessage: err.message,
          requestId,
        });
      } else {
        setError('Failed to connect to payment server. Please try again.');
        void logClientError({
          quoteId,
          errorBranch: 'fetch_reject_unknown',
          rawMessage: String(err),
          requestId,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleElementsLoadError = (evt: { error: { message?: string; type?: string } }) => {
    const message = evt?.error?.message || 'Stripe Elements failed to load';
    setError(message);
    void logClientError({
      quoteId,
      errorBranch: 'elements_mount',
      rawName: evt?.error?.type,
      rawMessage: message,
    });
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setClientSecret(null);
    initializePayment();
  };

  useEffect(() => {
    if (isOpen && !clientSecret && !loading && !error) {
      initializePayment();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null);
      setError(null);
      setRetryCount(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Pay Your Deposit</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {TEST_MODE ? (
            <TestCheckoutForm
              amount={amount}
              onPaymentComplete={onPaymentComplete}
              onClose={onClose}
            />
          ) : (
            <>
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-red-600 mb-4">{error}</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRetry}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                  </div>
                  {retryCount > 0 && (
                    <p className="mt-3 text-xs text-gray-500">
                      Attempt {retryCount + 1} • If this persists, try refreshing the page
                    </p>
                  )}
                </div>
              )}

              {clientSecret && !error && (
                <PaymentElementsBoundary
                  quoteId={quoteId}
                  onError={() => setError('Payment form failed to load. Please try again.')}
                >
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#2563eb',
                          colorBackground: '#ffffff',
                          colorText: '#1f2937',
                          colorDanger: '#dc2626',
                          fontFamily: 'system-ui, sans-serif',
                          borderRadius: '8px',
                        },
                      },
                    }}
                  >
                    <CheckoutForm
                      amount={amount}
                      quoteId={quoteId}
                      onPaymentComplete={onPaymentComplete}
                      onClose={onClose}
                      onElementsLoadError={handleElementsLoadError}
                    />
                  </Elements>
                </PaymentElementsBoundary>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
