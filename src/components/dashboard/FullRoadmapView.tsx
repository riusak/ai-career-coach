'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeft,
  Award,
  Briefcase,
  ChevronRight,
  Cpu,
  Layers,
  Plus,
  Rocket,
  Users,
} from 'lucide-react';
import MilestoneModal from '@/components/dashboard/MilestoneModal';
import CompanyLogo from '@/components/dashboard/CompanyLogo';
import type { MilestoneData } from '@/types/dashboard';

interface FullRoadmapViewProps {
  milestones: MilestoneData[];
  totalYearsExp: number;
  certificationsCount: number;
}

const DOMAIN_COLORS: Record<string, string> = {
  frontend: '#FF9500',
  backend: '#1E293B',
  architecture: '#F59E0B',
  devops: '#94A3B8',
  mobile: '#0284C7',
  data: '#64748B',
  other: '#CBD5E1',
};

const DOMAIN_LABELS: Record<string, { fr: string; en: string }> = {
  frontend: { fr: 'Développement Frontend', en: 'Frontend Development' },
  backend: { fr: 'Développement Backend', en: 'Backend Development' },
  architecture: { fr: 'Architecture Système', en: 'System Architecture' },
  devops: { fr: 'DevOps & Cloud', en: 'DevOps & Cloud' },
  mobile: { fr: 'Développement Mobile', en: 'Mobile Development' },
  data: { fr: 'Data & IA', en: 'Data & AI' },
  other: { fr: 'Autres', en: 'Other' },
};

/** Fixed stage positions of the template's immersive panoramic board. */
const CARD_NODES = [
  { index: 0, leftPercent: 6.5, curveY: 300, cardTop: 340, dotType: 'navy-ring' },
  { index: 1, leftPercent: 24, curveY: 260, cardTop: 300, dotType: 'navy-dot' },
  { index: 2, leftPercent: 43.5, curveY: 220, cardTop: 260, dotType: 'amber-dot' },
  { index: 3, leftPercent: 61, curveY: 170, cardTop: 210, dotType: 'navy-dot' },
  { index: 4, leftPercent: 77.5, curveY: 130, cardTop: 170, dotType: 'amber-halo' },
  { index: 5, leftPercent: 91.5, curveY: 60, cardTop: 110, dotType: 'flag-summit' },
];

/**
 * Immersive full-roadmap page — exact port of the template's
 * FullRoadmapView.tsx: panoramic mountain board with suspended milestone
 * cards, experience donut, bottom metric bar and the detailed timeline grid.
 */
export default function FullRoadmapView({
  milestones,
  totalYearsExp,
  certificationsCount,
}: FullRoadmapViewProps) {
  const locale = useLocale();
  const router = useRouter();
  const isFrench = locale !== 'en';
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneData | null>(null);

  // Experience overview donut — derived from the real profile domains.
  const donutData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of milestones) {
      const key = m.domain && DOMAIN_COLORS[m.domain] ? m.domain : 'other';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const total = milestones.length || 1;
    return [...counts.entries()].map(([domain, count]) => ({
      label: isFrench ? DOMAIN_LABELS[domain].fr : DOMAIN_LABELS[domain].en,
      percentage: Math.round((count / total) * 100),
      color: DOMAIN_COLORS[domain],
    }));
  }, [milestones, isFrench]);

  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  // Bottom metric bar values — derived from the real profile data.
  const totalMissions = milestones.reduce((sum, m) => sum + m.keyMissions.length, 0);
  const currentCount = milestones.filter((m) => m.isCurrent).length;
  const successRate = milestones.length > 0 ? Math.round((currentCount / milestones.length) * 100) : 0;
  const uniqueTechs = new Set(milestones.flatMap((m) => m.technologies)).size;

  return (
    <div id="immersive-career-roadmap" className="flex-1 flex flex-col gap-6 sm:gap-7 pb-16 animate-in fade-in duration-300">
      {/* Top Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            id="back-to-dashboard-btn"
            onClick={() => router.push('/dashboard')}
            className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors shadow-2xs flex items-center gap-2 text-xs sm:text-sm font-bold cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
            <span>{isFrench ? 'Retour au Dashboard' : 'Back to Dashboard'}</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-[#FF7A00] border border-amber-500/30">
              {isFrench ? 'Vue Panoramique Immersive' : 'Immersive Pathway'}
            </span>
            <span className="text-xs font-medium text-slate-400 hidden md:inline">
              {isFrench ? 'Trajectoire de carrière & compétences' : 'Professional trajectory & competencies'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setShowDetailDrawer(!showDetailDrawer)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>{showDetailDrawer ? (isFrench ? 'Masquer détails' : 'Hide details') : (isFrench ? 'Voir détail chronologique' : 'View full timeline')}</span>
          </button>

          <button
            onClick={() => router.push('/dashboard/profile')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
            <span>{isFrench ? 'Ajouter une étape' : 'Add Milestone'}</span>
          </button>
        </div>
      </div>

      {/* Main Immersive Panoramic Board */}
      <div className="relative rounded-3xl bg-linear-to-b from-[#FAF8F5] via-[#F7F3EB] to-[#F1E9DA] border border-[#E9DFCE] shadow-[0_16px_40px_rgba(200,180,150,0.22)] p-6 sm:p-8 lg:p-10 overflow-hidden">
        {/* Upper Zone: Experience Overview (Left) + Career Progression Header (Right) */}
        <div className="relative z-20 flex flex-col lg:flex-row items-start justify-between gap-8 mb-6">
          {/* Left: Experience Overview with Donut Chart */}
          <div className="w-full lg:w-auto shrink-0">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-4">
              {isFrench ? "Aperçu de l'Expérience" : 'Experience Overview'}
            </h3>

            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-6 bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-amber-200/40 shadow-2xs">
              {/* Donut Graphic */}
              <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  {(() => {
                    let accumulatedPercent = 0;
                    return donutData.map((item, index) => {
                      const strokeDash = (item.percentage / 100) * circumference;
                      const strokeOffset = -((accumulatedPercent / 100) * circumference);
                      accumulatedPercent += item.percentage;
                      return (
                        <circle
                          key={index}
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth="15"
                          strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
                          strokeDashoffset={strokeOffset}
                          className="transition-all duration-500 ease-out"
                        />
                      );
                    });
                  })()}
                </svg>

                {/* Donut Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none tracking-tight">
                    {totalYearsExp > 0 ? `${Math.floor(totalYearsExp)}+` : '0'}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    {isFrench ? 'Années' : 'Years'}
                  </span>
                </div>
              </div>

              {/* Legend Items */}
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                {donutData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between sm:justify-start gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-slate-700">{item.label}</span>
                    </div>
                    <span className="font-bold text-slate-900 font-mono">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Career Progression Title */}
          <div className="lg:text-left flex-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isFrench ? 'Progression de Carrière' : 'Career Progression'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              {isFrench
                ? 'Votre parcours professionnel et étapes clés franchies'
                : 'Your professional journey and milestones'}
            </p>
          </div>
        </div>

        {/* The Mountain Track & Floating Milestone Cards Canvas */}
        <div className="relative w-full overflow-x-auto scrollbar-none pt-4 pb-8">
          <div className="relative min-w-[1040px] h-[520px] select-none">
            {/* Background Mountain Contours (SVG) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
              viewBox="0 0 1200 520"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Sunburst radial glow at summit */}
                <radialGradient id="summitSunGlow" cx="89%" cy="13%" r="35%">
                  <stop offset="0%" stopColor="#FFF2D6" stopOpacity="0.95" />
                  <stop offset="25%" stopColor="#FFE4A8" stopOpacity="0.75" />
                  <stop offset="60%" stopColor="#F9E2B5" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#F1E9DA" stopOpacity="0" />
                </radialGradient>

                {/* Soft Mountain Gradients */}
                <linearGradient id="backHills" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F6EEE1" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#EDE2CF" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="midHills" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#EDE2CF" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#E3D5BD" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="foreHills" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E5D6BD" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#DBCBB0" stopOpacity="0.9" />
                </linearGradient>

                {/* Trajectory Drop Shadow */}
                <filter id="goldenCurveShadow" x="-20%" y="-40%" width="140%" height="200%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#FF9500" floodOpacity="0.35" />
                </filter>
              </defs>

              {/* Sunbeam Aura behind Summit */}
              <circle cx="1070" cy="70" r="160" fill="url(#summitSunGlow)" />

              {/* Distant Hills Layer */}
              <path d="M 360 520 Q 640 260, 950 140 T 1200 40 L 1200 520 Z" fill="url(#backHills)" />

              {/* Mid Dune Layer */}
              <path d="M 120 520 Q 420 320, 780 240 T 1200 130 L 1200 520 Z" fill="url(#midHills)" />

              {/* Foreground Rolling Dunes */}
              <path d="M 0 520 Q 250 360, 600 320 T 1200 240 L 1200 520 Z" fill="url(#foreHills)" />

              {/* Connector lines from dots to cards */}
              {CARD_NODES.map((node) => {
                const nodeX = (node.leftPercent / 100) * 1200 + 16;
                return (
                  <line
                    key={`line-${node.index}`}
                    x1={nodeX}
                    y1={node.curveY}
                    x2={nodeX}
                    y2={node.cardTop}
                    stroke="#D8C8B0"
                    strokeWidth="1.8"
                    strokeDasharray="3 3"
                  />
                );
              })}

              {/* Main Golden Ascending Trajectory Curve */}
              {/* Monotonic S-curve reaching right into the peak flag */}
              <path
                d="M 20 330 C 60 325, 80 308, 105 300 C 160 280, 240 270, 305 260 C 390 245, 470 230, 540 218 C 620 205, 690 180, 750 168 C 820 152, 880 135, 945 125 C 1000 115, 1035 90, 1070 65"
                stroke="#FFB84D"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
                opacity="0.4"
                filter="blur(3px)"
              />
              <path
                d="M 20 330 C 60 325, 80 308, 105 300 C 160 280, 240 270, 305 260 C 390 245, 470 230, 540 218 C 620 205, 690 180, 750 168 C 820 152, 880 135, 945 125 C 1000 115, 1035 90, 1070 65"
                stroke="#FF9500"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
                filter="url(#goldenCurveShadow)"
              />

              {/* Summit Flagpole and Waving Golden Flag */}
              <g transform="translate(1065, 22)">
                {/* Pole */}
                <line x1="5" y1="5" x2="5" y2="44" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
                {/* Flag pole finial */}
                <circle cx="5" cy="5" r="2.5" fill="#F59E0B" />
                {/* Flag shape waving right */}
                <path
                  d="M 5 6 Q 22 2, 32 7 Q 38 10, 42 7 L 42 22 Q 35 25, 26 21 Q 14 17, 5 23 Z"
                  fill="#FF8A00"
                  stroke="#E66E00"
                  strokeWidth="0.8"
                />
              </g>

              {/* Milestone Dots along curve */}
              <circle cx="105" cy="300" r="5.5" fill="#1E293B" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="305" cy="260" r="5" fill="#1E293B" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="540" cy="218" r="5.5" fill="#FF9500" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="750" cy="168" r="5.5" fill="#1E293B" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="945" cy="125" r="7" fill="#FF9500" stroke="#FFFFFF" strokeWidth="2.5" />
              <circle cx="1070" cy="65" r="5.5" fill="#D97706" stroke="#FFFFFF" strokeWidth="2" />
            </svg>

            {/* Suspended Milestone Cards */}
            {CARD_NODES.map((node) => {
              const m = milestones[node.index];
              if (!m) return null;
              const isGoal = m.isGoal;

              return (
                <div
                  key={m.id}
                  id={`stage-card-${m.id}`}
                  onClick={() => setSelectedMilestone(m)}
                  style={{
                    left: `${node.leftPercent}%`,
                    top: `${node.cardTop}px`,
                  }}
                  className="absolute z-10 w-[158px] sm:w-[168px] -translate-x-1/2 cursor-pointer group"
                >
                  <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-4 shadow-[0_10px_25px_rgba(40,30,20,0.06)] border border-slate-100 hover:border-amber-400/80 hover:shadow-[0_14px_30px_rgba(255,149,0,0.18)] transition-all duration-200 transform group-hover:-translate-y-1.5 flex flex-col gap-2 relative">
                    {/* Top Icon Badge — dynamic company logo (goal keeps the summit flag) */}
                    <div className="mb-0.5">
                      {isGoal ? (
                        <div className="w-8 h-8 rounded-full bg-[#1E293B] text-white flex items-center justify-center shadow-md">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 21V4M5 4h11l-2.5 4L16 12H5"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="white"
                              fillOpacity="0.2"
                            />
                          </svg>
                        </div>
                      ) : (
                        <CompanyLogo company={m.company} size="sm" shape="rounded" />
                      )}
                    </div>

                    {/* Period Subtitle */}
                    <span className="text-[11px] font-semibold text-slate-400 tracking-tight">
                      {isGoal
                        ? m.year
                          ? isFrench
                            ? `Objectif ${m.year}`
                            : `Goal ${m.year}`
                          : isFrench
                            ? 'Prochain Objectif'
                            : 'Next Goal'
                        : (m.yearRange || m.year)}
                    </span>

                    {/* Role Title */}
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 leading-snug group-hover:text-[#FF7A00] transition-colors">
                      {m.role}
                    </h4>

                    {/* Brief Description */}
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">
                      {m.description || (isFrench ? 'Expertise technique et impact majeur.' : 'Technical expertise and high-impact delivery.')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Metrics Bar (5 Metric Cards) */}
        <div className="relative z-20 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 pt-4 border-t border-amber-200/50">
          {/* Card 1: Missions Completed */}
          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF7A00] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-black text-slate-900 leading-none block">
                  {totalMissions}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {isFrench ? 'Missions Réalisées' : 'Missions Completed'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </div>

          {/* Card 2: Certifications */}
          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1E293B] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-black text-slate-900 leading-none block">
                  {certificationsCount}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {isFrench ? 'Certifications' : 'Certifications'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </div>

          {/* Card 3: Stages Completed */}
          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF9500] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-black text-slate-900 leading-none block">
                  {milestones.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {isFrench ? 'Étapes Franchies' : 'Stages Completed'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </div>

          {/* Card 4: Current Roles */}
          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1E293B] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-black text-slate-900 leading-none block">
                  {successRate}%
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {isFrench ? 'Postes Actuels' : 'Current Roles'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </div>

          {/* Card 5: Technologies */}
          <div className="col-span-2 sm:col-span-1 bg-white/90 backdrop-blur-xs rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-xs flex items-center justify-between group hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF9500] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-black text-slate-900 leading-none block">
                  {uniqueTechs}+
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {isFrench ? 'Technologies' : 'Technologies'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </div>
        </div>
      </div>

      {/* Collapsible Deep-Dive Detailed Breakdown */}
      {showDetailDrawer && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#FF7A00]" />
                <span>{isFrench ? 'Détail Chronologique et Missions Réalisées' : 'Detailed Timeline & Key Missions'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isFrench ? 'Cliquez sur une étape pour afficher ses technologies et missions.' : 'Click on any milestone to view its missions and stack.'}
              </p>
            </div>
          </div>

          {milestones.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              {isFrench
                ? 'Aucune expérience enregistrée pour le moment.'
                : 'No experience recorded yet.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {milestones.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMilestone(m)}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/20 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-400">
                        {m.yearRange || m.year}
                      </span>
                      {m.isGoal ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[#FF7A00] text-[10px] font-bold">
                          {isFrench ? 'Objectif Cible' : 'Goal'}
                        </span>
                      ) : m.isCurrent ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {isFrench ? 'Actuel' : 'Current'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 text-[10px] font-semibold">
                          {isFrench ? 'Validé' : 'Completed'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-2.5">
                      {!m.isGoal && (
                        <CompanyLogo company={m.company} size="sm" shape="rounded" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-[#FF7A00] transition-colors">
                          {m.role}
                        </h4>
                        {m.company && (
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            {m.company}
                          </p>
                        )}
                      </div>
                    </div>

                    {m.description && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    )}
                  </div>

                  {m.technologies && m.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-200/60">
                      {m.technologies.slice(0, 3).map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600 font-medium">
                          {t}
                        </span>
                      ))}
                      {m.technologies.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-medium self-center pl-1">
                          +{m.technologies.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Milestone detail popup */}
      <MilestoneModal
        milestone={selectedMilestone}
        onClose={() => setSelectedMilestone(null)}
        locale={locale}
      />
    </div>
  );
}