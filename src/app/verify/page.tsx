'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import ErrorState from '@/components/ui/ErrorState';
import SuccessBanner from '@/components/ui/SuccessBanner';
import { classifyAuthError } from '@/lib/supabase/auth-errors';

/**
 * Email verification page — the visitor types the 6-digit OTP code sent by
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

function mapOtpError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('expired') || normalized.includes('invalid')) {
    return 'This code is invalid or has expired. Request a new code below and try again.';
  }
  return message;
}

function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const email = (searchParams.get('email') ?? '').trim();
  const router = useRouter();
  const supabase = createClient();

  const [digits, setDigits] = useState<string[]>(() => Array<string>(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Auto-focus the first box on mount.
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // If a session already exists (e.g. the visitor clicked the confirmation
  // link of the default email template, which auto-confirms), skip the form:
  // the email is already verified — route to /login with the success banner.
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
        // Not signed in — normal path, show the code form.
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
      setError('No email to verify. Restart the sign-up flow to receive a new code.');
      return;
    }
    const token = digits.join('');
    if (token.length !== CODE_LENGTH) {
      setError(`Please enter the ${CODE_LENGTH}-digit code from your email.`);
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
        setError(mapOtpError(verifyError.message));
        return;
      }

      // Verification succeeded — discard the auto-created session so the
      // auth proxy does not bounce the user away from /login.
      await supabase.auth.signOut();
      router.replace('/login?verified=1');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while verifying the code.'
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
        setError(info.kind === 'generic' ? mapOtpError(resendError.message) : info.message);
        return;
      }
      setInfo('A new 6-digit code has been sent to your inbox.');
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setDigits(Array<string>(CODE_LENGTH).fill(''));
      focusDigit(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while resending the code.'
      );
    }
  };

  // Missing email param: the user probably landed on /verify directly.
  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
          <ErrorState
            title="No email to verify"
            description="This page needs the email you registered with. Create your account to receive a 6-digit verification code."
          >
            <Link
              href="/signup"
              className="rounded-md bg-gradient-to-r from-gold-400 to-gold-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600"
            >
              Go to sign up
            </Link>
          </ErrorState>
        </div>
      </div>
    );
  }

  const token = digits.join('');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div>
          <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-gradient-to-r from-gold-400 to-gold-600" />
          <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">
            Verify your email
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            We sent a 6-digit code to{' '}
            <strong className="font-semibold text-slate-900">{email}</strong>. Enter it below to
            activate your account.
          </p>
          <p className="mt-1 text-center text-xs text-slate-500">
            No code in the email? Click the confirmation link instead — your account gets
            confirmed automatically.
          </p>
        </div>

        {error && <ErrorState title="Verification failed" description={error} />}

        {info && <SuccessBanner title="Code sent" description={info} />}

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
                aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                maxLength={CODE_LENGTH}
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                disabled={loading}
                className="h-12 w-11 rounded-md border border-slate-300 bg-white text-center text-lg font-semibold text-slate-900 shadow-sm focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600 disabled:opacity-50"
              />
            ))}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || token.length !== CODE_LENGTH}
              className="flex w-full justify-center rounded-md bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify my email'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-600">
          Didn&apos;t receive it?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendIn > 0 || loading}
            className="font-medium text-gold-700 underline transition-colors hover:text-gold-800 disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
          >
            {resendIn > 0 ? `Resend a new code (${resendIn}s)` : 'Resend a new code'}
          </button>
        </p>

        <p className="text-center text-sm text-slate-600">
          Wrong email?{' '}
          <Link
            href="/signup"
            className="font-medium text-gold-700 underline transition-colors hover:text-gold-800"
          >
            Start over
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-200 border-t-gold-600" />
        </div>
      }
    >
      <VerifyOtpForm />
    </Suspense>
  );
}
