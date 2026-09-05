import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import ResumeUploader from './ResumeUploader';
import ConfirmSubmitButton from './ConfirmSubmitButton';
import EmptyState from '@/components/ui/EmptyState';
import MatchOfferButton from './MatchWithOfferModal';
import ErrorState from '@/components/ui/ErrorState';
import {
  deleteResumeAction,
  setPrimaryResumeAction,
  unsetPrimaryResumeAction,
  updateResumeLabelAction,
} from './actions';
import { getUserResumes } from '@/lib/supabase/resumes';
import type { Resume } from '@/types/resume';

export async function generateMetadata() {
  const t = await getTranslations('dashboard');
  return { title: `${t('myResumes')} | ForPro AI` };
}

function formatDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === 'fr' ? 'fr-FR' : locale === 'de' ? 'de-DE' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

interface ResumeCardProps {
  resume: Resume;
  locale: string;
  // Pre-resolved translation strings (server component can't use hooks).
  labels: {
    primaryBadge: string;
    parsed: string;
    pendingParse: string;
    uploadedOn: (date: string) => string;
    noLabel: string;
    labelCategory: string;
    saveLabel: string;
    openPreview: string;
    setPrimary: string;
    removePrimary: string;
    delete: string;
    deleteConfirm: (name: string) => string;
  };
}

function PrimaryBadgeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-3 w-3"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ResumeCard({ resume, locale, labels }: ResumeCardProps) {
  return (
    <li className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="max-w-full truncate text-sm font-semibold text-navy-900" title={resume.file_name}>{resume.file_name}</p>
            {resume.is_primary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                <PrimaryBadgeIcon />
                {labels.primaryBadge}
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                resume.parsed_content
                  ? 'bg-green-100 text-green-700'
                  : 'bg-navy-100 text-navy-600'
              }`}
            >
              {resume.parsed_content ? labels.parsed : labels.pendingParse}
            </span>
          </div>
          <p className="mt-1 text-xs text-navy-500">
            {labels.uploadedOn(formatDateTime(resume.created_at, locale))}
          </p>
          <p className="mt-1 text-xs text-navy-500">
            {resume.label ? `${resume.label}` : labels.noLabel}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/resume/${resume.id}`}
            className="rounded-md border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-800"
          >
            {labels.openPreview}
          </Link>
          <MatchOfferButton resumeName={resume.file_name} canMatch={Boolean(resume.parsed_content)} />
          {resume.is_primary ? (
            <form action={unsetPrimaryResumeAction}>
              <input type="hidden" name="resumeId" value={resume.id} />
              <button
                type="submit"
                className="rounded-md border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 shadow-sm transition-colors hover:bg-navy-50"
              >
                {labels.removePrimary}
              </button>
            </form>
          ) : (
            <form action={setPrimaryResumeAction}>
              <input type="hidden" name="resumeId" value={resume.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-md border border-orange-400 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800 shadow-sm transition-colors hover:bg-orange-100"
              >
                <PrimaryBadgeIcon />
                {labels.setPrimary}
              </button>
            </form>
          )}
          <form action={deleteResumeAction}>
            <input type="hidden" name="resumeId" value={resume.id} />
            <ConfirmSubmitButton
              label={labels.delete}
              confirmMessage={labels.deleteConfirm(resume.file_name)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            />
          </form>
        </div>
      </div>

      <form
        action={updateResumeLabelAction}
        className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center"
      >
        <input type="hidden" name="resumeId" value={resume.id} />
        <label
          htmlFor={`label-${resume.id}`}
          className="shrink-0 text-xs font-medium text-navy-600"
        >
          {labels.labelCategory}
        </label>
        <input
          id={`label-${resume.id}`}
          name="label"
          type="text"
          maxLength={80}
          defaultValue={resume.label ?? ''}
          placeholder={resume.label ?? ''}
          className="w-full rounded-md border border-navy-200 bg-white px-3 py-1.5 text-xs text-navy-900 shadow-sm placeholder:text-navy-400 focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600 sm:flex-1"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-800"
        >
          {labels.saveLabel}
        </button>
      </form>
    </li>
  );
}

export default async function ResumePage() {
  const [locale, t, tCommon, tNav] = await Promise.all([
    getLocale(),
    getTranslations('dashboard'),
    getTranslations('common'),
    getTranslations('nav'),
  ]);
  const { data: resumes, error } = await getUserResumes();
  const resumeList = resumes ?? [];

  const labels = {
    primaryBadge: t('primaryBadge'),
    parsed: t('parsed'),
    pendingParse: t('pendingParse'),
    uploadedOn: (date: string) => t('uploadedOn', { date }),
    noLabel: t('noLabel'),
    labelCategory: t('labelCategory'),
    saveLabel: t('saveLabel'),
    openPreview: t('openResumePreview'),
    setPrimary: t('setPrimary'),
    removePrimary: t('removePrimary'),
    delete: t('deleteResume'),
    deleteConfirm: (name: string) => t('deleteConfirm', { name }),
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-orange-700">{t('resumeCatalogue')}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{tNav('myResumes')}</h1>
            <p className="mt-1 text-sm text-navy-600">{t('myResumesSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
              {t('resumeCount', { count: resumeList.length })}
            </span>
            <Link
              href="#upload"
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
            >
              {t('quickUpload')}
            </Link>
          </div>
        </div>

        {error && (
          <ErrorState
            title={tCommon('errorGeneric')}
            description={error}
          >
            <Link
              href="/dashboard/resume"
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
            >
              {tCommon('retry')}
            </Link>
          </ErrorState>
        )}

        <div id="upload" className="scroll-mt-8 rounded-xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-navy-900">
            {t('uploadResumeTitle')}
          </h2>
          <p className="mt-1 mb-6 text-sm text-navy-600">
            {t('uploadResumeHints')}
          </p>
          <ResumeUploader />
        </div>

        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900">
              {t('resumeCatalogue')}
            </h2>
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
              {resumeList.length} CV{resumeList.length === 1 ? '' : 's'}
            </span>
          </div>
          {resumeList.length > 0 ? (
            <ul className="mt-6 grid gap-5 sm:grid-cols-2">
              {resumeList.map((resume) => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  locale={locale}
                  labels={labels}
                />
              ))}
            </ul>
          ) : error ? (
            <p className="mt-4 text-sm text-navy-500">{tCommon('errorGeneric')}</p>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon="document"
                title={t('catalogueEmptyTitle')}
                description={t('catalogueEmptyDesc')}
                action={
                  <Link
                    href="#upload"
                    className="rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600"
                  >
                    {t('addFirstCv')}
                  </Link>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}