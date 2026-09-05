import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Flag,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Building,
  Layers,
  ChevronRight,
  Plus,
  History
} from 'lucide-react';
import { CareerMilestone } from '../types';

interface CareerRoadmapProps {
  isEmpty: boolean;
  milestones: CareerMilestone[];
  onSelectMilestone: (milestone: CareerMilestone) => void;
  onAddExperience: () => void;
  onViewFullRoadmap: () => void;
  lang: 'en' | 'fr';
}

interface HoveredInfo {
  milestone: CareerMilestone;
  rect: {
    top: number;
    bottom: number;
    left: number;
    width: number;
    height: number;
  };
}

interface RenderNode {
  milestone?: CareerMilestone;
  isEarlierIndicator?: boolean;
  x: number;
  y: number;
}

export const CareerRoadmap: React.FC<CareerRoadmapProps> = ({
  isEmpty,
  milestones,
  onSelectMilestone,
  onAddExperience,
  onViewFullRoadmap,
  lang,
}) => {
  const isFrench = lang === 'fr';
  const [hoveredInfo, setHoveredInfo] = useState<HoveredInfo | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Measure card container width to adapt dynamically
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(700);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, []);

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleBadgeMouseEnter = (m: CareerMilestone, el: HTMLElement) => {
    clearHoverTimeout();
    const rect = el.getBoundingClientRect();
    setHoveredInfo({
      milestone: m,
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  const handleBadgeMouseLeave = () => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredInfo(null);
    }, 180);
  };

  const handlePopoverMouseEnter = () => {
    clearHoverTimeout();
  };

  const handlePopoverMouseLeave = () => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredInfo(null);
    }, 180);
  };

  useEffect(() => {
    return () => clearHoverTimeout();
  }, []);

  // Separate non-goal experiences and goal
  const goalMilestone = milestones.find((m) => m.isGoal) || milestones[milestones.length - 1];
  const allExperiences = milestones.filter((m) => !m.isGoal);

  // Determine how many experiences to display based on responsive width
  let maxVisibleExp = 3;
  if (containerWidth >= 880) {
    maxVisibleExp = allExperiences.length === 4 ? 4 : 3;
  } else if (containerWidth >= 540) {
    maxVisibleExp = 2;
  } else {
    maxVisibleExp = 1;
  }

  const visibleExperiences = allExperiences.slice(-maxVisibleExp);
  const earlierCount = allExperiences.length - visibleExperiences.length;
  const hasEarlier = earlierCount > 0;

  // Build coordinate nodes along the ascending mountain curve
  const nodes: RenderNode[] = [];

  if (hasEarlier) {
    // Earlier indicator at the bottom left
    nodes.push({
      isEarlierIndicator: true,
      x: 80,
      y: 220,
    });

    if (visibleExperiences.length === 3) {
      nodes.push({ milestone: visibleExperiences[0], x: 280, y: 175 });
      nodes.push({ milestone: visibleExperiences[1], x: 480, y: 132 });
      nodes.push({ milestone: visibleExperiences[2], x: 680, y: 90 });
    } else if (visibleExperiences.length === 2) {
      nodes.push({ milestone: visibleExperiences[0], x: 350, y: 160 });
      nodes.push({ milestone: visibleExperiences[1], x: 630, y: 104 });
    } else if (visibleExperiences.length === 1) {
      nodes.push({ milestone: visibleExperiences[0], x: 480, y: 135 });
    }
  } else {
    // All experiences fit
    if (visibleExperiences.length === 4) {
      nodes.push({ milestone: visibleExperiences[0], x: 100, y: 220 });
      nodes.push({ milestone: visibleExperiences[1], x: 300, y: 175 });
      nodes.push({ milestone: visibleExperiences[2], x: 500, y: 132 });
      nodes.push({ milestone: visibleExperiences[3], x: 700, y: 90 });
    } else if (visibleExperiences.length === 3) {
      nodes.push({ milestone: visibleExperiences[0], x: 140, y: 210 });
      nodes.push({ milestone: visibleExperiences[1], x: 410, y: 155 });
      nodes.push({ milestone: visibleExperiences[2], x: 660, y: 102 });
    } else if (visibleExperiences.length === 2) {
      nodes.push({ milestone: visibleExperiences[0], x: 200, y: 190 });
      nodes.push({ milestone: visibleExperiences[1], x: 550, y: 120 });
    } else if (visibleExperiences.length === 1) {
      nodes.push({ milestone: visibleExperiences[0], x: 340, y: 160 });
    }
  }

  // Always append Goal as the final summit point (top-right)
  if (goalMilestone) {
    nodes.push({
      milestone: goalMilestone,
      x: 885,
      y: 48,
    });
  }

  // Generate SVG path connecting points
  const generateCurvePath = (pts: { x: number; y: number }[]): string => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const dx = p1.x - p0.x;
      const cp1x = p0.x + dx * 0.45;
      const cp1y = p0.y;
      const cp2x = p1.x - dx * 0.45;
      const cp2y = p1.y;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return d;
  };

  const curvePath = generateCurvePath(nodes);

  const renderMilestoneBadge = (logoType?: string, isGoal?: boolean) => {
    if (isGoal) {
      return (
        <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center select-none">
          <div
            style={{ animation: 'spin 18s linear infinite' }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-[#FF7A00]"
          />
          <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white flex items-center justify-center shadow-[0_8px_20px_rgba(255,122,0,0.25)] ring-4 ring-orange-100/80">
            <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="none">
              <circle cx="10" cy="26" r="2.5" fill="#FF7A00" />
              <line x1="10" y1="5" x2="10" y2="26" stroke="#FF7A00" strokeWidth="2.5" strokeLinecap="round" />
              <path
                d="M 10 6 Q 16 4, 21 7 T 26 6.5 L 26 16 Q 20 17.5, 16 15 T 10 16.5 Z"
                fill="#FF7A00"
              />
            </svg>
          </div>
        </div>
      );
    }

    switch (logoType) {
      case 'up':
        return (
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white flex items-center justify-center shadow-[0_8px_20px_rgba(255,140,0,0.2)] ring-[7px] ring-amber-100/80 border border-amber-200/60">
            <span className="text-[#14A800] font-black text-xl font-sans tracking-tighter select-none">
              up
            </span>
          </div>
        );

      case 'cube':
        return (
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white flex items-center justify-center shadow-[0_8px_20px_rgba(255,140,0,0.2)] ring-[7px] ring-amber-100/80 border border-amber-200/60">
            <svg className="w-8 h-8 sm:w-9 sm:h-9" viewBox="0 0 48 48" fill="none">
              <polygon
                points="24,5 41,14.5 41,33.5 24,43 7,33.5 7,14.5"
                fill="#0B1B36"
              />
              <polygon points="24,14 33,19 24,24 15,19" fill="#00D2FF" />
              <polygon points="15,19 24,24 24,34 15,29" fill="#FFB800" />
              <polygon points="24,24 33,19 33,29 24,34" fill="#0284C7" />
            </svg>
          </div>
        );

      case 'gva':
        return (
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white flex items-center justify-center shadow-[0_8px_20px_rgba(255,140,0,0.2)] ring-[7px] ring-amber-100/80 border border-amber-200/60">
            <div className="flex items-center tracking-tighter select-none font-black text-[#0B2545] text-base sm:text-lg">
              <span>GV</span>
              <span className="relative">
                A
                <span className="absolute -top-1 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#FF7A00]" />
              </span>
            </div>
          </div>
        );

      case 'moov':
        return (
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-[#FF7A00] flex flex-col items-center justify-center shadow-[0_8px_20px_rgba(255,107,0,0.3)] p-1 ring-[7px] ring-orange-100/80">
            <span className="text-white font-black text-[9px] sm:text-[10px] tracking-tight uppercase leading-none">
              MOOV
            </span>
            <span className="text-white/95 font-bold text-[6px] sm:text-[7px] tracking-widest uppercase leading-none mt-0.5">
              AFRICA
            </span>
          </div>
        );

      default:
        return (
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white flex items-center justify-center shadow-md ring-6 ring-amber-100/70 border border-amber-200/60">
            <Layers className="w-5 h-5 text-[#FF7A00]" />
          </div>
        );
    }
  };

  return (
    <div
      id="career-roadmap-card"
      ref={containerRef}
      className="bg-white rounded-3xl p-5 sm:p-6 lg:p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between h-auto lg:h-full min-h-[350px] sm:min-h-[380px] relative overflow-hidden"
    >
      {/* Background Hill Silhouette */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none -z-0">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1000 320"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="roadmapHillGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="roadmapHillGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#EDF2F7" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          <path
            d="M 520 320 Q 640 265, 760 280 T 920 220 Q 965 210, 1000 215 L 1000 320 Z"
            fill="url(#roadmapHillGrad1)"
          />
          <path
            d="M 680 320 Q 790 240, 890 255 T 1000 225 L 1000 320 Z"
            fill="url(#roadmapHillGrad2)"
          />
        </svg>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-2 z-10 shrink-0">
        <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight flex items-center gap-2">
          <span>{isFrench ? 'Progression de Carrière' : 'Career Progression'}</span>
          {hasEarlier && (
            <span className="hidden sm:inline-block text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {isFrench ? `+${earlierCount} plus anciennes` : `+${earlierCount} earlier`}
            </span>
          )}
        </h3>

        {!isEmpty && milestones.length > 0 && (
          <button
            id="view-full-roadmap-btn"
            onClick={onViewFullRoadmap}
            className="text-xs sm:text-sm font-semibold text-[#FF7A00] hover:text-[#E66E00] flex items-center gap-1.5 transition-colors cursor-pointer group"
          >
            <span>{isFrench ? 'Voir toute la roadmap' : 'View full roadmap'}</span>
            <ArrowRight className="w-4 h-4 text-[#FF7A00] group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="relative z-10 py-8 px-4 rounded-2xl bg-slate-50/70 border border-dashed border-amber-200 text-center flex-1 flex flex-col items-center justify-center">
          <h4 className="text-sm sm:text-base font-bold text-slate-800 mb-1.5">
            {isFrench ? 'Votre roadmap de carrière vous attend !' : 'Your career roadmap is waiting!'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
            {isFrench
              ? 'Ajoutez vos expériences pour visualiser votre parcours professionnel.'
              : 'Add your experiences to visualize your professional progression towards your goals.'}
          </p>
          <button
            onClick={onAddExperience}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B1528] hover:bg-[#132238] text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400 stroke-[2.5]" />
            <span>{isFrench ? 'Ajouter une expérience' : 'Add Experience'}</span>
          </button>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col justify-center py-2 w-full overflow-hidden">
          <div className="relative w-full h-[260px] sm:h-[280px]">
            {/* SVG Trajectory Track */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox="0 0 1000 280"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="cardCurveDropShadow" x="-20%" y="-40%" width="140%" height="200%">
                  <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#FF7A00" floodOpacity="0.45" />
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#FFA040" floodOpacity="0.3" />
                </filter>
                <filter id="cardDotDropShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#FF7A00" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Earlier lead-in dashed line if earlier roles exist */}
              {hasEarlier && (
                <path
                  d="M 5 235 C 30 235, 50 228, 80 220"
                  stroke="#FF7A00"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.5"
                />
              )}

              {/* Glow backdrop for trajectory */}
              <path
                d={curvePath}
                stroke="#FF7A00"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                opacity="0.22"
                filter="blur(4px)"
              />

              {/* Main Ascending Pathway */}
              <path
                d={curvePath}
                stroke="#FF7A00"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
                filter="url(#cardCurveDropShadow)"
              />

              {/* Glowing Dots at each node */}
              {nodes.map((n, i) => (
                <g key={`dot-${i}`}>
                  <circle cx={n.x} cy={n.y} r="7" fill="#FF7A00" opacity="0.2" />
                  <circle cx={n.x} cy={n.y} r="4" fill="#FF7A00" filter="url(#cardDotDropShadow)" />
                </g>
              ))}
            </svg>

            {/* Nodes Render (Badges + Text) */}
            {nodes.map((node, index) => {
              // Case 1: Earlier indicator pill
              if (node.isEarlierIndicator) {
                return (
                  <div
                    key="earlier-indicator-node"
                    style={{
                      left: `${(node.x / 1000) * 100}%`,
                      top: `${(node.y / 280) * 100}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                  >
                    <button
                      id="earlier-roles-indicator-btn"
                      onClick={onViewFullRoadmap}
                      className="group flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                      title={
                        isFrench
                          ? `Voir les ${earlierCount} expériences antérieures dans la roadmap complète`
                          : `View ${earlierCount} earlier experiences in the full roadmap`
                      }
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border-2 border-dashed border-[#FF7A00] group-hover:border-[#E66E00] shadow-[0_6px_16px_rgba(255,122,0,0.22)] flex items-center justify-center transition-colors">
                        <span className="text-[#FF7A00] font-black text-xs font-sans">
                          +{earlierCount}
                        </span>
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-white/95 group-hover:bg-amber-50 border border-slate-200/90 group-hover:border-amber-300 transition-colors whitespace-nowrap shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-[#FF7A00]">
                          {isFrench ? 'antérieures' : 'earlier'}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              }

              // Case 2: Milestone Node
              const m = node.milestone;
              if (!m) return null;
              const isGoal = m.isGoal;

              return (
                <div
                  key={m.id}
                  id={`milestone-node-${m.id}`}
                  style={{
                    left: `${(node.x / 1000) * 100}%`,
                    top: `${(node.y / 280) * 100}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                >
                  <div
                    onClick={() => onSelectMilestone(m)}
                    onMouseEnter={(e) => handleBadgeMouseEnter(m, e.currentTarget)}
                    onMouseLeave={handleBadgeMouseLeave}
                    className="cursor-pointer transition-transform duration-200 transform hover:scale-110 active:scale-95"
                  >
                    {renderMilestoneBadge(m.companyLogo, isGoal)}
                  </div>

                  <div
                    onClick={() => onSelectMilestone(m)}
                    className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 w-28 sm:w-34 text-center cursor-pointer select-none pointer-events-auto"
                  >
                    <span className="block text-[10px] sm:text-[11px] text-slate-400 font-semibold tracking-tight">
                      {isGoal ? (isFrench ? 'Objectif' : 'Goal') : m.year}
                    </span>
                    <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 leading-snug mt-0.5 hover:text-[#FF7A00] transition-colors truncate">
                      {m.role}
                    </h4>
                    {!isGoal && m.company && (
                      <span className="block text-[10px] text-slate-500 font-medium leading-tight mt-0.5 truncate">
                        {m.company}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Hover Portal */}
      {hoveredInfo &&
        typeof document !== 'undefined' &&
        createPortal(
          (() => {
            const m = hoveredInfo.milestone;
            const isGoal = m.isGoal;
            const rect = hoveredInfo.rect;

            const showAbove = rect.top > 250;
            const topPos = showAbove ? rect.top - 12 : rect.bottom + 12;
            const centerX = rect.left + rect.width / 2;

            const popoverWidth = 290;
            const halfWidth = popoverWidth / 2;
            const minLeft = 16 + halfWidth;
            const maxLeft = (typeof window !== 'undefined' ? window.innerWidth : 1200) - 16 - halfWidth;
            const clampedX = Math.max(minLeft, Math.min(centerX, maxLeft));

            return (
              <div
                id="career-milestone-hover-portal"
                style={{
                  position: 'fixed',
                  top: `${topPos}px`,
                  left: `${clampedX}px`,
                  transform: showAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                  zIndex: 99999,
                  width: `${popoverWidth}px`,
                }}
                onMouseEnter={handlePopoverMouseEnter}
                onMouseLeave={handlePopoverMouseLeave}
                className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-[0_20px_50px_rgba(15,23,42,0.25)] border border-slate-200/90 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto select-none"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    {isGoal ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[#FF7A00] border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        {isFrench ? 'Objectif Ciblé' : 'Target Goal'}
                      </span>
                    ) : m.isCurrent ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {isFrench ? 'Poste Actuel' : 'Current Role'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-slate-500" />
                        {isFrench ? 'Validé' : 'Completed'}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {m.year}
                  </span>
                </div>

                <h5 className="font-bold text-slate-900 text-sm leading-tight">
                  {m.role}
                </h5>
                {m.company && (
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                    <Building className="w-3 h-3 text-slate-400" />
                    <span>{m.company}</span>
                  </p>
                )}

                {m.description && (
                  <p className="text-[11px] text-slate-600 mt-2 leading-relaxed line-clamp-2">
                    {m.description}
                  </p>
                )}

                {m.technologies && m.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {m.technologies.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                    {m.technologies.length > 4 && (
                      <span className="text-[10px] text-slate-400 font-medium self-center pl-0.5">
                        +{m.technologies.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMilestone(m);
                    setHoveredInfo(null);
                  }}
                  className="mt-3 w-full py-1.5 px-2.5 rounded-xl bg-slate-50 hover:bg-[#FF7A00]/10 text-slate-700 hover:text-[#FF7A00] font-semibold text-[11px] flex items-center justify-center gap-1 transition-all border border-slate-200/70 cursor-pointer"
                >
                  <span>{isFrench ? 'Voir les détails complets' : 'View full details'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })(),
          document.body
        )}
    </div>
  );
};
