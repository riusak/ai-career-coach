'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, FileText, Target, Video, X } from 'lucide-react';

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
 * First-connection welcome modal for newly registered users.
 * Clean, sober, executive aesthetic without cartoonish vector illustrations or bright AI clichés.
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Subtle accent border on top */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-700 via-orange-500/60 to-slate-700" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          title={t('welcomeClose')}
          aria-label={t('welcomeClose')}
          className="absolute right-4 top-4 z-20 cursor-pointer rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Section */}
        <div className="p-6 sm:p-8 pb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300 mb-3">
            <span>{t('welcomeBadge')}</span>
          </div>

          <h2
            id="welcome-title"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
          >
            {locale === 'fr' ? (
              <>Bienvenue sur ForPro AI, <span className="text-orange-400">{firstName}</span></>
            ) : locale === 'de' ? (
              <>Willkommen bei ForPro AI, <span className="text-orange-400">{firstName}</span></>
            ) : (
              <>Welcome to ForPro AI, <span className="text-orange-400">{firstName}</span></>
            )}
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            {t('welcomeSubtitle')}
          </p>
        </div>

        {/* 3 Core Pillars in a clean, structured list */}
        <div className="px-6 sm:px-8 py-2 space-y-2.5">
          {/* Pillar 1: ATS Audit */}
          <div className="flex items-start gap-3.5 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3.5 transition-colors hover:bg-slate-950/70">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-200 border border-slate-700/60">
              <FileText className="h-4 w-4 text-orange-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-white">
                {t('welcomeFeature1Title')}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {t('welcomeFeature1Desc')}
              </p>
            </div>
          </div>

          {/* Pillar 2: Job Matching */}
          <div className="flex items-start gap-3.5 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3.5 transition-colors hover:bg-slate-950/70">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-200 border border-slate-700/60">
              <Target className="h-4 w-4 text-orange-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-white">
                {t('welcomeFeature2Title')}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {t('welcomeFeature2Desc')}
              </p>
            </div>
          </div>

          {/* Pillar 3: Vocal STAR Coach */}
          <div className="flex items-start gap-3.5 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3.5 transition-colors hover:bg-slate-950/70">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-200 border border-slate-700/60">
              <Video className="h-4 w-4 text-orange-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-white">
                {t('welcomeFeature3Title')}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {t('welcomeFeature3Desc')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-4 border-t border-slate-800 bg-slate-950/60 px-6 py-4 sm:px-8 sm:py-5">
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Secondary actions */}
            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap justify-center sm:justify-start">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer text-slate-400 transition-colors hover:text-white font-medium"
              >
                {t('welcomeExplore')}
              </button>
              <span className="text-slate-700">•</span>
              <button
                type="button"
                onClick={onImportProfile}
                className="cursor-pointer text-orange-400 transition-colors hover:text-orange-300 font-medium"
              >
                {t('welcomeImportProfile')}
              </button>
              <span className="text-slate-700">•</span>
              <button
                type="button"
                onClick={onShowHowItWorks}
                className="cursor-pointer text-slate-400 transition-colors hover:text-white font-medium"
              >
                {t('welcomeHowLink')}
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              id="start-tour-from-welcome-btn"
              onClick={onStartTour}
              className="group flex w-full sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98]"
            >
              <span>{t('welcomeStartTour')}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}