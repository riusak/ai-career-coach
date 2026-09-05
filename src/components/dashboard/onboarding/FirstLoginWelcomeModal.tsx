'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Compass, X } from 'lucide-react';

interface FirstLoginWelcomeModalProps {
  isOpen: boolean;
  /** Full name of the authenticated user (first name is derived for the title). */
  userName: string;
  onClose: () => void;
  onStartTour: () => void;
  onShowHowItWorks: () => void;
  /** Opens the smart profile import (CV / LinkedIn PDF). */
  onImportProfile: () => void;
}

/**
 * First-connection welcome modal, migrated from the template. Data-backed:
 * the title uses the real user's first name, and every label flows through
 * next-intl (fr/en/de). Persistence of "already seen" is handled by the
 * parent via the `forpro_onboarding_seen` cookie (see onboarding-actions).
 */
export default function FirstLoginWelcomeModal({
  isOpen,
  userName,
  onClose,
  onStartTour,
  onShowHowItWorks,
  onImportProfile,
}: FirstLoginWelcomeModalProps) {
  const t = useTranslations('onboarding');
  const locale = useLocale();

  if (!isOpen) {
    return null;
  }

  const firstName =
    userName.trim().split(/\s+/)[0] || (locale === 'fr' ? 'Bienvenue' : 'Welcome');

  return (
    <div
      id="first-login-welcome-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Top accent header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1528] via-[#101E35] to-[#1A2A44] p-7 text-white sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-500/20 blur-2xl" />

          <button
            type="button"
            onClick={onClose}
            title={t('welcomeClose')}
            aria-label={t('welcomeClose')}
            className="absolute right-5 top-5 cursor-pointer rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-[#FFA040]">
            <Compass className="h-3.5 w-3.5 text-[#FFA040]" />
            <span>{t('welcomeBadge')}</span>
          </div>

          <h2 id="welcome-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {t('welcomeTitle', { name: firstName })}
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{t('welcomeSubtitle')}</p>
        </div>

        {/* Body */}
        <div className="space-y-6 p-7 sm:p-8">
          <div className="flex items-start gap-4 rounded-2xl border border-orange-200/70 bg-[#FFF9F3] p-4">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10">
              <Compass className="h-5 w-5 text-brand-500" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">{t('welcomeTourTitle')}</h4>
              <p className="text-xs leading-relaxed text-slate-600">{t('welcomeTourDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            {[
              { stat: t('welcomeStatMenus'), label: t('welcomeStatMenusLabel') },
              { stat: t('welcomeStatTime'), label: t('welcomeStatTimeLabel') },
              { stat: t('welcomeStatSteps'), label: t('welcomeStatStepsLabel') },
            ].map(({ stat, label }) => (
              <div key={stat} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-bold text-slate-900">{stat}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
            <div className="flex flex-col gap-1 text-left">
              <button
                type="button"
                onClick={onClose}
                className="w-full cursor-pointer rounded-xl px-4 py-2.5 text-center text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:w-auto"
              >
                {t('welcomeExplore')}
              </button>
              <button
                type="button"
                onClick={onImportProfile}
                className="w-full cursor-pointer rounded-xl px-4 py-1 text-center text-[11px] font-medium text-orange-300 transition-colors hover:text-[#FFA040] sm:w-auto"
              >
                {t('welcomeImportProfile')}
              </button>
              <button
                type="button"
                onClick={onShowHowItWorks}
                className="w-full cursor-pointer rounded-xl px-4 py-1 text-center text-[11px] font-medium text-brand-500 transition-colors hover:text-brand-600 sm:w-auto"
              >
                {t('welcomeHowLink')}
              </button>
            </div>

            <button
              type="button"
              id="start-tour-from-welcome-btn"
              onClick={onStartTour}
              className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0B1528] px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-brand-500 active:scale-[0.98] sm:w-auto"
            >
              <span>{t('welcomeStartTour')}</span>
              <ArrowRight className="h-4 w-4 text-orange-300 transition-all group-hover:translate-x-0.5 group-hover:text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}