'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Conversion modal gating the Quick Test advanced features: shown when a
 * visitor interacts with locked (members-only) results. Purely presentational
 * — account creation still happens on /signup.
 */

interface SignupModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SignupModal({ open, onClose }: SignupModalProps) {
  const t = useTranslations('landing');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-orange-200 bg-white p-8 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label={tCommon('close')}
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-5 w-5"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2
          id="signup-modal-title"
          className="mt-4 text-xl font-bold tracking-tight text-slate-900"
        >
          {t('unlockButton')}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {tAuth('signUpSubtitle')}
        </p>

        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <CheckBullet />
            {t('unlockFull')}
          </li>
          <li className="flex items-center gap-2">
            <CheckBullet />
            {t('unlockMatching')}
          </li>
          <li className="flex items-center gap-2">
            <CheckBullet />
            {t('unlockLibrary')}
          </li>
        </ul>

        <Link
          href="/signup"
          className="mt-6 block rounded-lg bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-center text-sm font-bold text-slate-950 shadow-md transition-all hover:from-orange-500 hover:to-orange-600"
        >
          {tAuth('submitSignUp')}
        </Link>
        <p className="mt-3 text-center text-xs text-slate-500">
          {tAuth('haveAccount')}{' '}
          <Link href="/login" className="font-medium text-orange-700 underline">
            {tAuth('submitSignIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}

function CheckBullet() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0 text-orange-600"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}