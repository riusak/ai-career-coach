'use client';

import Link from 'next/link';
import { useActionState, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  Clock,
  FileSearch,
  FileText,
  Trash2,
} from 'lucide-react';
import ResumeUploader from '@/app/dashboard/resume/ResumeUploader';
import {
  analyzeResumeAction,
  deleteResumeAction,
  setPrimaryResumeAction,
  unsetPrimaryResumeAction,
  type ResumeActionState,
} from '@/app/dashboard/resume/actions';
import DownloadResumeButton from '@/components/dashboard/DownloadResumeButton';
import type { CvSummaryData } from '@/types/dashboard';
import { formatRelativeTime } from '@/lib/dashboard/relative-time';

type SectionAction = (formData: FormData) => Promise<void>;

function bindAction(
  fn: (formData: FormData) => Promise<void>
): SectionAction {
  return fn;
}

/** Submit button aware of its parent form's pending state (useFormStatus). */
function ActionSubmitButton({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} title={title} className={className}>
      {children}
    </button>
  );
}

/** Primary toggle promoting / demoting the CV's primary status. */
function PrimaryToggleForm({ cv, className }: { cv: CvSummaryData; className: string }) {
  const t = useTranslations('dashboard');
  if (cv.isPrimary) {
    return (
      <form action={bindAction(unsetPrimaryResumeAction)}>
        <input type="hidden" name="resumeId" value={cv.id} />
        <ActionSubmitButton
          title={t('removePrimary')}
          className={className}
        >
          <BadgeCheck className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {t('primaryBadge')}
        </ActionSubmitButton>
      </form>
    );
  }
  return (
    <form action={bindAction(setPrimaryResumeAction)}>
      <input type="hidden" name="resumeId" value={cv.id} />
      <ActionSubmitButton title={t('setPrimary')} className={className}>
        <BadgeCheck className="h-3.5 w-3.5 text-slate-400" />
        {t('setPrimary')}
      </ActionSubmitButton>
    </form>
  );
}

/** Queues a targeted deep analysis through the existing pipeline. */
function AnalyzeCvForm({ cv }: { cv: CvSummaryData }) {
  const t = useTranslations('dashboard');
  const initialState: ResumeActionState = { success: false, message: null };
  const [state, formAction, pending] = useActionState(analyzeResumeAction, initialState);

  if (state.success) {
    // Compact badge in the actions row + the full hint on its own line — a
    // long inline paragraph would break the card's structured layout.
    return (
      <>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
          <Clock className="h-3.5 w-3.5" />
          {t('cvsQueuedBadge')}
        </span>
        <p className="w-full text-[11px] font-medium leading-snug text-slate-500">
          <Clock className="mr-1 inline h-3.5 w-3.5 text-brand-500" />
          {t('cvsQueuedHint')}
        </p>
      </>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="resumeId" value={cv.id} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 shadow-sm transition-colors hover:border-brand-400 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileSearch className="h-3.5 w-3.5" />
        {pending ? t('cvsAnalyzePending') : t('cvsAnalyze')}
      </button>
    </form>
  );
}

/** Two-step destructive action with an inline confirmation. */
function DeleteCvForm({ cv }: { cv: CvSummaryData }) {
  const t = useTranslations('dashboard');
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title={t('deleteResume')}
        className="cursor-pointer rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 transition-colors hover:bg-red-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="max-w-[220px] text-[10px] font-semibold leading-tight text-red-700">
        {t('deleteConfirm', { name: cv.name })}
      </span>
      <form action={bindAction(deleteResumeAction)} className="flex items-center gap-1">
        <input type="hidden" name="resumeId" value={cv.id} />
        <ActionSubmitButton
          className="cursor-pointer rounded-lg bg-red-600 px-2 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-red-700"
          title={t('deleteResume')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </ActionSubmitButton>
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="cursor-pointer rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Dedicated CVs management view (template « My CVs »): header with document
 * count, upload dropzone (existing ResumeUploader) and the responsive card
 * grid — primary toggle, targeted AI analysis, detail link, download and a
 * two-step delete. All mutations run through the secured resume server
 * actions and revalidate this page.
 */
export default function CvsManagerView({ cvs }: { cvs: CvSummaryData[] }) {
  const t = useTranslations('dashboard');
  const locale = useLocale();

  const analyzedCount = cvs.filter((cv) => cv.hasAnalysis).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-black tracking-tight text-slate-900">
            {t('myResumes')}
            <span className="rounded-full border border-orange-200 bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-brand-600">
              {t('resumeCount', { count: cvs.length })}
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t('myResumesSubtitle')}</p>
        </div>
        <p className="text-xs font-semibold text-slate-400">
          {analyzedCount > 0
            ? t('cvsAnalyzedCount', { count: analyzedCount })
            : t('cvsNoScore')}
        </p>
      </div>

      {/* Empty state banner (upload form stays available below). */}
      {cvs.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-800">{t('catalogueEmptyTitle')}</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            {t('catalogueEmptyDesc')}
          </p>
        </div>
      )}

      {/* Upload section */}
      <section
        id="upload"
        className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6"
      >
        <h2 className="mb-3 text-base font-bold text-slate-900">{t('uploadResumeTitle')}</h2>
        <ResumeUploader />
      </section>

      {/* CV cards grid */}
      {cvs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cvs.map((cv) => {
            const scoreClass =
              cv.score === null
                ? 'text-slate-400'
                : cv.score >= 60
                  ? 'text-emerald-600'
                  : cv.score >= 50
                    ? 'text-brand-500'
                    : 'text-orange-600';
            return (
              <article
                key={cv.id}
                id={`cvs-card-${cv.id}`}
                className="flex flex-col justify-between gap-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-brand-500/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-900" title={cv.name}>
                          {cv.name}
                        </h3>
                        {cv.label && (
                          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                            {cv.label}
                          </p>
                        )}
                      </div>
                    </div>
                    {cv.isPrimary && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <BadgeCheck className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                        {t('primaryBadge')}
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 truncate pl-6 text-[11px] leading-snug text-slate-400" title={formatRelativeTime(cv.createdAt, locale)}>
                    {t('uploadedOn', { date: formatRelativeTime(cv.createdAt, locale) })}
                  </p>
                </div>

                {/* Score row */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-black ${scoreClass}`}>
                      {cv.score !== null ? `${cv.score}%` : '—'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {cv.hasAnalysis ? t('cvScoreLabel') : t('cvsNoScore')}
                    </span>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex flex-wrap items-center gap-2">
                  <AnalyzeCvForm cv={cv} />
                  <Link
                    href="/dashboard/matching"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-600"
                  >
                    <Briefcase className="h-3 w-3 text-amber-500" />
                    {t('cvsMatchOffer')}
                  </Link>
                  <PrimaryToggleForm
                    cv={cv}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Link
                    href={`/dashboard/resume/${cv.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-600"
                  >
                    {t('openResumePreview')}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                  <DownloadResumeButton
                    resumeId={cv.id}
                    fileName={cv.name}
                    label={t('previewDownload')}
                    errorLabel={t('previewDownloadError')}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-600"
                  />
                  <DeleteCvForm cv={cv} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
