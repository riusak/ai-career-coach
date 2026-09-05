import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Compass,
  LayoutDashboard,
  FileText,
  Users,
  Video,
  TrendingUp,
  Activity,
  Settings,
  Sparkles,
  Eye
} from 'lucide-react';

interface TourStep {
  id: string;
  targetId: string;
  title: string;
  description: string;
  placement: 'right' | 'center';
  badge: string;
}

interface ProductTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  lang?: 'en' | 'fr';
}

const stepMenuMeta: Record<
  string,
  { labelFr: string; labelEn: string; icon: React.ComponentType<{ className?: string }> }
> = {
  'nav-dashboard': { labelFr: 'Tableau de bord', labelEn: 'Dashboard', icon: LayoutDashboard },
  'nav-cvs': { labelFr: 'Mes CVs', labelEn: 'My CVs', icon: FileText },
  'nav-matching': { labelFr: 'Job Matching', labelEn: 'Job Matching', icon: Users },
  'nav-mock': { labelFr: 'Simulations d’entretiens', labelEn: 'Mock Interviews', icon: Video },
  'nav-timeline': { labelFr: 'Roadmap de carrière', labelEn: 'Career Roadmap', icon: TrendingUp },
  'nav-analytics': { labelFr: 'Analytics', labelEn: 'Analytics', icon: Activity },
  'nav-settings': { labelFr: 'Paramètres', labelEn: 'Settings', icon: Settings },
};

export const ProductTour: React.FC<ProductTourProps> = ({
  isActive,
  onComplete,
  onSkip,
  lang = 'fr',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isFrench = lang === 'fr';

  const handleFinish = () => {
    setCurrentStepIndex(0);
    onComplete();
  };

  const handleCancel = () => {
    setCurrentStepIndex(0);
    onSkip();
  };

  const steps: TourStep[] = [
    {
      id: 'nav-dashboard',
      targetId: 'nav-dashboard',
      title: isFrench ? '1. Tableau de bord' : '1. Dashboard',
      description: isFrench
        ? 'Votre vue synthétique : visualisez la complétude de votre profil, vos raccourcis rapides pour tester une offre ou un CV, et vos activités récentes.'
        : 'Your central hub: track profile completeness, use quick shortcuts to test an offer or CV, and monitor recent activities.',
      placement: 'right',
      badge: 'Menu 1/7',
    },
    {
      id: 'nav-cvs',
      targetId: 'nav-cvs',
      title: isFrench ? '2. Mes CVs' : '2. My CVs',
      description: isFrench
        ? 'Votre coffre-fort documentaire : stockez vos versions de CV, consultez votre note ATS algorithmique en temps réel, auditez vos mots-clés et téléchargez vos documents.'
        : 'Your CV vault: store multiple CV versions, review live algorithmic ATS compliance, audit missing keywords, and download tailored versions.',
      placement: 'right',
      badge: 'Menu 2/7',
    },
    {
      id: 'nav-matching',
      targetId: 'nav-matching',
      title: isFrench ? '3. Job Matching' : '3. Job Matching',
      description: isFrench
        ? 'Évaluez votre pertinence face aux offres : téléversez n’importe quelle offre d’emploi (PDF, Word ou lien web) pour mesurer votre compatibilité technique et repérer les mots-clés cibles.'
        : 'Benchmark your profile against job specs: upload any job ad (PDF, Word, or web link) to calculate your match score and identify target keywords.',
      placement: 'right',
      badge: 'Menu 3/7',
    },
    {
      id: 'nav-mock',
      targetId: 'nav-mock',
      title: isFrench ? '4. Simulations d’entretiens' : '4. Mock Interviews',
      description: isFrench
        ? 'Entraînez-vous à l’oral en conditions réelles face à un coach IA vocal. Répondez aux questions ciblées et recevez un débriefing structuré selon la méthode STAR.'
        : 'Practice aloud under real interview conditions with our voice AI recruiter. Answer targeted questions and receive in-depth STAR feedback.',
      placement: 'right',
      badge: 'Menu 4/7',
    },
    {
      id: 'nav-timeline',
      targetId: 'nav-timeline',
      title: isFrench ? '5. Roadmap de carrière' : '5. Career Roadmap',
      description: isFrench
        ? 'Retracez la chronologie complète de votre parcours : valorisez vos missions clés, vos technologies maîtrisées et fixez vos objectifs vers les paliers Lead ou Architect.'
        : 'Map your complete career journey: highlight past achievements, mastered tech stacks, and plan milestones toward Lead or Architect positions.',
      placement: 'right',
      badge: 'Menu 5/7',
    },
    {
      id: 'nav-analytics',
      targetId: 'nav-analytics',
      title: isFrench ? '6. Analytics' : '6. Analytics',
      description: isFrench
        ? 'Suivez vos indicateurs d’entraînement : assiduité de vos simulations, progression de vos notes d’entretien et cartographie radar de vos compétences techniques et managériales.'
        : 'Monitor key metrics: practice frequency, interview score evolution, and a radar map evaluating technical and leadership strengths.',
      placement: 'right',
      badge: 'Menu 6/7',
    },
    {
      id: 'nav-settings',
      targetId: 'nav-settings',
      title: isFrench ? '7. Paramètres' : '7. Settings',
      description: isFrench
        ? 'Personnalisez votre expérience : mise à jour du profil, bascule de langue (Français / Anglais), réglage du niveau d’exigence du coach IA et alertes d’opportunités.'
        : 'Configure your profile: update personal info, toggle working language (French / English), adjust AI coach rigor, and manage alerts.',
      placement: 'right',
      badge: 'Menu 7/7',
    },
    {
      id: 'tour-complete',
      targetId: 'main-sidebar',
      title: isFrench ? 'Votre espace de travail est prêt !' : 'Your Workspace is Ready!',
      description: isFrench
        ? 'Vous connaissez maintenant le rôle de chaque menu. Vous pouvez dès à présent ajouter votre première expérience ou importer votre premier CV pour personnaliser votre profil.'
        : 'You now know the role of each menu in your workspace. You can now add your first experience or upload your first CV to start customizing your profile.',
      placement: 'center',
      badge: isFrench ? 'Prêt à démarrer' : 'Ready to Start',
    },
  ];

  const currentStep = steps[currentStepIndex];

  // Update target bounding box
  useEffect(() => {
    if (!isActive) return;

    const updateRect = () => {
      const el = document.getElementById(currentStep.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    const timeout = setTimeout(updateRect, 60);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isActive, currentStepIndex, currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'ArrowRight') {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          handleFinish();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStepIndex, steps.length]);

  if (!isActive) return null;

  // Calculate tooltip style
  const getTooltipStyle = (): React.CSSProperties => {
    const isMobile = window.innerWidth < 768;
    if (isMobile || currentStep.placement === 'center' || !targetRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100vw - 32px)',
        maxWidth: '440px',
        zIndex: 60,
      };
    }

    const margin = 20;
    const tooltipWidth = 380;
    const tooltipHeight = 220;

    let top = targetRect.top + targetRect.height / 2 - 90;
    let left = targetRect.right + margin;

    // Viewport bounding clamp
    top = Math.max(16, Math.min(window.innerHeight - tooltipHeight - 20, top));
    left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 20, left));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 60,
    };
  };

  const isFinalStep = currentStepIndex === steps.length - 1;
  const currentMeta = stepMenuMeta[currentStep.targetId];
  const StepIcon = currentMeta ? currentMeta.icon : Compass;
  const menuDisplayName = currentMeta
    ? isFrench
      ? currentMeta.labelFr
      : currentMeta.labelEn
    : currentStep.title;

  return (
    <div id="product-tour-overlay" className="fixed inset-0 z-50 pointer-events-auto">
      {/* Blurred & Dimmed Backdrop - Blurs the entire workspace */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-all duration-300"
        onClick={handleCancel}
      />

      {/* HIGHLIGHTED ACTIVE MENU ITEM: Displayed brightly above the blur with full clarity */}
      {targetRect && currentStep.placement !== 'center' && (
        <div
          id="spotlight-active-menu-item"
          className="fixed transition-all duration-200 rounded-xl ring-4 ring-[#FF7A00]/40 border-2 border-[#FF7A00] bg-[#0E1A2E] text-white shadow-[0_0_35px_rgba(255,122,0,0.6)] z-58 flex items-center justify-between px-3.5 py-2.5 pointer-events-none select-none"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
          }}
        >
          {/* Menu icon and clearly visible menu name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-[#FF7A00]/20 border border-[#FF7A00]/40 flex items-center justify-center text-[#FF7A00] shrink-0">
              <StepIcon className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white text-xs sm:text-sm tracking-wide truncate">
              {menuDisplayName}
            </span>
          </div>

          {/* Active spotlight beacon */}
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF7A00] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF7A00]" />
            </span>
          </div>
        </div>
      )}

      {/* Interactive Tooltip Card */}
      <div
        ref={tooltipRef}
        style={getTooltipStyle()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-linear-to-r from-[#0B1528] to-[#142238] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#FF7A00]/20 border border-[#FF7A00]/40 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5 text-[#FF7A00]" />
            </div>
            <span className="text-xs font-bold text-[#FFA040]">{currentStep.badge}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              {currentStepIndex + 1}/{steps.length}
            </span>
            <button
              onClick={handleCancel}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isFrench ? 'Quitter la visite' : 'Skip Tour'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 leading-snug">{currentStep.title}</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{currentStep.description}</p>
        </div>

        {/* Footer Navigation */}
        <div className="p-3.5 px-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            {isFrench ? 'Passer' : 'Skip'}
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={() => setCurrentStepIndex((prev) => prev - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isFrench ? 'Précédent' : 'Back'}</span>
              </button>
            )}

            {isFinalStep ? (
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isFrench ? 'C’est parti !' : 'Get Started'}</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentStepIndex((prev) => prev + 1)}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#0B1528] hover:bg-[#FF7A00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>{isFrench ? 'Suivant' : 'Next'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
