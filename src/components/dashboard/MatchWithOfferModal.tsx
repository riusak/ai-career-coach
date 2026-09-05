'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Job-matching interest-capture modal, moved from app/dashboard/resume/
 * during Phase 2 so the resume catalogue page (MatchOfferButton) and the
 * new dashboard quick actions / CV preview (controlled MatchOfferModal)
 * share the same implementation.
 */

interface MatchOfferModalProps {
  open: boolean;
  onClose: () => void;
  resumeName: string;
}

function SparklesIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3l1.9 5.4a2 2 0 0 0 1.3 1.3L20.5 12l-5.3 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.4a2 2 0 0 0-1.3-1.3L3.5 12l5.3-1.9a2 2 0 0 0 1.3-1.3z" />
    </svg>
  );
}

function SuccessIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m8.5 12.5 2.5 2.5 4.5-4.5" />
    </svg>
  );
}

/** Controlled variant — the trigger lives in the caller. */
export function MatchOfferModal({ open, onClose, resumeName }: MatchOfferModalProps) {
  const t = useTranslations('dashboard');
  const [submitted, setSubmitted] = useState(false);
  const [offerUrl, setOfferUrl] = useState('');
  const [offerText, setOfferText] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!submitted) return;
    const timers = setTimeout(() => {
      setSubmitted(false);
      setOfferUrl('');
      setOfferText('');
      setEmail('');
      onClose();
    }, 4500);
    return () => clearTimeout(timers);
  }, [submitted, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-offer-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        {submitted ? (
          <div className="p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <SuccessIcon />
            </span>
            <h3 className="mt-4 text-lg font-bold text-navy-900">{t('matchOfferSuccessTitle')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-600">{t('matchOfferSuccessDesc')}</p>
            <p className="mt-4 text-xs text-navy-400">{t('matchOfferAutoClose')}</p>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-orange-700">{t('matchOfferKicker')}</p>
                <h3 id="match-offer-title" className="mt-1 text-xl font-bold tracking-tight text-navy-900">
                  {t('matchOfferTitle')}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('closeMatchOffer')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-navy-600">
              {t('matchOfferDesc', { resume: resumeName })}
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-navy-700">{t('matchOfferUrlLabel')}</span>
                <input
                  type="url"
                  value={offerUrl}
                  onChange={(event) => setOfferUrl(event.target.value)}
                  placeholder={t('matchOfferUrlPlaceholder')}
                  className="mt-1.5 w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-navy-700">{t('matchOfferTextLabel')}</span>
                <textarea
                  value={offerText}
                  onChange={(event) => setOfferText(event.target.value)}
                  rows={4}
                  placeholder={t('matchOfferTextPlaceholder')}
                  className="mt-1.5 w-full resize-none rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-navy-700">{t('matchOfferEmailLabel')}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="vous@exemple.com"
                  className="mt-1.5 w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-sm text-xs leading-relaxed text-navy-500">{t('matchOfferFakeHint')}</p>
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-colors hover:bg-orange-600"
              >
                <SparklesIcon />
                {t('matchOfferSubmit')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MatchOfferButtonProps {
  resumeName: string;
  canMatch: boolean;
}

/** Self-triggering variant kept for the resume catalogue page. */
export default function MatchOfferButton({ resumeName, canMatch }: MatchOfferButtonProps) {
  const t = useTranslations('dashboard');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canMatch}
        title={canMatch ? undefined : t('matchNeedsParsing')}
        className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-navy-200 disabled:bg-navy-50 disabled:text-navy-400"
      >
        <SparklesIcon />
        {t('matchOfferCta')}
      </button>

      <MatchOfferModal open={open} onClose={() => setOpen(false)} resumeName={resumeName} />
    </>
  );
}
