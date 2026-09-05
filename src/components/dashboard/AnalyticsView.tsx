'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Activity,
  ArrowLeft,
  BarChart2,
  FileText,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { DashboardViewData } from '@/types/dashboard';

interface AnalyticsViewProps {
  data: DashboardViewData;
}

/**
 * « Analytics » — template-styled analytics page (condensed port of the
 * template's AnalyticsView with real KPIs derived from the dashboard data
 * and the template's empty states for sections not backed yet).
 */
export default function AnalyticsView({ data }: AnalyticsViewProps) {
  const locale = useLocale();
  const router = useRouter();
  const isFrench = locale !== 'en';

  const analyzedCvs = data.cvs.filter((cv) => cv.score !== null);
  const bestScore = analyzedCvs.reduce<number | null>(
    (best, cv) => (cv.score !== null && (best === null || cv.score > best) ? cv.score : best),
    null
  );
  const avgScore =
    analyzedCvs.length > 0
      ? Math.round(analyzedCvs.reduce((acc, cv) => acc + (cv.score ?? 0), 0) / analyzedCvs.length)
      : 0;

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
      </div>

      {/* Page title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Analytics
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

      {/* Empty state for upcoming analytics */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
          <BarChart2 className="w-7 h-7 text-blue-500" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          {isFrench ? 'Graphiques détaillés bientôt disponibles' : 'Detailed charts coming soon'}
        </h3>
        <p className="max-w-md text-sm text-slate-500 leading-relaxed">
          {isFrench
            ? 'Historique des simulations et évolution des scores ATS apparaîtront dès vos prochaines analyses.'
            : 'Simulation history and ATS score evolution will appear with your next analyses.'}
        </p>
        <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
          {isFrench ? 'Bientôt disponible' : 'Coming soon'}
        </div>
      </div>
    </div>
  );
}