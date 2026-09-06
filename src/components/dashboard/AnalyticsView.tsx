'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Activity,
  ArrowLeft,
  BarChart2,
  FileText,
  Flame,
  Mic,
  Target,
  TrendingUp,
  Video,
} from 'lucide-react';
import type { DashboardViewData } from '@/types/dashboard';
import PageGuideToggle from '@/components/dashboard/onboarding/PageGuideToggle';
import PageOnboardingGuide from '@/components/dashboard/onboarding/PageOnboardingGuide';
import { usePageGuide } from '@/components/dashboard/onboarding/usePageGuide';
import { startDashboardTour } from '@/lib/dashboard/tour-events';

interface AnalyticsViewProps {
  data: DashboardViewData;
}

/**
 * « Analyses et Statistiques » — template-styled analytics page (condensed
 * port of the template's AnalyticsView with real KPIs derived from the
 * dashboard data and the template's empty states for sections not backed yet).
 */
export default function AnalyticsView({ data }: AnalyticsViewProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isFrench = locale !== 'en';
  const guide = usePageGuide('analytics');

  const analyzedCvs = data.cvs.filter((cv) => cv.score !== null);
  const bestScore = analyzedCvs.reduce<number | null>(
    (best, cv) => (cv.score !== null && (best === null || cv.score > best) ? cv.score : best),
    null
  );
  const avgScore =
    analyzedCvs.length > 0
      ? Math.round(analyzedCvs.reduce((acc, cv) => acc + (cv.score ?? 0), 0) / analyzedCvs.length)
      : 0;

  // Chart 3 / migration 014 — the enriched career-objective baseline is the
  // reference dataset of the future career-fit evaluations.
  const goalMilestone = data.milestones.find((m) => m.isGoal) ?? null;

  const kpis = [
    {
      icon: FileText,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      label: isFrench ? 'CVs au catalogue' : 'CVs in catalogue',
      value: String(data.cvs.length),
    },
    {
      icon: Activity,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      label: isFrench ? 'Analyses terminées' : 'Completed analyses',
      value: String(analyzedCvs.length),
    },
    {
      icon: Target,
      iconBg: 'bg-orange-50',
      iconColor: 'text-[#FF7A00]',
      label: isFrench ? 'Score ATS moyen' : 'Average ATS score',
      value: analyzedCvs.length > 0 ? `${avgScore}%` : '—',
    },
    {
      icon: Flame,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      label: isFrench ? 'Meilleur score' : 'Best score',
      value: bestScore !== null ? `${bestScore}%` : '—',
    },
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 sm:gap-7 pb-16">
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
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30">
              {isFrench ? 'Performance & Progression' : 'Performance & Growth'}
            </span>
            <span className="text-xs font-medium text-slate-400 hidden md:inline">
              {isFrench
                ? 'Vos indicateurs de carrière en un coup d’œil'
                : 'Your career metrics at a glance'}
            </span>
          </div>
        </div>

        <PageGuideToggle visible={guide.visible} onToggle={guide.toggle} />
      </div>

      {/* Page guide (hidden by default — revealed by the header toggle). */}
      {guide.visible && (
        <PageOnboardingGuide
          menu="analytics"
          onDismiss={guide.hide}
          onStartGlobalTour={() => startDashboardTour(pathname, (href) => router.push(href))}
        />
      )}

      {/* Page title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {isFrench ? 'Analyses et Statistiques' : 'Analytics'}
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {isFrench
            ? 'Suivez la progression de votre profil et de vos candidatures.'
            : 'Track your profile and application progression.'}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5"
            >
              <div className={`w-11 h-11 rounded-2xl ${kpi.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${kpi.iconColor}`} />
              </div>
              <div className="min-w-0">
                <span className="block text-xl font-black text-slate-900 leading-none">
                  {kpi.value}
                </span>
                <span className="block text-[11px] font-semibold text-slate-500 mt-1 truncate">
                  {kpi.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Profile strength progression panel */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7">
        <div className="flex items-center gap-2.5 mb-5">
          <TrendingUp className="w-5 h-5 text-[#FF7A00]" />
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isFrench ? 'Force du profil' : 'Profile Strength'}
            </h3>
            <p className="text-xs text-slate-500">
              {isFrench
                ? 'Calculée à partir de votre identité, expériences, formations, compétences et CV.'
                : 'Computed from your identity, experiences, education, skills and CVs.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#FF7A00] transition-all duration-700 ease-out"
              style={{ width: `${data.isEmptyState ? 0 : data.profileStrength}%` }}
            />
          </div>
          <span className="shrink-0 text-sm font-black text-slate-900 tabular-nums">
            {data.isEmptyState ? 0 : data.profileStrength}%
          </span>
        </div>
      </div>

      {/* Chart 3 — career-objective baseline (reference for career-fit analytics) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7">
        <div className="flex items-center gap-2.5 mb-5">
          <Target className="w-5 h-5 text-[#FF7A00]" />
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isFrench ? 'Objectif de carrière' : 'Career goal'}
            </h3>
            <p className="text-xs text-slate-500">
              {isFrench
                ? 'Référence de votre objectif — base des futures évaluations de compatibilité carrière.'
                : 'Reference of your goal — baseline for future career-fit evaluations.'}
            </p>
          </div>
        </div>

        {goalMilestone ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl bg-[#FAF8F5] border border-[#F2EDE4]/80 p-4">
              <div className="min-w-0">
                <p className="text-base font-black text-slate-900 truncate">{goalMilestone.role}</p>
                {goalMilestone.year && (
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {isFrench ? `Objectif ${goalMilestone.year}` : `Goal ${goalMilestone.year}`}
                  </p>
                )}
              </div>
            </div>

            {goalMilestone.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{goalMilestone.description}</p>
            )}

            {(goalMilestone.targetTechnologies?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  {isFrench ? 'Technologies cibles' : 'Target technologies'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {goalMilestone.targetTechnologies?.map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(goalMilestone.targetSkills?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  {isFrench ? 'Compétences cibles' : 'Target skills'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {goalMilestone.targetSkills?.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center">
            <p className="text-sm text-slate-500 leading-relaxed">
              {isFrench
                ? 'Définissez votre objectif de carrière (poste cible + technologies/compétences) dans votre profil — il deviendra la référence des évaluations de compatibilité carrière.'
                : 'Set your career goal (target role + technologies/skills) in your profile — it will become the reference for career-fit evaluations.'}
            </p>
            <button
              onClick={() => router.push('/dashboard/profile')}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF7A00] text-white text-xs font-bold hover:bg-[#E66E00] transition-colors cursor-pointer"
            >
              {isFrench ? 'Compléter mon objectif' : 'Complete my goal'}
            </button>
          </div>
        )}
      </div>

      {/* Simulation practice stats */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50">
            <Video className="w-5.5 h-5.5 text-purple-600" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900">
              {isFrench ? 'Simulations d’entretien' : 'Mock interviews'}
            </h3>
            <p className="text-xs text-slate-500">
              {isFrench
                ? 'Votre entraînement à l’oral (méthode STAR) et vos scores en un coup d’œil.'
                : 'Your STAR-method interview practice and scores at a glance.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/mock')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#FF7A00] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#E66E00] cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            {isFrench ? 'Lancer une simulation' : 'Start a mock interview'}
          </button>
        </div>

        {data.simulations.total > 0 ? (
          <>
            <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {[
                {
                  label: isFrench ? 'Simulations lancées' : 'Sessions started',
                  value: String(data.simulations.total),
                },
                {
                  label: isFrench ? 'Terminées' : 'Completed',
                  value: String(data.simulations.completed),
                },
                {
                  label: isFrench ? 'En cours' : 'In progress',
                  value: String(data.simulations.inProgress),
                },
                {
                  label: isFrench ? 'Score moyen' : 'Average score',
                  value: data.simulations.averageScore !== null ? `${data.simulations.averageScore}%` : '—',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
                >
                  <span className="block text-xl font-black text-slate-900 leading-none tabular-nums">
                    {stat.value}
                  </span>
                  <span className="block text-[11px] font-semibold text-slate-500 mt-1">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              {data.simulations.bestScore !== null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {isFrench
                    ? `Meilleur score : ${data.simulations.bestScore}%`
                    : `Best score: ${data.simulations.bestScore}%`}
                </span>
              )}
            </p>
          </>
        ) : (
          <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-purple-400" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              {isFrench ? 'Aucune simulation pour le moment' : 'No mock interview yet'}
            </h4>
            <p className="max-w-md text-xs text-slate-500 leading-relaxed">
              {isFrench
                ? 'Lancez votre première simulation d’entretien : votre coach IA joue le recruteur, débriefe chaque réponse et vous remet un bilan STAR complet.'
                : 'Start your first mock interview: your AI coach plays the recruiter, debriefs each answer and hands you a full STAR report.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}