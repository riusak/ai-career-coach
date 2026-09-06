'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import ErrorState from '@/components/ui/ErrorState';
import TransitionOverlay from '@/components/ui/TransitionOverlay';

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
  // Branded route-transition overlay while navigating back to /login.
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations('auth');


  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t('errorWeak'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('errorMismatch'));
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        const normalized = updateError.message.toLowerCase();
        setError(
          normalized.includes('session') || normalized.includes('logged in')
            ? t('resetLinkExpired')
            : updateError.message
        );
        return;
      }

      // Drop the recovery session so /login renders the confirmation banner
      // instead of the auth proxy bouncing the user to /dashboard.
      await supabase.auth.signOut();
      setRedirecting(true);
      router.replace('/login?reset=1');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('errorUnexpectedReset')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-center text-2xl font-bold tracking-tight text-navy-900">
            {t('resetTitle')}
          </h1>
          <p className="mt-2 text-center text-sm text-navy-600">
            {t('resetSubtitle')}
          </p>
        </div>

        {error && (
          <ErrorState title={t('resetErrorTitle')} description={error}>
            <Link
              href="/forgot-password"
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
            >
              {t('requestNewLink')}
            </Link>
          </ErrorState>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleUpdate}>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-navy-700">
                {t('passwordNew')}
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
                className="mt-1 block w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600 disabled:opacity-50"
                placeholder={t('passwordPlaceholder')}
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-navy-700"
              >
                {t('passwordConfirm')}
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
                className="mt-1 block w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || redirecting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading || redirecting ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                  {t('resetLoading')}
                </>
              ) : (
                t('submitReset')
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-navy-600">
          <Link
            href="/login"
            className="font-medium text-orange-700 underline transition-colors hover:text-orange-800"
          >
            {t('backToLogin')}
          </Link>
        </p>

        <TransitionOverlay
          show={redirecting}
          label={t('resetTransition')}
        />
      </div>
    </AuthShell>
  );
}
