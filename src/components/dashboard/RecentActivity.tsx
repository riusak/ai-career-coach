'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowUpRight,
  Award,
  Briefcase,
  CheckCircle2,
  FileSearch,
  FileText,
  GraduationCap,
  Upload,
  Video,
} from 'lucide-react';
import type { DashboardActivity, DashboardActivityType } from '@/types/dashboard';
import { formatRelativeTime } from '@/lib/dashboard/relative-time';

interface RecentActivityProps {
  activities: DashboardActivity[];
}

const TYPE_STYLES: Record<DashboardActivityType, { Icon: typeof Upload; bg: string }> = {
  cv: { Icon: Upload, bg: 'bg-blue-50 text-blue-600' },
  analysis: { Icon: FileSearch, bg: 'bg-emerald-50 text-emerald-600' },
  experience: { Icon: Briefcase, bg: 'bg-brand-50 text-brand-500' },
  education: { Icon: GraduationCap, bg: 'bg-purple-50 text-purple-600' },
  certification: { Icon: Award, bg: 'bg-amber-50 text-amber-600' },
  skill: { Icon: FileText, bg: 'bg-navy-50 text-navy-600' },
  interview: { Icon: Video, bg: 'bg-sky-50 text-sky-600' },
};

/**
 * Number of activity rows shown on the dashboard — kept in step with the CV
 * cards (max 3) so the two side-by-side cards have harmoniously matching
 * heights. The « Voir l'historique » link points to the full history.
 */
const ACTIVITY_DISPLAY_LIMIT = 3;

/**
 * « Activité Récente » — migrated from the template. Entries are derived
 * server-side from existing row timestamps (no dedicated activity table for
 * the MVP); timestamps are rendered as locale-aware relative times.
 */
export default function RecentActivity({ activities }: RecentActivityProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const visibleActivities = activities.slice(0, ACTIVITY_DISPLAY_LIMIT);

  return (
    <div
      id="recent-activity-card"
      className="flex h-auto flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 lg:h-full lg:p-7"
    >
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 sm:text-lg">{t('recentActivity')}</h3>
        <Link
          href="/dashboard/cvs"
          className="group flex items-center gap-1 text-xs font-semibold text-brand-500 transition-colors hover:text-brand-600"
        >
          <span>{t('activityViewHistory')}</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {visibleActivities.length === 0 ? (
        <div className="my-auto flex flex-col items-center gap-1 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">{t('emptyActivityTitle')}</p>
          <p className="max-w-xs text-xs text-slate-500">{t('emptyActivityDesc')}</p>
        </div>
      ) : (
        <div className="my-auto flex flex-1 flex-col justify-around space-y-2">
          {visibleActivities.map((activity) => {
            const { Icon, bg } = TYPE_STYLES[activity.type];
            return (
              <div
                key={activity.id}
                className="flex items-center justify-between gap-2.5 rounded-xl p-1 transition-colors hover:bg-slate-50/70"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-xs font-bold leading-snug text-slate-900">
                      {t(activity.titleKey)}
                    </h4>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{activity.detail}</p>
                  </div>
                </div>
                <span className="ml-2 flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10px] font-medium text-slate-400 xl:text-[11px]">
                  {typeof activity.score === 'number' && (
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      {activity.score}%
                    </span>
                  )}
                  {formatRelativeTime(activity.at, locale)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
