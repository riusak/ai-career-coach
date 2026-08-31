'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { classifyAuthError, type AuthErrorClassification } from '@/lib/supabase/auth-errors';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Tracks the classified error kind so the UI can offer the right next step
  // when Supabase failed to deliver the confirmation email (SMTP issue).
  const [errorKind, setErrorKind] = useState<AuthErrorClassification | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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
        router.push('/dashboard');
        router.refresh();
        return;
      }

      // Email confirmation enabled: a 6-digit OTP code was sent. Route to the
      // dedicated verification page.
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred during registration.';
      setError(message);
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
            Create your account
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-gold-700 underline transition-colors hover:text-gold-800"
            >
              Sign in
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
                Go to the verification page to enter or resend the code
              </Link>
            )}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4 rounded-md">
            <div>
              <label
                htmlFor="full-name"
                className="block text-sm font-medium text-slate-700"
              >
                Full Name
              </label>
              <input
                id="full-name"
                name="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600 disabled:opacity-50"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label
                htmlFor="email-address"
                className="block text-sm font-medium text-slate-700"
              >
                Email address
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
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600 disabled:opacity-50"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
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
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600 disabled:opacity-50"
                placeholder="•••••••• (min. 6 characters)"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
