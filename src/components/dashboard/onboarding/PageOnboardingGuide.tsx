'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Lightbulb,
  X,
} from 'lucide-react';

export type PageGuideMenu = 'cvs' | 'matching' | 'mock' | 'timeline' | 'analytics';

interface PageOnboardingGuideProps {
  /** Which page guide to render (content comes from the `guides` i18n ns). */
  menu: PageGuideMenu;
  /** Hides the banner (backed by the page's usePageGuide state). */
  onDismiss: () => void;
  /** Optional « Tour Global » replay trigger (template footer button). */
  onStartGlobalTour?: () => void;
}

interface GuideStep {
  title: string;
  desc: string;
  badge?: string;
}

/**
 * Contextual page onboarding guide — Next.js port of the template's
 * MenuOnboardingGuide dark banner: tag pill, title + subtitle, three numbered
 * step cards, ForPro tip and the « Tour Global » / « J'ai compris » footer.
 * Collapsible (« Réduire »), dismissible, and revealed on demand through the
 * page header's PageGuideToggle — never rendered by default in daily usage.
 */
export default function PageOnboardingGuide({
  menu,
  onDismiss,
  onStartGlobalTour,
}: PageOnboardingGuideProps) {
  const t = useTranslations('guides');
  const [collapsed, setCollapsed] = useState(false);

  const rawSteps = t.raw(`${menu}.steps`);
  const steps: GuideStep[] = Array.isArray(rawSteps) ? (rawSteps as GuideStep[]) : [];

  return (
    <div
      id={`page-onboarding-guide-${menu}`}
      className="relative w-full overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-r from-slate-900 via-[#0B1528] to-[#132238] p-5 text-white shadow-lg transition-all duration-300 sm:p-6"
    >
      {/* Ambient brand auras (template decoration) */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#FF7A00]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide text-[#FFA040]">
            <Compass className="h-3.5 w-3.5 text-[#FFA040]" />
            <span>{t(`${menu}.tag`)}</span>
          </div>
          <h3 className="text-lg font-black tracking-tight text-white sm:text-xl">
            {t(`${menu}.title`)}
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            {t(`${menu}.subtitle`)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? t('expand') : t('collapse')}
            aria-expanded={!collapsed}
            className="flex cursor-pointer items-center gap-1 rounded-xl bg-white/10 px-2 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/20 sm:px-3"
          >
            {collapsed ? (
              <>
                <ChevronDown className="h-4 w-4" />
                <span className="hidden sm:inline">{t('showSteps')}</span>
              </>
            ) : (
              <>
                <ChevronUp className="h-4 w-4" />
                <span className="hidden sm:inline">{t('collapse')}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            title={t('dismissTitle')}
            aria-label={t('dismissTitle')}
            className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expandable steps section */}
      {!collapsed && (
        <div className="relative z-10 mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={`${menu}-step-${index}`}
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#FF7A00] text-xs font-black text-white shadow-xs">
                      {index + 1}
                    </span>
                    {step.badge && (
                      <span className="rounded-md border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-200">
                        {step.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="mb-1 text-sm font-bold text-white transition-colors group-hover:text-[#FFA040]">
                    {step.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-300">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pro tip + footer actions */}
          <div className="flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-2 sm:flex-row sm:items-center">
            <div className="flex max-w-2xl items-start gap-2 text-xs leading-relaxed text-slate-300">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#FFA040]" />
              <span>
                <strong className="font-bold text-white">{t('proTipLabel')}</strong>{' '}
                {t(`${menu}.proTip`)}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              {onStartGlobalTour && (
                <button
                  type="button"
                  onClick={onStartGlobalTour}
                  title={t('globalTourTitle')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/20"
                >
                  <Compass className="h-3.5 w-3.5 text-[#FFA040]" />
                  <span>{t('globalTour')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#FF7A00] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#E66E00]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{t('dismiss')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
