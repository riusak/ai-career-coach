'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight, FileText, MoreHorizontal, Plus } from 'lucide-react';
import type { CvDetailData } from '@/types/dashboard';
import { formatRelativeTime } from '@/lib/dashboard/relative-time';

interface CVSectionProps {
  cvs: CvDetailData[];
  onOpenCv: (cv: CvDetailData) => void;
}

function scoreClass(score: number | null): string {
  if (score === null) return 'text-slate-400';
  if (score >= 60) return 'text-emerald-600';
  if (score >= 50) return 'text-brand-500';
  return 'text-orange-600';
}

/** Max number of CV cards displayed on the dashboard (« Tout voir » handles the rest). */
const DASHBOARD_CV_LIMIT = 3;

/**
 * « Vos CVs » — migrated from the template's CVSection. Cards carry the
 * latest completed analysis score (server-derived); the dashed card links
 * to the upload anchor of the resume page. Strictly capped at 3 documents:
 * the « Tout voir » link redirects to /dashboard/cvs for the full library.
 */
export default function CVSection({ cvs, onOpenCv }: CVSectionProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const visibleCvs = cvs.slice(0, DASHBOARD_CV_LIMIT);

  return (
    <div
      id="cv-section-card"
      className="flex h-auto flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 lg:h-full lg:p-7"
    >
      <div className="mb-2.5 flex shrink-0 items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 sm:text-lg">{t('cvSectionTitle')}</h3>
        <Link
          href="/dashboard/cvs"
          className="group flex items-center gap-1 text-xs font-semibold text-brand-500 transition-colors hover:text-brand-600"
        >
          <span>{t('cvSectionViewAll')}</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {cvs.length === 0 && (
        <p className="text-sm text-slate-500">{t('noUpload')}</p>
      )}

      <div className="grid grid-cols-1 items-start gap-2.5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3">
        {visibleCvs.map((cv) => (
          <div
            key={cv.id}
            id={`cv-card-${cv.id}`}
            onClick={() => onOpenCv(cv)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenCv(cv);
              }
            }}
            role="button"
            tabIndex={0}
            className="group flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3 transition-all hover:border-brand-500/60 hover:shadow-xs"
          >
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-1">
                {cv.isPrimary ? (
                  <span className="rounded-full bg-[#E8F8F0] px-1.5 py-0.5 text-[10px] font-bold text-[#10B981]">
                    {t('primaryBadge')}
                  </span>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenCv(cv);
                  }}
                  aria-label={cv.name}
                  className="cursor-pointer rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mb-1 flex items-start gap-1.5">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-brand-500" />
                <h4 className="truncate text-xs font-bold text-slate-900" title={cv.name}>
                  {cv.name}
                </h4>
              </div>

              <p className="pl-5 text-[10px] text-slate-400">
                {t('cvAddedOn', { date: formatRelativeTime(cv.createdAt, locale) })}
              </p>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5">
              <div className="flex items-center gap-1">
                <span className={`text-xs font-black ${scoreClass(cv.score)}`}>
                  {cv.score !== null ? `${cv.score}%` : '—'}
                </span>
                <span className="text-[10px] font-medium text-slate-400">{t('cvScoreLabel')}</span>
              </div>
              {cv.label && (
                <span className="max-w-[45%] truncate text-[10px] font-semibold text-slate-400" title={cv.label}>
                  {cv.label}
                </span>
              )}
            </div>
          </div>
        ))}

        <Link
          href="/dashboard/cvs#upload"
          id="upload-new-cv-dashed-card"
          className="group flex min-h-[105px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 p-3 text-center transition-all hover:border-brand-500 hover:bg-brand-50/20"
        >
          <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all group-hover:scale-105 group-hover:border-brand-500 group-hover:text-brand-500">
            <Plus className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold leading-tight text-slate-800 group-hover:text-brand-500">
            {t('cvUploadCard')}
          </span>
          <span className="mt-0.5 text-[9px] text-slate-400">{t('cvUploadFormats')}</span>
        </Link>
      </div>
    </div>
  );
}
