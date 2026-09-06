import React, { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
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

interface TourStep {
  id: string;
  targetId: string;
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
  badgeFr: string;
  badgeEn: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ProductTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  lang?: 'en' | 'fr';
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

const STEPS: TourStep[] = [
  {
    id: 'nav-dashboard',
    targetId: 'nav-dashboard',
    titleFr: 'Tableau de bord',
    titleEn: 'Dashboard',
    descFr:
      'Votre vue synthétique : complétude du profil, actions rapides et activités récentes. C’est votre camp de base.',
    descEn:
      'Your central hub: profile completeness, quick shortcuts to test an offer or CV, and recent activity.',
    badgeFr: 'Menu 1/12',
    badgeEn: 'Menu 1/12',
    icon: LayoutDashboard,
  },
  {
    id: 'quick-actions-section',
    targetId: 'quick-actions-section',
    titleFr: 'Actions rapides',
    titleEn: 'Quick Actions',
    descFr:
      'Vos 4 raccourcis clés : téléversez un CV, lancez un diagnostic ATS instantané, évaluez une offre ou démarrez une simulation.',
    descEn:
      'Your 4 instant shortcuts: upload a CV, run an ATS diagnostic, evaluate a job offer, or start a mock interview.',
    badgeFr: 'Étape 2/12',
    badgeEn: 'Step 2/12',
    icon: Sparkles,
  },
  {
    id: 'career-roadmap-card',
    targetId: 'career-roadmap-card',
    titleFr: 'Progression de Carrière',
    titleEn: 'Career Progression',
    descFr:
      'Votre feuille de route ascendante : suivez vos étapes professionnelles, vos compétences et votre projection vers vos objectifs cibles.',
    descEn:
      'Your ascending career roadmap: track milestone roles, mastered skills, and your trajectory toward target positions.',
    badgeFr: 'Étape 3/12',
    badgeEn: 'Step 3/12',
    icon: TrendingUp,
  },
  {
    id: 'profile-overview-card',
    targetId: 'profile-overview-card',
    titleFr: 'Aperçu du Profil',
    titleEn: 'Profile Overview',
    descFr:
      'Votre score global de force et le diagnostic détaillé de vos 5 indicateurs clés : compétences, expérience, formation, certifications et qualité CV.',
    descEn:
      'Your overall strength score and detailed assessment across 5 dimensions: skills, experience, education, certifications, and CV quality.',
    badgeFr: 'Étape 4/12',
    badgeEn: 'Step 4/12',
    icon: Target,
  },
  {
    id: 'cv-section-card',
    targetId: 'cv-section-card',
    titleFr: 'Vos CVs & Scores ATS',
    titleEn: 'Your CVs & ATS Scores',
    descFr:
      'Vos documents actifs avec leurs scores ATS calculés en direct par l’IA. Cliquez sur un CV pour ouvrir son diagnostic complet.',
    descEn:
      'Your active resumes with live algorithmic ATS compliance scores calculated by AI. Click any CV to inspect the full diagnostic.',
    badgeFr: 'Étape 5/12',
    badgeEn: 'Step 5/12',
    icon: FileText,
  },
  {
    id: 'recent-activity-card',
    targetId: 'recent-activity-card',
    titleFr: 'Activité récente',
    titleEn: 'Recent Activity',
    descFr:
      'Votre fil d’actualité en direct : historique des simulations vocales réalisées, analyses ATS achevées et compétences ajoutées.',
    descEn:
      'Your real-time audit feed: completed voice simulations, finished ATS reviews, and newly added skills.',
    badgeFr: 'Étape 6/12',
    badgeEn: 'Step 6/12',
    icon: Activity,
  },
  {
    id: 'nav-cvs',
    targetId: 'nav-cvs',
    titleFr: 'Mes CVs (Module complet)',
    titleEn: 'My CVs (Full Library)',
    descFr:
      'Votre coffre-fort documentaire dédié : gérez vos différentes versions de CV, auditez vos mots-clés et téléchargez des variantes ciblées.',
    descEn:
      'Your dedicated CV vault: organize multiple versions, audit missing keywords, and download targeted tailored documents.',
    badgeFr: 'Menu 7/12',
    badgeEn: 'Menu 7/12',
    icon: FileText,
  },
  {
    id: 'nav-matching',
    targetId: 'nav-matching',
    titleFr: "Job Matching",
    titleEn: 'Job Matching',
    descFr:
      'Évaluez votre pertinence face aux offres : téléversez une offre d’emploi pour mesurer votre compatibilité technique et repérer les mots-clés cibles.',
    descEn:
      'Benchmark your profile against job specs: upload a job ad to calculate your match score and identify target keywords.',
    badgeFr: 'Menu 8/12',
    badgeEn: 'Menu 8/12',
    icon: Users,
  },
  {
    id: 'nav-mock',
    targetId: 'nav-mock',
    titleFr: "Simulations d'entretiens",
    titleEn: 'Mock Interviews',
    descFr:
      'Entraînez-vous à l’oral en conditions réelles face à un coach IA vocal. Répondez aux questions ciblées et recevez un débriefing structuré STAR.',
    descEn:
      'Practice aloud under real interview conditions with our voice AI coach. Answer targeted questions and receive STAR feedback.',
    badgeFr: 'Menu 9/12',
    badgeEn: 'Menu 9/12',
    icon: Video,
  },
  {
    id: 'nav-timeline',
    targetId: 'nav-timeline',
    titleFr: 'Roadmap Carrière',
    titleEn: 'Career Roadmap',
    descFr:
      'Visualisez votre progression : missions clés, compétences validées et prochaines étapes recommandées par l’IA.',
    descEn:
      'Track your career path: past achievements, validated skills, and next recommended milestones toward Lead or Architect.',
    badgeFr: 'Menu 10/12',
    badgeEn: 'Menu 10/12',
    icon: TrendingUp,
  },
  {
    id: 'nav-analytics',
    targetId: 'nav-analytics',
    titleFr: 'Analyses et Stats',
    titleEn: 'Analytics',
    descFr:
      'Indicateurs détaillés de vos performances : assiduité, progression de vos notes et cartographie radar de vos compétences.',
    descEn:
      'Detailed performance metrics: practice frequency, score progress, and radar map of your technical & soft skills.',
    badgeFr: 'Menu 11/12',
    badgeEn: 'Menu 11/12',
    icon: Activity,
  },
  {
    id: 'nav-settings',
    targetId: 'nav-settings',
    titleFr: 'Paramètres',
    titleEn: 'Settings',
    descFr:
      'Gérez vos préférences, notifications, sécurité et options de personnalisation de l’IA.',
    descEn:
      'Configure your profile, manage notifications, security settings, and AI coach personalization.',
    badgeFr: 'Menu 12/12',
    badgeEn: 'Menu 12/12',
    icon: Settings,
  },
];

export const ProductTour: React.FC<ProductTourProps> = ({
  isActive,
  onComplete,
  onSkip,
  lang = 'fr',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverHeight, setPopoverHeight] = useState(260);

  const isFrench = lang === 'fr';
  const currentStep = STEPS[currentStepIndex] ?? STEPS[0];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === STEPS.length - 1;
  const totalSteps = STEPS.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  // Measure target element position
  useEffect(() => {
    if (!isActive) return;

    const measure = () => {
      const el = document.getElementById(currentStep.targetId);
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

    const el = document.getElementById(currentStep.targetId);
    if (el) {
      if (!currentStep.targetId.startsWith('nav-')) {
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
  }, [isActive, currentStep.targetId]);

  // Measure popover height dynamically
  useEffect(() => {
    const node = popoverRef.current;
    if (!node) return;
    const obs = new ResizeObserver(([entry]) => {
      if (entry) setPopoverHeight(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height);
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, [isActive]);

  const goToStep = useCallback((next: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStepIndex(next);
      setIsTransitioning(false);
    }, 150);
  }, []);

  const handleFinish = useCallback(() => {
    setCurrentStepIndex(0);
    onComplete();
  }, [onComplete]);

  const handleCancel = useCallback(() => {
    setCurrentStepIndex(0);
    onSkip();
  }, [onSkip]);

  const handleNext = useCallback(() => {
    if (isLast) handleFinish();
    else goToStep(currentStepIndex + 1);
  }, [isLast, handleFinish, goToStep, currentStepIndex]);

  const handlePrev = useCallback(() => {
    if (!isFirst) goToStep(currentStepIndex - 1);
  }, [isFirst, goToStep, currentStepIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
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
  }, [isActive, handleCancel, handleNext, handlePrev]);

  if (!isActive) return null;

  const computePopoverStyle = (): CSSProperties => {
    const POPOVER_WIDTH = 380;
    const GAP = 16;

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

    let top = targetRect.top + targetRect.height / 2 - ph / 2;
    let left = targetRect.right + GAP;

    if (left + POPOVER_WIDTH > vw - GAP) {
      left = targetRect.left;
      top = targetRect.bottom + GAP;
    }

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

  const StepIcon = currentStep.icon;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes forpro-glow-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(255,122,0,0.25), 0 0 18px rgba(255,122,0,0.55), 0 0 40px rgba(255,122,0,0.30), 0 0 70px rgba(255,122,0,0.12); }
          50%       { box-shadow: 0 0 0 5px rgba(255,122,0,0.35), 0 0 28px rgba(255,122,0,0.70), 0 0 55px rgba(255,122,0,0.40), 0 0 90px rgba(255,122,0,0.18); }
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

      {/* Transparent click-catcher — NO dark/blurred backdrop whatsoever. */}
      <div
        className="fixed inset-0 z-[10000]"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Animated orange glow spotlight around the targeted element */}
      {targetRect && (
        <div
          id="tour-spotlight"
          className="pointer-events-none fixed z-[10001] transition-all duration-300 ease-out"
          style={{
            top: `${targetRect.top - 5}px`,
            left: `${targetRect.left - 5}px`,
            width: `${targetRect.width + 10}px`,
            height: `${targetRect.height + 10}px`,
          }}
        >
          {/* Glowing border ring */}
          <div
            className="h-full w-full rounded-xl"
            style={{
              border: '2px solid #FF7A00',
              animation: 'forpro-glow-pulse 2.4s ease-in-out infinite',
            }}
          />
          {/* Pulsing beacon dot — top-right corner */}
          <span
            className="absolute -right-1 -top-1 block h-3 w-3 rounded-full bg-[#FF7A00]"
            style={{ animation: 'forpro-beacon 1.8s ease-out infinite' }}
          />
          <span className="absolute -right-1 -top-1 block h-3 w-3 rounded-full bg-[#FF7A00]" />
        </div>
      )}

      {/* Popover card */}
      <div
        ref={popoverRef}
        style={{
          ...computePopoverStyle(),
          animation: 'forpro-popover-in 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
        className={`overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-[#0B1528] via-[#101E35] to-[#162640] shadow-2xl shadow-black/40 transition-all duration-200 ${
          isTransitioning ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Header */}
        <div className="relative px-5 pt-4 pb-3">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF7A00] to-transparent" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF7A00]/15 ring-1 ring-[#FF7A00]/30">
                <Sparkles className="h-4 w-4 text-[#FF7A00]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF7A00]">
                  {isFrench ? 'Visite guidée' : 'Guided Tour'}
                </p>
                <p className="font-mono text-[10px] text-slate-500">
                  {currentStepIndex + 1} / {totalSteps}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              title={isFrench ? 'Passer' : 'Skip'}
              className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-all hover:bg-white/10 hover:text-white"
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
        <div className="px-5 py-4">
          <div className="mb-2 flex items-center gap-2.5">
            <StepIcon className="h-4 w-4 shrink-0 text-[#FF7A00]" />
            <h4 className="text-sm font-bold text-white">
              {isFrench ? currentStep.titleFr : currentStep.titleEn}
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            {isFrench ? currentStep.descFr : currentStep.descEn}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {STEPS.map((step, i) => (
            <button
              key={`dot-${step.targetId}`}
              type="button"
              onClick={() => goToStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === currentStepIndex
                  ? 'w-6 bg-[#FF7A00]'
                  : i < currentStepIndex
                    ? 'w-1.5 bg-[#FF7A00]/40'
                    : 'w-1.5 bg-white/15 hover:bg-white/30'
              }`}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.02] px-5 py-3">
          <button
            type="button"
            onClick={handleCancel}
            className="cursor-pointer text-[11px] font-medium text-slate-500 transition-colors hover:text-white"
          >
            {isFrench ? 'Passer' : 'Skip'}
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition-all hover:border-white/20 hover:bg-white/5"
              >
                <ArrowLeft className="h-3 w-3" />
                {isFrench ? 'Précédent' : 'Back'}
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
                  <span>{isFrench ? "C'est parti !" : 'Get Started'}</span>
                </>
              ) : (
                <>
                  <span>{isFrench ? 'Suivant' : 'Next'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
