'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Video,
  X,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Step definitions — Dashboard entrance + interior sections + sidebar links */
/* -------------------------------------------------------------------------- */

interface TourStepDef {
  targetId: string;
  icon: typeof LayoutDashboard;
}

/**
 * 12-step guided tour presenting both the dashboard interior and the main navigation:
 *
 * 1.  Sidebar: Tableau de bord (camp de base)
 * 2.  Dashboard: Actions rapides (téléversement, diagnostic ATS, match, simulation)
 * 3.  Dashboard: Progression de Carrière (timeline ascendante & jalons)
 * 4.  Dashboard: Aperçu du Profil (score global & 5 jauges de complétude)
 * 5.  Dashboard: Vos CVs (cartes actives & conformité ATS en direct)
 * 6.  Dashboard: Activité récente (fil d'actualité en temps réel)
 * 7.  Sidebar: Mes CVs (coffre-fort documentaire complet)
 * 8.  Sidebar: Job Matching (adéquation avec les offres d'emploi)
 * 9.  Sidebar: Simulations d'entretiens (coach vocal IA méthode STAR)
 * 10. Sidebar: Roadmap Carrière (stratégie Lead & Architect)
 * 11. Sidebar: Analyses et Statistiques (radar de compétences & stats)
 * 12. Sidebar: Paramètres (configuration du profil & options IA)
 */
const STEP_DEFS: TourStepDef[] = [
  { targetId: 'nav-dashboard', icon: LayoutDashboard },
  { targetId: 'quick-actions-section', icon: Sparkles },
  { targetId: 'career-roadmap-card', icon: TrendingUp },
  { targetId: 'profile-overview-card', icon: Target },
  { targetId: 'cv-section-card', icon: FileText },
  { targetId: 'recent-activity-card', icon: Activity },
  { targetId: 'nav-cvs', icon: FileText },
  { targetId: 'nav-matching', icon: Users },
  { targetId: 'nav-mock', icon: Video },
  { targetId: 'nav-timeline', icon: TrendingUp },
  { targetId: 'nav-analytics', icon: Activity },
  { targetId: 'nav-settings', icon: Settings },
];

/* -------------------------------------------------------------------------- */
/*  Component props & types                                                   */
/* -------------------------------------------------------------------------- */

interface ProductTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/* -------------------------------------------------------------------------- */
/*  ProductTour                                                               */
/* -------------------------------------------------------------------------- */

export default function ProductTour({ isActive, onComplete, onSkip }: ProductTourProps) {
  const t = useTranslations('onboarding');
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverHeight, setPopoverHeight] = useState(260);

  const stepDef = STEP_DEFS[currentStep] ?? STEP_DEFS[0];
  const isLast = currentStep === STEP_DEFS.length - 1;
  const isFirst = currentStep === 0;
  const totalSteps = STEP_DEFS.length;

  const titleKey = `tourStep${currentStep + 1}Title` as const;
  const descKey = `tourStep${currentStep + 1}Desc` as const;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isSidebar = stepDef.targetId.startsWith('nav-');

  /* ---- Measure target element position & smooth scroll ----------------- */
  useEffect(() => {
    if (!isActive) return;

    const measure = () => {
      const el = document.getElementById(stepDef.targetId);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        right: r.right,
        bottom: r.bottom,
      });
    };

    // Smooth auto-scroll target into view
    const el = document.getElementById(stepDef.targetId);
    if (el) {
      if (!stepDef.targetId.startsWith('nav-')) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    const raf = requestAnimationFrame(measure);
    const t1 = setTimeout(measure, 150);
    const t2 = setTimeout(measure, 350);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [isActive, stepDef.targetId]);

  /* ---- Measure popover height for accurate positioning ----------------- */
  useEffect(() => {
    const node = popoverRef.current;
    if (!node) return;
    const obs = new ResizeObserver(([entry]) => {
      if (entry) setPopoverHeight(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height);
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, [isActive]);

  /* ---- Step navigation ------------------------------------------------- */
  const goToStep = useCallback((next: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(next);
      setIsTransitioning(false);
    }, 150);
  }, []);

  const handleComplete = useCallback(() => {
    setCurrentStep(0);
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    setCurrentStep(0);
    onSkip();
  }, [onSkip]);

  const handleNext = useCallback(() => {
    if (isLast) handleComplete();
    else goToStep(currentStep + 1);
  }, [isLast, handleComplete, goToStep, currentStep]);

  const handlePrev = useCallback(() => {
    if (!isFirst) goToStep(currentStep - 1);
  }, [isFirst, goToStep, currentStep]);

  /* ---- Keyboard navigation --------------------------------------------- */
  useEffect(() => {
    if (!isActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActive, handleSkip, handleNext, handlePrev]);

  /* ---- Early exit ------------------------------------------------------ */
  if (!isActive) return null;

  /* ---- Compute popover position: always visible on-screen -------------- */
  const computePopoverStyle = (): CSSProperties => {
    const POPOVER_WIDTH = 380;
    const GAP = 16;

    // Fallback: centered (used when target is missing or on small mobile screens).
    const centered: CSSProperties = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${POPOVER_WIDTH}px`,
      maxWidth: 'calc(100vw - 32px)',
      zIndex: 10002,
    };

    if (!targetRect || (typeof window !== 'undefined' && window.innerWidth < 768)) {
      return centered;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ph = popoverHeight;

    let top: number;
    let left: number;

    if (isSidebar) {
      // Natural placement for left-side sidebar items
      left = targetRect.right + GAP;
      top = targetRect.top + targetRect.height / 2 - ph / 2;

      // If overflowing right, try below
      if (left + POPOVER_WIDTH > vw - GAP) {
        left = targetRect.left;
        top = targetRect.bottom + GAP;
      }
    } else {
      // Dashboard card inside main view:
      const spaceBelow = vh - targetRect.bottom;
      const spaceAbove = targetRect.top;

      if (spaceBelow >= ph + GAP) {
        top = targetRect.bottom + GAP;
        left = Math.min(targetRect.left + 20, vw - POPOVER_WIDTH - GAP);
      } else if (spaceAbove >= ph + GAP) {
        top = targetRect.top - ph - GAP;
        left = Math.min(targetRect.left + 20, vw - POPOVER_WIDTH - GAP);
      } else {
        // Large card spanning viewport height: dock at bottom margin
        top = vh - ph - GAP;
        left = Math.min(targetRect.left + 20, vw - POPOVER_WIDTH - GAP);
      }
    }

    // Strict clamping within viewport margins
    top = Math.max(GAP, Math.min(vh - ph - GAP, top));
    left = Math.max(GAP, Math.min(vw - POPOVER_WIDTH - GAP, left));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${POPOVER_WIDTH}px`,
      maxWidth: 'calc(100vw - 32px)',
      zIndex: 10002,
    };
  };

  const StepIcon = stepDef.icon;

  return (
    <>
      {/* Inline keyframes scoped to the tour */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes forpro-glow-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(255,122,0,0.30), 0 0 20px rgba(255,122,0,0.60), 0 0 45px rgba(255,122,0,0.35), 0 0 75px rgba(255,122,0,0.15); }
          50%       { box-shadow: 0 0 0 5px rgba(255,122,0,0.40), 0 0 30px rgba(255,122,0,0.75), 0 0 60px rgba(255,122,0,0.45), 0 0 95px rgba(255,122,0,0.22); }
        }
        @keyframes forpro-beacon {
          0%   { transform: scale(1);   opacity: 1; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes forpro-popover-in {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);   }
        }
      `,
        }}
      />

      {/* Transparent click-catcher — NO dark/blurred backdrop whatsoever */}
      <div
        className="fixed inset-0 z-[10000]"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* -------- Animated orange glow spotlight around active element -------- */}
      {targetRect && (
        <div
          id="tour-spotlight"
          className="pointer-events-none fixed z-[10001] transition-all duration-300 ease-out"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        >
          {/* Glowing border ring */}
          <div
            className={`h-full w-full ${isSidebar ? 'rounded-xl' : 'rounded-3xl'}`}
            style={{
              border: '2.5px solid #FF7A00',
              animation: 'forpro-glow-pulse 2.4s ease-in-out infinite',
            }}
          />
          {/* Pulsing beacon dot — top-right corner */}
          <span
            className="absolute -right-1.5 -top-1.5 block h-3.5 w-3.5 rounded-full bg-[#FF7A00]"
            style={{ animation: 'forpro-beacon 1.8s ease-out infinite' }}
          />
          <span className="absolute -right-1.5 -top-1.5 block h-3.5 w-3.5 rounded-full bg-[#FF7A00] ring-2 ring-white/60" />
        </div>
      )}

      {/* -------- Popover card -------- */}
      <div
        ref={popoverRef}
        style={{
          ...computePopoverStyle(),
          animation: 'forpro-popover-in 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
        className={`overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-[#0B1528] via-[#101E35] to-[#162640] shadow-2xl shadow-black/50 transition-all duration-200 ${
          isTransitioning ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Header */}
        <div className="relative px-5 pt-4 pb-3">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF7A00] to-transparent" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF7A00]/15 ring-1 ring-[#FF7A00]/30">
                <Sparkles className="h-4 w-4 text-[#FF7A00]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF7A00]">
                  {t('tourLabel')}
                </p>
                <p className="font-mono text-[10px] text-slate-400">
                  {currentStep + 1} / {totalSteps}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              title={t('tourSkip')}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Animated progress bar */}
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FFB347] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="px-5 py-3.5">
          <div className="mb-2 flex items-center gap-2.5">
            <StepIcon className="h-4 w-4 shrink-0 text-[#FF7A00]" />
            <h4 className="text-sm font-bold text-white">{t(titleKey)}</h4>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">{t(descKey)}</p>
        </div>

        {/* Step dots (compact for 12 steps) */}
        <div className="flex items-center justify-center gap-1 pb-3 px-4 flex-wrap">
          {STEP_DEFS.map((step, i) => (
            <button
              key={`dot-${step.targetId}`}
              type="button"
              onClick={() => goToStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === currentStep
                  ? 'w-5 bg-[#FF7A00]'
                  : i < currentStep
                    ? 'w-1.5 bg-[#FF7A00]/50'
                    : 'w-1.5 bg-white/15 hover:bg-white/30'
              }`}
              aria-label={`Étape ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.02] px-5 py-3">
          <button
            type="button"
            onClick={handleSkip}
            className="cursor-pointer text-[11px] font-medium text-slate-400 transition-colors hover:text-white"
          >
            {t('tourSkip')}
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition-all hover:border-white/20 hover:bg-white/5"
              >
                <ArrowLeft className="h-3 w-3" />
                {t('tourBack')}
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-1.5 text-[11px] font-bold text-white shadow-lg transition-all active:scale-95 ${
                isLast
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-500'
                  : 'bg-gradient-to-r from-[#FF7A00] to-[#FF9500] shadow-orange-500/25 hover:from-[#FF8C00] hover:to-[#FFA500]'
              }`}
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{t('tourDone')}</span>
                </>
              ) : (
                <>
                  <span>{t('tourNext')}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}