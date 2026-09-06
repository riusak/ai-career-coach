'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ArrowRight, Bell, Compass, Crown, Globe, MessageSquare } from 'lucide-react';
import type { DashboardUser } from '@/types/dashboard';
import { useLocaleSwitcher } from '@/i18n/provider';
import { startDashboardTour } from '@/lib/dashboard/tour-events';
import FeedbackModal from '@/components/dashboard/FeedbackModal';

interface DashboardHeaderProps {
  user: DashboardUser;
}

/**
 * « Tableau de bord » top header — exact port of the template's Header.tsx:
 * welcome area, language toggle (FR/EN), profile-strength ring widget, upgrade
 * CTA and notification bell, plus the dedicated mobile layout.
 *
 * Chart 7: the persistent « Visite guidée » trigger re-launches the global
 * dashboard tour at any time — even long after onboarding was completed.
 */
export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const locale = useLocale();
  const { setLocale } = useLocaleSwitcher();
  const router = useRouter();
  const pathname = usePathname();
  const isFrench = locale !== 'en';
  const firstName = user.name ? user.name.split(' ')[0] : 'ForPro';
  const score = user.isEmptyState ? 0 : user.profileStrength || 0;
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleStartTour = () => startDashboardTour(pathname, (href) => router.push(href));

  return (
    <header
      id="dashboard-header"
      className="w-full bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 transition-all"
    >
      <div className="max-w-[1600px] w-full mx-auto">
        {/* Desktop & Tablet Layout (>= sm) */}
        <div className="hidden sm:flex sm:items-center sm:justify-between gap-4">
          {/* Left Welcome Area */}
          <div>
            <h1 className="text-2xl sm:text-[26px] lg:text-[28px] font-black tracking-tight text-slate-900 flex items-center gap-2">
              {user.isEmptyState ? (
                <span>{isFrench ? 'Bienvenue sur ForPro AI' : 'Welcome to ForPro AI'}</span>
              ) : (
                <span>
                  {isFrench
                    ? `Bienvenue, ${firstName} !`
                    : `Welcome back, ${firstName}!`}
                </span>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1 max-w-2xl leading-normal">
              {isFrench
                ? "Construisons votre meilleur avenir professionnel avec l'IA."
                : "Let's build your best career future with AI."}
            </p>
          </div>

          {/* Right Controls (Desktop & Tablet) */}
          <div className="flex items-center gap-3 sm:gap-4 md:gap-5 shrink-0">
            {/* Language Toggle */}
            <button
              id="lang-toggle-btn"
              onClick={() => setLocale(isFrench ? 'en' : 'fr')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-all cursor-pointer"
              title="Toggle Language (EN / FR)"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isFrench ? 'FR' : 'EN'}</span>
            </button>

            {/* Guided tour replay (persistent trigger, works anytime). */}
            <button
              id="guided-tour-btn"
              type="button"
              onClick={handleStartTour}
              title={isFrench ? 'Relancer le tour global du tableau de bord' : 'Replay the global dashboard tour'}
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs transition-all hover:bg-amber-100 cursor-pointer"
            >
              <Compass className="h-3.5 w-3.5 text-[#FF7A00]" />
              <span>{isFrench ? 'Visite guidée' : 'Guided tour'}</span>
            </button>

            {/* Support & Feedback modal trigger */}
            <button
              id="support-feedback-btn"
              type="button"
              onClick={() => setFeedbackOpen(true)}
              title={isFrench ? 'Contacter le support / Envoyer un retour' : 'Contact support / Send feedback'}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 text-[#FF7A00]" />
              <span>{isFrench ? 'Support / Avis' : 'Feedback'}</span>
            </button>

            {/* Upgrade Button — redirects to pricing */}
            <Link
              href="/dashboard/pricing"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B1528] text-white font-bold text-xs sm:text-sm shadow-xs cursor-pointer"
            >
              <Crown className="w-4 h-4 text-[#FF7A00] fill-[#FF7A00]" />
              <span>{isFrench ? 'Passer Pro' : 'Upgrade'}</span>
            </Link>

            {/* Notifications Bell */}
            <button
              id="notifications-btn"
              onClick={() => {}}
              className="p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 rounded-full transition-colors relative cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 stroke-[1.8]" />
            </button>

            {/* Profile Strength Widget */}
            <div
              id="profile-strength-widget"
              className="flex items-center gap-3 pl-1"
            >
              {/* Circular Gauge */}
              <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                <svg className="w-11 h-11 -rotate-90">
                  <circle
                    cx="22"
                    cy="22"
                    r="17"
                    stroke="#E2E8F0"
                    strokeWidth="3.5"
                    fill="none"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r="17"
                    stroke={user.isEmptyState ? '#CBD5E1' : '#FF7A00'}
                    strokeWidth="3.5"
                    strokeDasharray={2 * Math.PI * 17}
                    strokeDashoffset={2 * Math.PI * 17 * (1 - score / 100)}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-700"
                  />
                </svg>
                <span className="absolute text-[11px] font-bold text-slate-800">
                  {score}%
                </span>
              </div>

              <div className="text-left">
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug whitespace-nowrap">
                  {isFrench ? 'Force du profil' : 'Profile Strength'}
                </p>
                <Link
                  href="/dashboard/profile"
                  className="text-[11px] sm:text-xs text-slate-500 hover:text-[#FF7A00] font-normal flex items-center gap-1 mt-0.5 group whitespace-nowrap cursor-pointer transition-colors"
                >
                  <span>{isFrench ? 'Compléter votre profil' : 'Complete your profile'}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-slate-400 group-hover:text-[#FF7A00]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
{/* Mobile Layout (< sm) */}
        <div className="sm:hidden flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900 truncate">
              {user.isEmptyState ? (
                <span>{isFrench ? 'Bienvenue' : 'Welcome'}</span>
              ) : (
                <span>
                  {isFrench ? `Bienvenue, ${firstName} !` : `Welcome back, ${firstName}!`}
                </span>
              )}
            </h1>

            <div className="flex items-center gap-1 shrink-0">
              <button
                id="mobile-lang-toggle-btn"
                onClick={() => setLocale(isFrench ? 'en' : 'fr')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 active:bg-slate-200 transition-colors cursor-pointer"
                title="Toggle Language"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isFrench ? 'FR' : 'EN'}</span>
              </button>

              {/* Guided tour replay (mobile). */}
              <button
                id="mobile-guided-tour-btn"
                type="button"
                onClick={handleStartTour}
                title={isFrench ? 'Relancer le tour global du tableau de bord' : 'Replay the global dashboard tour'}
                className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 transition-all hover:bg-amber-100 cursor-pointer"
              >
                <Compass className="h-3.5 w-3.5 text-[#FF7A00]" />
                <span>{isFrench ? 'Visite guidée' : 'Guided tour'}</span>
              </button>

              <button
                id="mobile-notifications-btn"
                onClick={() => {}}
                className="p-1.5 text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-normal leading-relaxed">
            {isFrench
              ? "Construisons votre meilleur avenir professionnel avec l'IA."
              : "Let's build your best career future with AI."}
          </p>

          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-200/70 mt-0.5">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 cursor-pointer group min-w-0"
            >
              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <svg className="w-9 h-9 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    stroke="#E2E8F0"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    stroke={user.isEmptyState ? '#CBD5E1' : '#FF7A00'}
                    strokeWidth="3"
                    strokeDasharray={2 * Math.PI * 14}
                    strokeDashoffset={2 * Math.PI * 14 * (1 - score / 100)}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-700"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-slate-800">
                  {score}%
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {isFrench ? 'Force du profil' : 'Profile Strength'}
                </p>
                <span className="text-[10px] text-slate-500 group-hover:text-[#FF7A00] font-medium flex items-center gap-0.5 mt-0.5 transition-colors">
                  <span className="truncate">{isFrench ? 'Compléter profil' : 'Complete profile'}</span>
                  <ArrowRight className="w-2.5 h-2.5 shrink-0 text-slate-400 group-hover:text-[#FF7A00]" />
                </span>
              </div>
            </Link>

            {/* Upgrade Button (mobile) — redirects to pricing */}
            <Link
              href="/dashboard/pricing"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B1528] text-white font-bold text-xs shadow-xs shrink-0 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-[#FF7A00] fill-[#FF7A00]" />
              <span>{isFrench ? 'Passer Pro' : 'Upgrade'}</span>
            </Link>
          </div>
        </div>
      </div>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </header>
  );
}