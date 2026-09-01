'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import BrandLoader from '@/components/ui/BrandLoader';
import ErrorState from '@/components/ui/ErrorState';
import SuccessBanner from '@/components/ui/SuccessBanner';
import TransitionOverlay from '@/components/ui/TransitionOverlay';
import { classifyAuthError } from '@/lib/supabase/auth-errors';

/**
 * Email verification page â€” the visitor types the 6-digit OTP code sent by
 * Supabase Auth at signup ("Confirm signup" email template must render
 * {{ .Token }} so the code appears in the message body).
 *
 * On success the freshly-created session is deliberately discarded and the
 * user is routed to /login?verified=1: keeping the session would make the
 * auth proxy redirect them to /dashboard instead of showing the requested
 * "please sign in" confirmation.
 */

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

function isInvalidOrExpired(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('expired') || normalized.includes('invalid');
}

function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const email = (searchParams.get('email') ?? '').trim();
  const t = useTranslations('auth');
  const router = useRouter();
  const supabase = createClient();

  const [digits, setDigits] = useState<string[]>(() => Array<string>(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Branded route-transition overlay while navigating to /login?verified=1.
  const [redirecting, setRedirecting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Auto-focus the first box on mount.
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // If a session already exists (e.g. the visitor clicked the confirmation
  // link of the default email template, which auto-confirms), skip the form:
  // the email is already verified â€” route to /login with the success banner.
  useEffect(() => {
    let cancelled = false;
    const checkExistingSession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled && user) {
          await supabase.auth.signOut();
          router.replace('/login?verified=1');
        }
      } catch {
        // Not signed in â€” normal path, show the code form.
      }
    };
    void checkExistingSession();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend cooldown ticker.
  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }
    const timer = setInterval(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const focusDigit = (index: number) => {
    const clamped = Math.min(Math.max(index, 0), CODE_LENGTH - 1);
    const input = inputRefs.current[clamped];
    input?.focus();
    input?.select();
  };

  /** Single digit typed: store it and advance. Multiple chars: fill forward. */
  const handleChange = (index: number, raw: string) => {
    const chars = raw.replace(/\D/g, '');
    if (chars.length === 0) {
      setDigits(digits.map((digit, i) => (i === index ? '' : digit)));
      return;
    }
    if (chars.length === 1) {
      setDigits(digits.map((digit, i) => (i === index ? chars : digit)));
      focusDigit(index + 1);
      return;
    }
    const next = [...digits];
    for (let offset = 0; offset < chars.length && index + offset < CODE_LENGTH; offset += 1) {
      next[index + offset] = chars[offset];
    }
    setDigits(next);
    focusDigit(index + chars.length);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        setDigits(digits.map((digit, i) => (i === index ? '' : digit)));
      } else {
        focusDigit(index - 1);
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusDigit(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusDigit(index + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, CODE_LENGTH);
    if (pasted.length === 0) {
      return;
    }
    const next = Array<string>(CODE_LENGTH).fill('');
    pasted.split('').forEach((char, index) => {
      next[index] = char;
    });
    setDigits(next);
    focusDigit(pasted.length);
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!email) {
      setError(t('verifyNoEmailError'));
      return;
    }
    const token = digits.join('');
    if (token.length !== CODE_LENGTH) {
      setError(t('verifyEnterCodeError', { length: CODE_LENGTH }));
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (verifyError) {
        setError(isInvalidOrExpired(verifyError.message) ? t('verifyInvalidCode') : verifyError.message);
        return;
      }

      // Verification succeeded â€” discard the auto-created session so the
      // auth proxy does not bounce the user away from /login.
      await supabase.auth.signOut();
      setRedirecting(true);
      router.replace('/login?verified=1');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('errorUnexpectedVerify')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendIn > 0 || loading) {
      return;
    }
    setError(null);
    setInfo(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) {
        const info = classifyAuthError(resendError.message);
        setError(info.kind === 'generic' ? (isInvalidOrExpired(resendError.message) ? t('verifyInvalidCode') : resendError.message) : info.message);
        return;
      }
      setInfo(t('verifySentDesc'));
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setDigits(Array<string>(CODE_LENGTH).fill(''));
      focusDigit(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('errorUnexpectedResend')
      );
    }
  };

  // Missing email param: the user probably landed on /verify directly.
  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-navy-100 bg-white p-8 shadow-xl shadow-navy-900/10">
          <ErrorState
            title={t('verifyNoEmailTitle')}
            description={t('verifyNoEmailDesc')}
          >
            <Link
              href="/signup"
              className="rounded-md bg-gradient-to-r from-orange-400 to-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:from-orange-500 hover:to-orange-600"
            >
              {t('verifyGoToSignup')}
            </Link>
          </ErrorState>
        </div>
      </div>
    );
  }

  const token = digits.join('');

  return (
    <AuthShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-center text-2xl font-bold tracking-tight text-navy-900">
            {t('verifyTitle')}
          </h1>
          <p className="mt-2 text-center text-sm text-navy-600">
            {t('verifySubtitlePrefix')}{' '}
            <strong className="font-semibold text-navy-900">{email}</strong>. {t('verifySubtitleSuffix')}
          </p>
          <p className="mt-1 text-center text-xs text-navy-500">
            {t('verifyNoCodeHint')}
          </p>
        </div>

        {error && <ErrorState title={t('verifyErrorTitle')} description={error} />}

        {info && <SuccessBanner title={t('verifySuccessTitle')} description={info} />}

        <form className="space-y-6" onSubmit={handleVerify}>
          <div className="flex justify-center gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label={t('digitLabel', { index: index + 1, length: CODE_LENGTH })}
                maxLength={CODE_LENGTH}
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                disabled={loading}
                className="h-12 w-11 rounded-md border border-navy-200 bg-white text-center text-lg font-semibold text-navy-900 shadow-sm focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600 disabled:opacity-50"
              />
            ))}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || redirecting || token.length !== CODE_LENGTH}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading || redirecting ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                  {t('verifyLoading')}
                </>
              ) : (
                t('submitVerify')
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-navy-600">
          {t('didNotReceive')}{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendIn > 0 || loading}
            className="font-medium text-orange-700 underline transition-colors hover:text-orange-800 disabled:cursor-not-allowed disabled:text-navy-400 disabled:no-underline"
          >
            {resendIn > 0 ? t('resendCooldown', { seconds: resendIn }) : t('resendCode')}
          </button>
        </p>

        <p className="text-center text-sm text-navy-600">
          {t('wrongEmail')}{' '}
          <Link
            href="/signup"
            className="font-medium text-orange-700 underline transition-colors hover:text-orange-800"
          >
            {t('startOver')}
          </Link>
        </p>

        <TransitionOverlay
          show={redirecting}
          label={t('verifyTransition')}
        />
      </div>
    </AuthShell>
  );
}

export default function VerifyPage() {
  const tCommon = useTranslations('common');
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-brand-bg">
          <BrandLoader size={64} label={tCommon('loading')} />
        </div>
      }
    >
      <VerifyOtpForm />
    </Suspense>
  );
}
