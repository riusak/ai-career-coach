'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';
import { classifyAuthError, type AuthErrorClassification } from '@/lib/supabase/auth-errors';
import AuthShell from '@/components/auth/AuthShell';
import TransitionOverlay from '@/components/ui/TransitionOverlay';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Tracks the classified error kind so the UI can offer the right next step
  // when Supabase failed to deliver the confirmation email (SMTP issue).
  const [errorKind, setErrorKind] = useState<AuthErrorClassification | null>(null);
  const [loading, setLoading] = useState(false);
  // Branded route-transition overlay while navigating to /verify or /dashboard.
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations('auth');


  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setErrorKind(null);
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
          },
          // Fallback for email templates rendering {{ .ConfirmationURL }}:
          // the user lands on /verify, where they can type the 6-digit OTP.
          emailRedirectTo: `${window.location.origin}/verify?email=${encodeURIComponent(email)}`,
        },
      });

      if (signUpError) {
        const info = classifyAuthError(signUpError.message);
        setError(info.message);
        setErrorKind(info.kind);
        return;
      }

      // If the session exists immediately, email confirmation is disabled in
      // the Supabase project: the account is usable right away.
      if (data.session) {
        setRedirecting(true);
        router.push('/dashboard');
        router.refresh();
        return;
      }

      // Email confirmation enabled: a 6-digit OTP code was sent. Route to the
      // dedicated verification page.
      setRedirecting(true);
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('errorUnexpectedSignUp');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-center text-2xl font-bold tracking-tight text-navy-900">
            {t('signUpTitle')}
          </h1>
          <p className="mt-2 text-center text-sm text-navy-600">
            {t('haveAccount')}{' '}
            <Link
              href="/login"
              className="font-medium text-orange-700 underline transition-colors hover:text-orange-800"
            >
              {t('submitSignIn')}
            </Link>
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <p>{error}</p>
            {(errorKind === 'confirmation-email' ||
              errorKind === 'user-already-registered') && (
              <Link
                href={`/verify?email=${encodeURIComponent(email)}`}
                className="mt-2 inline-block font-semibold underline transition-colors hover:text-red-900"
              >
                {t('goToVerification')}
              </Link>
            )}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4 rounded-md">
            <div>
              <label
                htmlFor="full-name"
                className="block text-sm font-medium text-navy-700"
              >
                {t('fullName')}
              </label>
              <input
                id="full-name"
                name="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600 disabled:opacity-50"
                placeholder={t('fullNamePlaceholder')}
              />
            </div>

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
              <label
                htmlFor="password"
                className="block text-sm font-medium text-navy-700"
              >
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
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
                  {t('signUpLoading')}
                </>
              ) : (
                t('submitSignUp')
              )}
            </button>
          </div>
        </form>

        <TransitionOverlay
          show={redirecting}
          label={t('signUpTransition')}
        />
      </div>
    </AuthShell>
  );
}
