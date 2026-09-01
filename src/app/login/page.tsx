'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';
import { resolvePostLoginPath } from '@/lib/auth/post-login';
import AuthShell from '@/components/auth/AuthShell';
import BrandLoader from '@/components/ui/BrandLoader';
import SuccessBanner from '@/components/ui/SuccessBanner';
import TransitionOverlay from '@/components/ui/TransitionOverlay';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Branded route-transition overlay: stays up from successful sign-in until
  // the target route renders, masking the redirect latency.
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');
  const verified = searchParams.get('verified') === '1';
  const resetDone = searchParams.get('reset') === '1';

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Route administrators straight to the admin console, bypassing the
      // standard user dashboard entirely. The caller's own profile row is
      // always readable under the "Users can select own profile" RLS policy.
      let role: string | null = null;
      if (data.user) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();
        role = (profileRow as { role: string } | null)?.role ?? null;
      }

      // Keep the submit button disabled while the client navigates away, and
      // show the branded transition overlay until the next route renders.
      setRedirecting(true);
      router.replace(resolvePostLoginPath(role));
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('errorUnexpectedSignIn');
      setError(message);
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-center text-2xl font-bold tracking-tight text-navy-900">
            {t('signInTitle')}
          </h1>
          <p className="mt-2 text-center text-sm text-navy-600">
            {t('signInOr')}{' '}
            <Link
              href="/signup"
              className="font-medium text-orange-700 underline transition-colors hover:text-orange-800"
            >
              {t('signUpTitle')}
            </Link>
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {verified && (
          <SuccessBanner
            title={t('verifiedTitle')}
            description={t('verifiedDesc')}
          />
        )}

        {resetDone && (
          <SuccessBanner
            title={t('resetDoneTitle')}
            description={t('resetDoneDesc')}
          />
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md">
            <div>
              <label
                htmlFor="email-address"
                className="block text-sm font-medium text-navy-700"
              >
                {t('email')}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600 disabled:opacity-50"
                placeholder={t('emailPlaceholder')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-navy-700"
                >
                  {t('password')}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-orange-700 underline transition-colors hover:text-orange-800"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600 disabled:opacity-50"
                placeholder={t('passwordPlaceholder')}
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
                  {t('signInLoading')}
                </>
              ) : (
                t('submitSignIn')
              )}
            </button>
          </div>
        </form>

        <TransitionOverlay
          show={redirecting}
          label={t('signInTransition')}
        />
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  const tCommon = useTranslations('common');
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-brand-bg">
          <BrandLoader size={64} label={tCommon('loading')} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
