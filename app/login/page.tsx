'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

type Stage = 'email' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        // No emailRedirectTo — we don't want users to click the link in a
        // different browser than the one they started in. The 6-digit code
        // in the same email is cross-browser safe.
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      const isMissingUser =
        msg.includes('signups not allowed') ||
        msg.includes('not found') ||
        msg.includes('user does not exist');
      setMessage({
        type: 'error',
        text: isMissingUser
          ? "That email isn't authorized. Ask an admin to invite you."
          : error.message,
      });
      setLoading(false);
      return;
    }

    setStage('code');
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createBrowserSupabaseClient();
    const token = code.trim();

    // Try the most common OTP types in sequence. Supabase returns
    // "token has expired or is invalid" if the type doesn't match
    // what was issued, which is ambiguous with an actually expired
    // token. Fall through all three to disambiguate.
    const typesToTry = ['email', 'magiclink', 'invite'] as const;
    let lastError: { message: string; status?: number } | null = null;
    let session: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>['data']['session'] = null;

    for (const type of typesToTry) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type,
      });
      if (!error && data.session) {
        session = data.session;
        break;
      }
      lastError = error ? { message: error.message, status: error.status } : null;
    }

    if (!session) {
      const detail = lastError?.message
        ? ` (${lastError.message}${lastError.status ? `, ${lastError.status}` : ''})`
        : '';
      setMessage({
        type: 'error',
        text: `That code was invalid or expired${detail}. Try again, or request a new code.`,
      });
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const redirectTo = profile?.role === 'salesperson' ? '/' : '/dashboard';
    router.push(redirectTo);
    router.refresh();
  };

  const handleStartOver = () => {
    setStage('email');
    setCode('');
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <img
            src="/fence-boys-logo.jpg"
            alt="Fence Boys"
            className="h-16 w-auto mx-auto rounded mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">Repair Tool</h1>
          <p className="text-gray-500 mt-2">Sign in to continue</p>
        </div>

        {stage === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@fenceboys.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                8-digit code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="12345678"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-2xl tracking-widest text-center font-mono"
              />
              <p className="text-xs text-gray-500 mt-2">
                Enter the 8-digit code we emailed to <span className="font-medium">{email}</span>.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={handleStartOver}
              className="w-full px-4 py-3 text-sm text-gray-600 hover:text-gray-900"
            >
              Use a different email
            </button>
          </form>
        )}

        {message && (
          <div
            className={`mt-4 p-4 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
