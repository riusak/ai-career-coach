'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ArrowLeft, Sparkles, Video, Zap, Target, Clock } from 'lucide-react';

interface MockInterviewsViewProps {
  /** Target role passed from the dashboard quick-access modal (optional). */
  targetRole?: string | null;
}

/**
 * « Simulations d'Entretien » — template-styled Mock Interviews page
 * (condensed port of the template's MockInterviewsView with its header,
 * KPI strip and empty state). Live AI sessions arrive in a future sprint.
 */
export default function MockInterviewsView({ targetRole = null }: MockInterviewsViewProps) {
  const locale = useLocale();
  const router = useRouter();
  const isFrench = locale !== 'en';

  const stats = [
    { icon: Video, label: isFrench ? 'Sessions Totales' : 'Total Sessions', value: '0' },
    { icon: Target, label: isFrench ? 'Score Moyen' : 'Average Score', value: '—' },
    { icon: Zap, label: isFrench ? 'Meilleur Score' : 'Best Score', value: '—' },
    { icon: Clock, label: isFrench ? 'Temps Pratiqué' : 'Practice Time', value: '0h' },
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
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-600 border border-purple-500/30">
              {isFrench ? 'Entraînement IA' : 'AI Practice'}
            </span>
            <span className="text-xs font-medium text-slate-400 hidden md:inline">
              {isFrench
                ? 'Simulations vocales & écrites pour réussir vos entretiens'
                : 'Voice & written simulations to ace your interviews'}
            </span>
          </div>
        </div>
      </div>

      {/* Page title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {isFrench ? 'Simulations d’Entretien' : 'Mock Interviews'}
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {isFrench
            ? 'Entraînez-vous avec l’IA et réussissez vos entretiens techniques.'
            : 'Practice with AI and improve your interview skills.'}
        </p>
      </div>

      {/* Quick-access context (role picked from the dashboard modal) */}
      {targetRole && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-purple-200/70 bg-purple-50/60 px-4 py-3">
          <Target className="h-4 w-4 shrink-0 text-purple-600" />
          <p className="text-xs font-semibold text-slate-800">
            {isFrench
              ? `Préparation ciblée : ${targetRole}`
              : `Focused preparation: ${targetRole}`}
          </p>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5"
            >
              <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <span className="block text-xl font-black text-slate-900 leading-none">
                  {stat.value}
                </span>
                <span className="block text-[11px] font-semibold text-slate-500 mt-1 truncate">
                  {stat.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-purple-500" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          {isFrench ? 'Vos simulations apparaîtront ici' : 'Your practice sessions will appear here'}
        </h3>
        <p className="max-w-md text-sm text-slate-500 leading-relaxed">
          {isFrench
            ? 'Le simulateur d’entretien IA (audio & texte) arrive dans une prochaine itération. En attendant, entraînez-vous avec le matching d’offres.'
            : 'The AI interview simulator (audio & text) ships in an upcoming iteration. Meanwhile, practice with job offer matching.'}
        </p>
        <button
          onClick={() => router.push('/dashboard/matching')}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B1528] hover:bg-[#132238] text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <span>{isFrench ? 'Essayer le Job Matching' : 'Try Job Matching'}</span>
        </button>
      </div>
    </div>
  );
}