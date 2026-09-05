'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, GitBranch, Target, Upload, Workflow, X } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

/**
 * « Comment fonctionne la plateforme ? » — methodology modal migrated from the
 * template. Get-started propagates to the parent so it can route the user to
 * the right first action (upload CV / complete profile).
 */
export default function HowItWorksModal({ isOpen, onClose, onGetStarted }: HowItWorksModalProps) {
  const t = useTranslations('onboarding');

  if (!isOpen) {
    return null;
  }

  const steps = [
    {
      step: '01',
      title: t('howStep1Title'),
      desc: t('howStep1Desc'),
      Icon: Upload,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      step: '02',
      title: t('howStep2Title'),
      desc: t('howStep2Desc'),
      Icon: GitBranch,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    {
      step: '03',
      title: t('howStep3Title'),
      desc: t('howStep3Desc'),
      Icon: Target,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
  ];

  return (
    <div
      id="how-it-works-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="how-it-works-modal"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('howClose')}
          className="absolute right-4 top-4 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-md bg-amber-500/20 p-1 text-amber-700">
            <Workflow className="h-4 w-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            {t('howKicker')}
          </span>
        </div>

        <h3 id="how-it-works-title" className="mb-1 text-xl font-black text-slate-900">
          {t('howTitle')}
        </h3>
        <p className="mb-6 text-xs text-slate-500">{t('howSubtitle')}</p>

        <div className="mb-6 space-y-4">
          {steps.map(({ step, title, desc, Icon, color }) => (
            <div
              key={step}
              className="flex items-start gap-3.5 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 transition-colors hover:bg-slate-100/60"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-wider text-slate-400">{step}</span>
                  <h4 className="text-xs font-bold text-slate-900">{title}</h4>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900"
          >
            {t('howClose')}
          </button>
          <button
            type="button"
            onClick={onGetStarted}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-slate-800"
          >
            <span>{t('howGetStarted')}</span>
            <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
          </button>
        </div>
      </div>
    </div>
  );
}