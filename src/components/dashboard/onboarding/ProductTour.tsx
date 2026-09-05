'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  FileText,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  User,
  X,
  Zap,
} from 'lucide-react';

type TourPlacement = 'right' | 'top' | 'center';

interface TourStepDef {
  targetId: string;
  placement: TourPlacement;
  icon: typeof Compass;
}

/**
 * The seven steps target elements that ACTUALLY exist in the migrated
 * dashboard tree (the template targeted a 7-menu sidebar that our App Router
 * build does not have). Sidebar entries sit on the right; dashboard cards are
 * scrolled into view and their tooltip renders above; the final step centers.
 */
const STEP_DEFS: TourStepDef[] = [
  { targetId: 'nav-dashboard', placement: 'right', icon: LayoutDashboard },
  { targetId: 'nav-cvs', placement: 'right', icon: FileText },
  { targetId: 'nav-matching', placement: 'right', icon: User },
  { targetId: 'quick-actions-section', placement: 'top', icon: Zap },
  { targetId: 'career-roadmap-card', placement: 'top', icon: TrendingUp },
  { targetId: 'cv-section-card', placement: 'top', icon: FileText },
  { targetId: 'recent-activity-card', placement: 'top', icon: Activity },
];

interface ProductTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface TooltipRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
}

/**
 * Interactive spotlight product tour (migrated from the template ProductTour).
 * Blurs the workspace, highlights the current target with an orange beacon and
 * shows an i18n tooltip with prev/next/skip navigation.
 */
export default function ProductTour({ isActive, onComplete, onSkip }: ProductTourProps) {
  const t = useTranslations('onboarding');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TooltipRect | null>(null);
  const measuredTargetRef = useRef<string | null>(null);

  const currentStep = STEP_DEFS[currentStepIndex] ?? STEP_DEFS[0];
  const isFinalStep = currentStepIndex === STEP_DEFS.length - 1;

  const stepTitleKey = `tourStep${currentStepIndex + 1}Title` as const;
  const stepDescKey = `tourStep${currentStepIndex + 1}Desc` as const;
  const stepBadgeKey = `tourStep${currentStepIndex + 1}Badge` as const;

  const handleComplete = () => {
    setCurrentStepIndex(0);
    measuredTargetRef.current = null;
    onComplete();
  };

  const handleSkip = useCallback(() => {
    setCurrentStepIndex(0);
    measuredTargetRef.current = null;
    onSkip();
  }, [onSkip]);

  // Measure the highlighted target (deferred so no cascading setState-in-effect).
  useEffect(() => {
    if (!isActive) return;

    const updateRect = () => {
      const el = document.getElementById(currentStep.targetId);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
      });
    };

    // Scroll dashboard cards into the viewport once per step so their
    // spotlight is actually visible (sidebar entries are always visible).
    if (currentStep.placement === 'top' && measuredTargetRef.current !== currentStep.targetId) {
      measuredTargetRef.current = currentStep.targetId;
      document.getElementById(currentStep.targetId)?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    }

    const raf = requestAnimationFrame(updateRect);
    const lateTimeout = setTimeout(updateRect, 350);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(lateTimeout);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isActive, currentStep.targetId, currentStep.placement]);

// Keyboard navigation: Escape skips, arrows move between steps.
  useEffect(() => {
    if (!isActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleSkip();
      } else if (event.key === 'ArrowRight' && !isFinalStep) {
        event.preventDefault();
        setCurrentStepIndex((prev) => prev + 1);
      } else if (event.key === 'ArrowLeft' && currentStepIndex > 0) {
        event.preventDefault();
        setCurrentStepIndex((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActive, currentStepIndex, isFinalStep, handleSkip]);

  if (!isActive) {
    return null;
  }

  const hasSpotlight = Boolean(targetRect && currentStep.placement !== 'center');

  // Tooltip position: fixed, clamped to the viewport.
  const tooltipStyle = (): CSSProperties => {
    const fallback: CSSProperties = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'calc(100vw - 32px)',
      maxWidth: '440px',
      zIndex: 60,
    };
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600;

    if (currentStep.placement === 'center' || !targetRect) {
      return fallback;
    }

    const tooltipWidth = 360;
    const tooltipHeight = 220;
    const isMobile = viewportWidth < 768;

    if (isMobile) {
      return fallback;
    }

    if (currentStep.placement === 'right') {
      let top = targetRect.top + targetRect.height / 2 - 90;
      let left = targetRect.left + targetRect.width + 20;
      top = Math.max(16, Math.min(viewportHeight - tooltipHeight - 20, top));
      left = Math.max(16, Math.min(viewportWidth - tooltipWidth - 20, left));
      return { position: 'fixed', top: `${top}px`, left: `${left}px`, width: `${tooltipWidth}px`, zIndex: 60 };
    }

    // 'top' — centered above (or below if out of space) the dashboard card.
    let top = targetRect.top - tooltipHeight - 16;
    if (top < 12) {
      top = targetRect.bottom + 16;
    }
    const left = Math.max(16, Math.min(viewportWidth / 2 - tooltipWidth / 2, viewportWidth - tooltipWidth - 16));
    return { position: 'fixed', top: `${top}px`, left: `${left}px`, width: `${tooltipWidth}px`, zIndex: 60 };
  };

  const StepIcon = currentStep.icon;

  return (
    <div id="product-tour-overlay" className="pointer-events-auto fixed inset-0 z-50">
      {/* Dimmed + blurred backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-all duration-300"
        onClick={handleSkip}
      />

      {/* Spotlight on the current target */}
      {hasSpotlight && targetRect && (
        <div
          id="spotlight-active-menu-item"
          className="pointer-events-none fixed z-[58] flex select-none items-center justify-between rounded-xl border-2 border-brand-500 bg-[#0E1A2E] px-3.5 py-2.5 text-white shadow-[0_0_35px_rgba(255,122,0,0.6)] ring-4 ring-brand-500/40 transition-all duration-200"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-brand-500/40 bg-brand-500/20 text-brand-500">
              <StepIcon className="h-3.5 w-3.5" />
            </div>
            <span className="truncate text-xs font-bold tracking-wide text-white sm:text-sm">
              {t(stepTitleKey)}
            </span>
          </div>
          <span className="relative ml-2 flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
          </span>
        </div>
      )}

      {/* Tooltip card */}
      <div
        style={tooltipStyle()}
        className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-[#0B1528] to-[#142238] p-4 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-brand-500/40 bg-brand-500/20">
              <Compass className="h-3.5 w-3.5 text-brand-500" />
            </div>
            <span className="text-xs font-bold text-[#FFA040]">{t(stepBadgeKey)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-400">
              {currentStepIndex + 1}/{STEP_DEFS.length}
            </span>
            <button
              type="button"
              onClick={handleSkip}
              title={t('tourSkip')}
              className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <h4 className="flex items-center gap-2 text-sm font-bold leading-snug text-slate-900">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            {t(stepTitleKey)}
          </h4>
          <p className="text-xs leading-relaxed text-slate-600">{t(stepDescKey)}</p>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={handleSkip}
            className="cursor-pointer text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
          >
            {t('tourSkip')}
          </button>
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStepIndex((prev) => prev - 1)}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t('tourBack')}</span>
              </button>
            )}
            {isFinalStep ? (
              <button
                type="button"
                onClick={handleComplete}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-brand-600"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{t('tourDone')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStepIndex((prev) => prev + 1)}
                className="flex cursor-pointer items-center gap-1 rounded-lg bg-[#0B1528] px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-brand-500"
              >
                <span>{t('tourNext')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}