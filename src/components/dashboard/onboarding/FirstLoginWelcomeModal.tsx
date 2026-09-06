'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, FileUp, Target, Video, X, Zap } from 'lucide-react';
import ProfessionalTeamIllustration from './ProfessionalTeamIllustration';

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
 *
 * ✓ Centered, wide modal dialog with responsive adaptation (from smartphones to 4K displays).
 * ✓ Includes modern vector illustrations of professional team.
 * ✓ Personalized welcome greeting using the user's first name.
 * ✓ Clear, high-converting call-to-action to launch the guided tour or explore freely.
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/75 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-700/60 bg-gradient-to-br from-[#071120] via-[#0D1C34] to-[#122340] text-white shadow-2xl shadow-black/80 flex flex-col scrollbar-thin scrollbar-thumb-slate-700/50"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Top vibrant orange accent glow */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#FF7A00] to-transparent z-10" />

        {/* Ambient background glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#FF7A00]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#1E3A8A]/25 blur-3xl"
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          title={t('welcomeClose')}
          aria-label={t('welcomeClose')}
          className="absolute right-4 top-4 z-20 cursor-pointer rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Section */}
        <div className="px-6 pt-6 sm:px-10 sm:pt-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FF7A00]/30 bg-[#FF7A00]/10 px-3.5 py-1 text-xs font-bold tracking-wide text-[#FFA040] shadow-sm mb-3">
            <Zap className="h-3.5 w-3.5 text-[#FF7A00]" />
            <span>{t('welcomeBadge')}</span>
          </div>

          <h2
            id="welcome-title"
            className="text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl"
          >
            {locale === 'fr' ? (
              <>
                Bienvenue dans l&apos;aventure,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] via-[#FF9500] to-[#FFB347]">
                  {firstName}
                </span>
              </>
            ) : locale === 'de' ? (
              <>
                Willkommen bei ForPro AI,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] via-[#FF9500] to-[#FFB347]">
                  {firstName}
                </span>
              </>
            ) : (
              <>
                Welcome aboard,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] via-[#FF9500] to-[#FFB347]">
                  {firstName}
                </span>
              </>
            )}
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-300">
            {t('welcomeSubtitle')}
          </p>
        </div>

        {/* Hero Vector Illustration of Professionals */}
        <div className="px-4 sm:px-8 py-2 relative z-10">
          <ProfessionalTeamIllustration className="w-full" />
        </div>

        {/* 3 Key Pillars / Feature Preview */}
        <div className="px-6 sm:px-10 pb-4 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-slate-700/50 bg-white/[0.03] p-3.5 transition-all hover:border-[#FF7A00]/40 hover:bg-white/[0.05]">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30">
                  <FileUp className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-white">
                  {t('welcomeFeature1Title')}
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {t('welcomeFeature1Desc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-slate-700/50 bg-white/[0.03] p-3.5 transition-all hover:border-[#FF7A00]/40 hover:bg-white/[0.05]">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF7A00]/15 text-[#FF7A00] ring-1 ring-[#FF7A00]/30">
                  <Target className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-white">
                  {t('welcomeFeature2Title')}
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {t('welcomeFeature2Desc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-slate-700/50 bg-white/[0.03] p-3.5 transition-all hover:border-[#FF7A00]/40 hover:bg-white/[0.05]">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30">
                  <Video className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-white">
                  {t('welcomeFeature3Title')}
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {t('welcomeFeature3Desc')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-auto border-t border-slate-800/80 bg-black/20 px-6 py-4 sm:px-10 sm:py-5 relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Quick shortcuts on the left */}
            <div className="flex items-center gap-3 text-xs text-slate-400 order-2 sm:order-1 flex-wrap">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer text-slate-400 transition-colors hover:text-white font-medium"
              >
                {t('welcomeExplore')}
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={onImportProfile}
                className="cursor-pointer text-[#FFA040] transition-colors hover:text-white font-medium"
              >
                {t('welcomeImportProfile')}
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={onShowHowItWorks}
                className="cursor-pointer text-slate-400 transition-colors hover:text-white font-medium"
              >
                {t('welcomeHowLink')}
              </button>
            </div>

            {/* Primary Action Button on the right */}
            <button
              type="button"
              id="start-tour-from-welcome-btn"
              onClick={onStartTour}
              className="group flex w-full sm:w-auto cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF9500] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:from-[#FF8C00] hover:to-[#FFA500] hover:shadow-orange-500/40 active:scale-[0.98] order-1 sm:order-2"
            >
              <span>{t('welcomeStartTour')}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}