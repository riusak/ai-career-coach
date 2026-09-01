'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

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
          : t('errorUnexpectedForgot')
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
            {t('forgotTitle')}
          </h1>
          <p className="mt-2 text-center text-sm text-navy-600">
            {t('forgotSubtitle')}
          </p>
        </div>

        {error && (
          <ErrorState title={t('forgotErrorTitle')} description={error}>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
            >
              {tCommon('retry')}
            </button>
          </ErrorState>
        )}

        {sent && (
          <SuccessBanner
            title={t('forgotSuccessTitle')}
            description={t('forgotSuccessDesc', { email })}
          />
        )}

        <form className="mt-8 space-y-6" onSubmit={handleReset}>
          <div>
            <label htmlFor="email-address" className="block text-sm font-medium text-navy-700">
              {t('email')}
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
              className="mt-1 block w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600 disabled:opacity-50"
              placeholder={t('emailPlaceholder')}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || sent}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                  {t('forgotLoading')}
                </>
              ) : (
                t('submitForgot')
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-navy-600">
          {t('rememberedIt')}{' '}
          <Link
            href="/login"
            className="font-medium text-orange-700 underline transition-colors hover:text-orange-800"
          >
            {t('backToLogin')}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
