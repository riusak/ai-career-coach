'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import ErrorState from '@/components/ui/ErrorState';
import SuccessBanner from '@/components/ui/SuccessBanner';

/**
 * Forgot password — initiates the Supabase recovery flow. The email contains
 * a recovery link pointing back at /reset-password (redirectTo below), which
 * lets the user pick a new password. Redirects are anchored to the current
 * origin so local dev and production both resolve without manual edits.
 */

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while requesting the reset email.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div>
          <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-gradient-to-r from-gold-400 to-gold-600" />
          <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">
            Reset your password
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            Enter your account email and we will send you a reset link.
          </p>
        </div>

        {error && (
          <ErrorState title="Reset request failed" description={error}>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
            >
              Try again
            </button>
          </ErrorState>
        )}

        {sent && (
          <SuccessBanner
            title="Check your inbox"
            description={`If an account exists for ${email}, a password reset link is on its way. The link opens our reset page automatically — no routing errors to worry about.`}
          />
        )}

        <form className="mt-8 space-y-6" onSubmit={handleReset}>
          <div>
            <label htmlFor="email-address" className="block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading || sent}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600 disabled:opacity-50"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || sent}
              className="flex w-full justify-center rounded-md bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending reset link...' : 'Send reset link'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-600">
          Remembered it?{' '}
          <Link
            href="/login"
            className="font-medium text-gold-700 underline transition-colors hover:text-gold-800"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
