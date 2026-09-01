import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { Resume } from '@/types/resume';

interface ActivityStatsProps {
  resumes: Resume[];
}

const ANALYSIS_STATS = [
  {
    key: 'cvAnalyses',
    icon: 'chart',
    fallback: 0,
    compute: (resumes: Resume[]) => resumes.length,
  },
  {
    key: 'jobMatchings',
    icon: 'target',
    fallback: 0,
    compute: () => 0,
  },
  {
    key: 'mockInterviews',
    icon: 'mic',
    fallback: 0,
    compute: () => 0,
  },
] as const;

const ICONS = {
  chart: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  target: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  mic: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
    </svg>
  ),
} as const;

export default function ActivityStats({ resumes }: ActivityStatsProps) {
  const t = useTranslations('dashboard');

  return (
    <section className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
        {t('activityStats')}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ANALYSIS_STATS.map((stat) => {
          const value = stat.compute(resumes);
          const isComingSoon = stat.key !== 'cvAnalyses';
          return (
            <article
              key={stat.key}
              className={`rounded-xl border p-4 transition-colors ${
                isComingSoon
                  ? 'border-dashed border-navy-200 bg-navy-50/40'
                  : 'border-navy-100 bg-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    isComingSoon
                      ? 'bg-navy-100 text-navy-400'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {ICONS[stat.icon]}
                </span>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-600">
                  {t(stat.key)}
                </p>
              </div>
              <p
                className={`mt-3 text-3xl font-extrabold ${
                  isComingSoon ? 'text-navy-400' : 'text-navy-900'
                }`}
              >
                {value}
              </p>
              {isComingSoon && (
                <span className="mt-1 inline-flex rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-500">
                  {t('comingSoonBadge')}
                </span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

interface HistoryLogProps {
  resumes: Resume[];
  locale: string;
}

export function HistoryLog({ resumes, locale }: HistoryLogProps) {
  const t = useTranslations('dashboard');
  const recent = resumes.slice(0, 5);

  return (
    <section className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
        {t('historyTitle')}
      </p>
      {recent.length > 0 ? (
        <ul className="mt-4 divide-y divide-navy-100">
          {recent.map((resume) => (
            <li key={resume.id} className="py-3 first:pt-0 last:pb-0">
              <Link
                href={`/dashboard/resume/${resume.id}`}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-orange-50/50"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-navy-900">
                  {resume.is_primary && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 text-orange-600"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                  <span className="truncate">{resume.file_name}</span>
                </span>
                <span className="shrink-0 text-xs text-navy-500">
                  {t('uploadedOn', {
                    date: new Date(resume.created_at).toLocaleString(
                      locale === 'fr' ? 'fr-FR' : locale === 'de' ? 'de-DE' : 'en-US',
                      { dateStyle: 'medium', timeStyle: 'short' }
                    ),
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-navy-500">{t('noActivity')}</p>
      )}
    </section>
  );
}