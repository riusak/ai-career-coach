'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircle2, ChevronRight, Circle, FileUp, X } from 'lucide-react';

interface OnboardingAssistantProps {
  /** True when the user already uploaded at least one CV. */
  hasCv: boolean;
  /** True when the profile carries identity + sections (non-empty state). */
  profileComplete: boolean;
  /** True when at least one CV has a completed ATS analysis. */
  hasAnalysis: boolean;
  /** Opens the smart profile import modal. */
  onImport: () => void;
  /** Marks the onboarding as completed (DB + cookie) and hides the widget. */
  onComplete: () => void;
}

/**
 * Persistent minimal onboarding helper — the non-intrusive replacement for the
 * full-screen wizard once it has been dismissed or completed. Lists the four
 * kick-start steps with live completion ticks, a one-click « Smart Import »
 * entry point and a progress bar. Dismissal is session-only (client state);
 * « Tout est clair » persists the completion flag through the server action.
 */
export default function OnboardingAssistant({
  hasCv,
  profileComplete,
  hasAnalysis,
  onImport,
  onComplete,
}: OnboardingAssistantProps) {
  const t = useTranslations('onboarding');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const steps = [
    { key: 'cv', done: hasCv, href: '/dashboard/cvs' },
    { key: 'profile', done: profileComplete, href: '/dashboard/profile' },
    { key: 'analysis', done: hasAnalysis, href: '/dashboard/cvs' },
    { key: 'matching', done: false, href: '/dashboard/matching' },
  ] as const;

  const doneCount = steps.filter((step) => step.done).length;
  const progress = Math.round((doneCount / steps.length) * 100);

  return (
    <aside
      id="onboarding-assistant"
      className="overflow-hidden rounded-3xl border border-brand-200/70 bg-gradient-to-br from-[#0B1528] via-[#101E35] to-[#1A2A44] p-5 text-white shadow-md sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold tracking-tight sm:text-base">{t('assistantTitle')}</h3>
          <p className="mt-1 max-w-md text-[11px] leading-relaxed text-slate-300">
            {t('assistantDesc')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t('assistantDismiss')}
          title={t('assistantDismiss')}
          className="shrink-0 cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide">
          <span className="text-slate-400">{t('assistantProgress')}</span>
          <span className="text-[#FFA040]">{progress}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#FF7A00] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onImport}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FF7A00] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#FF9500] active:scale-[0.98]"
        >
          <FileUp className="h-3.5 w-3.5" />
          {t('assistantImportCta')}
        </button>

        <ul className="space-y-1">
          {steps.map((step) => (
            <li key={step.key}>
              <Link
                href={step.href}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors hover:bg-white/5"
              >
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover:text-slate-300" />
                )}
                <span className={step.done ? 'text-slate-400' : 'text-slate-200'}>
                  {t(`assistantStep.${step.key}`)}
                </span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-600 transition-colors group-hover:text-[#FFA040]" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onComplete}
        className="mt-3 w-full cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
      >
        {t('assistantComplete')}
      </button>
    </aside>
  );
}