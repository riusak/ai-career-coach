'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import ErrorState from '@/components/ui/ErrorState';

/**
 * Password reset completion page — the user lands here from the recovery
 * email. The Supabase browser client detects the recovery code in the URL
 * (detectSessionInUrl, PKCE flow) and establishes the recovery session
 * automatically; this page only collects the new password.
 *
 * On success the recovery session is discarded and the user is sent to
 * /login?reset=1 for a clean sign-in with the new credentials.
 */

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('The password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        const normalized = updateError.message.toLowerCase();
        setError(
          normalized.includes('session') || normalized.includes('logged in')
            ? 'This reset link is invalid or has expired. Request a new reset email and try again.'
            : updateError.message
        );
        return;
      }

      // Drop the recovery session so /login renders the confirmation banner
      // instead of the auth proxy bouncing the user to /dashboard.
      await supabase.auth.signOut();
      router.replace('/login?reset=1');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while updating the password.'
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
            Choose a new password
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            Pick a strong password of at least 6 characters.
          </p>
        </div>

        {error && (
          <ErrorState title="Password update failed" description={error}>
            <Link
              href="/forgot-password"
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
            >
              Request a new link
            </Link>
          </ErrorState>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleUpdate}>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600 disabled:opacity-50"
                placeholder="•••••••• (min. 6 characters)"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-slate-700"
              >
                Confirm new password
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Updating password...' : 'Update password'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-600">
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
