'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  Database,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  TrendingUp,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  deleteResumeAction,
  flashUploadResumeAction,
  setPrimaryResumeAction,
  unsetPrimaryResumeAction,
} from '@/app/dashboard/resume/actions';
import JobMatchModal from '@/app/dashboard/matching/JobMatchModal';
import PageGuideToggle from '@/components/dashboard/onboarding/PageGuideToggle';
import PageOnboardingGuide from '@/components/dashboard/onboarding/PageOnboardingGuide';
import { usePageGuide } from '@/components/dashboard/onboarding/usePageGuide';
import { startDashboardTour } from '@/lib/dashboard/tour-events';
import CVPreviewModal from '@/components/dashboard/CVPreviewModal';
import ErrorModal from '@/components/ui/ErrorModal';
import Skeleton from '@/components/ui/Skeleton';
import { consumePendingCvUploadFile } from '@/lib/pending-cv-upload';
import {
  RESUME_ACCEPT_ATTRIBUTE,
  formatBytes,
  validateResumeFile,
} from '@/lib/resume-validation';
import { formatRelativeTime } from '@/lib/dashboard/relative-time';
import type { CvDetailData } from '@/types/dashboard';

type CvFilter = 'all' | 'primary' | 'high';
type PreviewTab = 'preview' | 'analysis';

/** Submit button aware of its parent form's pending state (useFormStatus). */
function ActionSubmitButton({
  children,
  className,
  title,
  ariaLabel,
}: {
  children: ReactNode;
  className: string;
  title?: string;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} title={title} aria-label={ariaLabel} className={className}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}

/** Star toggle promoting / demoting the CV's primary status (template pill). */
function PrimaryStarButton({ cv }: { cv: CvDetailData }) {
  const t = useTranslations('dashboard');
  const activeClass =
    'flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 shadow-2xs transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50';
  const idleClass =
    'flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-2xs transition-colors hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50';

  if (cv.isPrimary) {
    return (
      <form action={unsetPrimaryResumeAction} onClick={(event) => event.stopPropagation()}>
        <input type="hidden" name="resumeId" value={cv.id} />
        <ActionSubmitButton title={t('removePrimary')} ariaLabel={t('removePrimary')} className={activeClass}>
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
        </ActionSubmitButton>
      </form>
    );
  }
  return (
    <form action={setPrimaryResumeAction} onClick={(event) => event.stopPropagation()}>
      <input type="hidden" name="resumeId" value={cv.id} />
      <ActionSubmitButton title={t('setPrimary')} ariaLabel={t('setPrimary')} className={idleClass}>
        <Star className="h-4 w-4 text-slate-300" />
      </ActionSubmitButton>
    </form>
  );
}

/** Two-step destructive action — trash icon, then an inline confirmation. */
function DeleteCvButton({ cv }: { cv: CvDetailData }) {
  const t = useTranslations('dashboard');
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
        <form action={deleteResumeAction}>
          <input type="hidden" name="resumeId" value={cv.id} />
          <ActionSubmitButton
            title={t('previewConfirmDelete')}
            ariaLabel={t('previewConfirmDelete')}
            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-2 text-[11px] font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('deleteResume')}
          </ActionSubmitButton>
        </form>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          title={t('previewCancel')}
          aria-label={t('previewCancel')}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setConfirming(true);
      }}
      title={t('deleteResume')}
      aria-label={t('deleteResume')}
      className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

/** One KPI card of the metrics bar (template vector style). */
function KpiCard({
  icon,
  iconClassName,
  title,
  children,
}: {
  icon: ReactNode;
  iconClassName: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400">{title}</p>
        {children}
      </div>
    </div>
  );
}

/**
 * « Mes CVs Professionnels » — the client CV library (template « My CVs »).
 * Template-standard layout: back-to-dashboard header + document-count pill,
 * 4 executive KPI cards, full-width drag & drop upload zone (flash upload —
 * no redirect), search + filter pills and the clean vector card grid. Any CV
 * click opens the NATIVE preview modal (tabs « Aperçu Document / Diagnostic
 * ATS / Services IA ») in the same viewport — there is no standalone detail
 * route anymore. All mutations reuse the secured resume server actions.
 */
export default function CvsManagerView({ cvs }: { cvs: CvDetailData[] }) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const guide = usePageGuide('cvs');

  const inputRef = useRef<HTMLInputElement>(null);
  const bootstrappedRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<CvFilter>('all');
  /** Native preview modal state — `{ cv, tab }` or closed. */
  const [preview, setPreview] = useState<{ cv: CvDetailData; tab: PreviewTab } | null>(null);
  /** JobMatchModal deep-selection (navy « Matching » card button). */
  const [matchCvId, setMatchCvId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  /** Transient success flash shown inside the dropzone. */
  const [justUploaded, setJustUploaded] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const openFilePicker = useCallback(() => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  }, [isUploading]);

  /** Flash upload through the standard secured server action (no redirect). */
  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateResumeFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      setIsUploading(true);
      setUploadError(null);
      try {
        const formData = new FormData();
        formData.set('file', file);
        const result = await flashUploadResumeAction(formData);
        if (result.error || !result.resumeId) {
          setUploadError(result.error ?? t('cvsUploadErrorGeneric'));
          return;
        }
        setJustUploaded(result.fileName);
        // The catalogue is server-rendered: refresh brings the new card in.
        await router.refresh();
      } catch {
        setUploadError(t('cvsUploadErrorGeneric'));
      } finally {
        setIsUploading(false);
      }
    },
    [router, t]
  );

  // File parked by the dashboard « flash upload » quick action — consumed
  // exactly once on mount and pushed through the standard upload pipeline.
  // The call is deferred to a macrotask so the effect body never triggers a
  // synchronous setState (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (bootstrappedRef.current) {
      return;
    }
    bootstrappedRef.current = true;
    const pendingFile = consumePendingCvUploadFile();
    if (!pendingFile) {
      return;
    }
    const deferred = setTimeout(() => {
      void handleUpload(pendingFile);
    }, 0);
    return () => clearTimeout(deferred);
  }, [handleUpload]);

  // Auto-dismiss the success flash.
  useEffect(() => {
    if (!justUploaded) {
      return;
    }
    const timer = setTimeout(() => setJustUploaded(null), 5000);
    return () => clearTimeout(timer);
  }, [justUploaded]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset first so picking the same file twice still fires onChange.
    event.target.value = '';
    if (file) {
      void handleUpload(file);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleUpload(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  // Derived KPI data.
  const primaryCv = useMemo(() => cvs.find((cv) => cv.isPrimary) ?? null, [cvs]);
  const averageScore = useMemo(() => {
    const analyzed = cvs.filter((cv) => cv.score !== null);
    if (analyzed.length === 0) {
      return null;
    }
    return Math.round(
      analyzed.reduce((total, cv) => total + (cv.score ?? 0), 0) / analyzed.length
    );
  }, [cvs]);

  // Filtering — search on file name or label, then the active pill.
  const filteredCvs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return cvs.filter((cv) => {
      const matchesSearch =
        query.length === 0 ||
        cv.name.toLowerCase().includes(query) ||
        (cv.label ?? '').toLowerCase().includes(query);
      if (!matchesSearch) {
        return false;
      }
      if (filter === 'primary') {
        return cv.isPrimary;
      }
      if (filter === 'high') {
        return cv.score !== null && cv.score >= 80;
      }
      return true;
    });
  }, [cvs, searchQuery, filter]);

  // Light summaries for the JobMatchModal selector (same shape as matching).
  const cvSummaries = useMemo(
    () =>
      cvs.map((cv) => ({
        id: cv.id,
        name: cv.name,
        label: cv.label,
        isPrimary: cv.isPrimary,
        createdAt: cv.createdAt,
        score: cv.score,
        hasAnalysis: cv.score !== null,
        sizeBytes: cv.sizeBytes,
      })),
    [cvs]
  );

  const openPreview = (cv: CvDetailData, tab: PreviewTab) => {
    setPreview({ cv, tab });
  };

  const filterPills: Array<{ key: CvFilter; label: string }> = [
    { key: 'all', label: t('cvsFilterAll', { count: cvs.length }) },
    { key: 'primary', label: t('cvsFilterPrimary') },
    { key: 'high', label: t('cvsFilterHighScore') },
  ];

  return (
    <div className="space-y-6 pb-4">
      {/* Hidden file input — driven by the dropzone & the header CTA. */}
      <input
        ref={inputRef}
        type="file"
        accept={RESUME_ACCEPT_ATTRIBUTE}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Top Header Navigation Bar */}
      <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard"
            id="cvs-back-to-dashboard-btn"
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 hover:text-slate-900 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500 transition-transform group-hover:-translate-x-0.5" />
            {t('cvsBackToDashboard')}
          </Link>

          <div className="hidden h-6 w-px bg-slate-200 sm:block" />

          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              <span>{t('myResumes')}</span>
              <span className="rounded-full border border-orange-200 bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-brand-600">
                {t('cvsDocumentsStored', { count: cvs.length })}
              </span>
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">
              {t('myResumesSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center self-start sm:self-auto">
          <PageGuideToggle visible={guide.visible} onToggle={guide.toggle} />
          <button
            type="button"
            id="upload-new-cv-btn"
            onClick={openFilePicker}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(255,122,0,0.28)] transition-all hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 stroke-[2.5]" />
            )}
            {t('cvsUploadNew')}
          </button>
        </div>
      </header>

      {/* Page guide (hidden by default — revealed by the header toggle). */}
      {guide.visible && (
        <PageOnboardingGuide
          menu="cvs"
          onDismiss={guide.hide}
          onStartGlobalTour={() => startDashboardTour(pathname, (href) => router.push(href))}
        />
      )}

      {/* Top 4 Executive Stat Cards */}
      <section
        aria-label={t('cvsKpiAria')}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          title={t('cvsKpiTotalTitle')}
          iconClassName="bg-orange-50 text-brand-500"
          icon={<FileText className="h-5 w-5" />}
        >
          <p className="truncate text-lg font-black text-slate-900">
            {t('cvsKpiTotalValue', { count: cvs.length })}
          </p>
        </KpiCard>

        <KpiCard
          title={t('cvsKpiPrimaryTitle')}
          iconClassName="bg-emerald-50 text-emerald-500"
          icon={<Star className="h-5 w-5 fill-emerald-500 text-emerald-500" />}
        >
          {primaryCv ? (
            <p className="truncate text-base font-black text-slate-900" title={primaryCv.name}>
              {primaryCv.name}
            </p>
          ) : (
            <p className="truncate text-base font-bold text-slate-400">{t('cvsKpiPrimaryNone')}</p>
          )}
        </KpiCard>

        <KpiCard
          title={t('cvsKpiAvgScore')}
          iconClassName="bg-blue-50 text-blue-500"
          icon={<TrendingUp className="h-5 w-5" />}
        >
          <p className="truncate text-lg font-black text-slate-900">
            {averageScore !== null ? `${averageScore}%` : '—'}
          </p>
        </KpiCard>

        <KpiCard
          title={t('cvsKpiStorage')}
          iconClassName="bg-purple-50 text-purple-500"
          icon={<Database className="h-5 w-5" />}
        >
          <p className="flex items-center gap-1.5 truncate text-sm font-extrabold text-emerald-600">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {t('cvsKpiStorageValue')}
          </p>
        </KpiCard>
      </section>

      {/* Drag & Drop Upload Zone — template proportions & helper text */}
      <section id="upload" className="scroll-mt-24">
        <div
          role="button"
          tabIndex={0}
          aria-disabled={isUploading}
          aria-label={t('cvsDropzoneTitle')}
          onClick={() => {
            if (!isUploading) {
              openFilePicker();
            }
          }}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ' ') && !isUploading) {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragActive(false)}
          className={`flex min-h-[190px] cursor-pointer select-none flex-col items-center justify-center gap-2.5 rounded-3xl border-2 border-dashed bg-white px-6 py-10 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            isDragActive
              ? 'border-brand-500 bg-brand-50/50'
              : 'border-slate-200 hover:border-brand-400 hover:bg-brand-50/20'
          } ${isUploading ? 'pointer-events-none opacity-80' : ''}`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-brand-500">
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </span>
          <p className="text-base font-bold text-slate-900">
            {isUploading ? t('cvsDropzoneUploading') : t('cvsDropzoneTitle')}
          </p>
          <p className="max-w-md text-xs text-slate-500">{t('cvsDropzoneHint')}</p>
          {justUploaded !== null && (
            <p className="mt-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {justUploaded
                ? t('cvsDropzoneSuccessName', { name: justUploaded })
                : t('cvsDropzoneSuccess')}
            </p>
          )}
        </div>
      </section>

      {/* Search + filter pills */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            id="cvs-search-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('cvsSearchPlaceholder')}
            aria-label={t('cvsSearchPlaceholder')}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>

        <div
          role="group"
          aria-label={t('cvsKpiAria')}
          className="flex flex-wrap items-center gap-1 self-start rounded-xl bg-slate-100 p-1 text-xs font-bold"
        >
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setFilter(pill.key)}
              aria-pressed={filter === pill.key}
              className={`rounded-lg px-3 py-2 transition-all ${
                filter === pill.key
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* CV cards grid */}
      {cvs.length === 0 ? (
        // Empty library — dashed template card with the upload CTA.
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-brand-500">
            <FileText className="h-6 w-6" />
          </span>
          <h3 className="mb-1 text-base font-bold text-slate-800">{t('cvsEmptyTitle')}</h3>
          <p className="mb-4 text-xs leading-relaxed text-slate-500">{t('cvsEmptyDesc')}</p>
          <button
            type="button"
            onClick={openFilePicker}
            disabled={isUploading}
            className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('addFirstCv')}
          </button>
        </div>
      ) : filteredCvs.length === 0 ? (
        // No result for the active search/filters.
        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
            <Search className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-slate-800">{t('cvsNoResults')}</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilter('all');
            }}
            className="mt-3 text-xs font-bold text-brand-500 transition-colors hover:text-brand-600"
          >
            {t('cvsNoResultsReset')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {/* Shimmer skeleton mirroring the card being created — perceived
              performance: the flash upload feels already « in progress ». */}
          {isUploading && (
            <article
              aria-hidden="true"
              className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-14 w-full rounded-xl" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1 rounded-xl" />
                <Skeleton className="h-9 w-24 rounded-xl" />
              </div>
            </article>
          )}

          {filteredCvs.map((cv) => {
            const isHighScore = cv.score !== null && cv.score >= 80;
            const scoreChipClass =
              cv.score === null
                ? 'bg-slate-100 text-slate-400'
                : isHighScore
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800';

            return (
              <article
                key={cv.id}
                id={`cv-card-${cv.id}`}
                onClick={() => openPreview(cv, 'preview')}
                className={`group flex cursor-pointer flex-col rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${
                  cv.isPrimary
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card header — icon block, file name, star toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        cv.isPrimary ? 'bg-emerald-500 text-white' : 'bg-orange-50 text-brand-500'
                      }`}
                    >
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold text-slate-900" title={cv.name}>
                        {cv.name}
                      </h3>
                      <p
                        className="truncate text-xs text-slate-400"
                        title={cv.label ?? formatRelativeTime(cv.createdAt, locale)}
                      >
                        {cv.label ??
                          t('uploadedOn', { date: formatRelativeTime(cv.createdAt, locale) })}
                      </p>
                    </div>
                  </div>
                  <PrimaryStarButton cv={cv} />
                </div>

                {/* Badges row — primary status + file size */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {cv.isPrimary && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                      <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                      {t('cvsPrimaryBadgeShort')}
                    </span>
                  )}
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                    {cv.sizeBytes !== null ? formatBytes(cv.sizeBytes) : t('cvsSizeUnknown')}
                  </span>
                </div>

                {/* Global ATS Score card preview block */}
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-9 min-w-11 items-center justify-center rounded-lg px-1.5 text-xs font-black ${scoreChipClass}`}
                    >
                      {cv.score !== null ? `${cv.score}%` : '—'}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-bold text-slate-700">
                        {t('cvsScoreGlobal')}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400">
                        {cv.score === null
                          ? t('cvsNoScore')
                          : isHighScore
                            ? t('cvsScoreOptimized')
                            : t('cvsScoreImprove')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openPreview(cv, 'analysis');
                    }}
                    title={t('cvsDetails')}
                    className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-brand-500 transition-colors hover:text-brand-600"
                  >
                    {t('cvsDetails')}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Card footer actions — navy/orange template standard */}
                <div
                  className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => openPreview(cv, 'preview')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-200"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-600" />
                    {t('cvsPreviewDoc')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMatchCvId(cv.id)}
                    title={t('cvsMatchingTitle')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-2xs transition-all hover:bg-slate-800 active:scale-95"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-amber-400" />
                    <span className="hidden sm:inline">{t('cvsMatching')}</span>
                  </button>

                  <DeleteCvButton cv={cv} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Native CV preview & services modal — same viewport, no route change.
          Keyed per CV so each document remounts with fresh tab/state. */}
      {preview && (
        <CVPreviewModal
          key={preview.cv.id}
          cv={preview.cv}
          initialTab={preview.tab}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Job matching modal — preselected CV, redirects to the matching
          studio once the offer is queued. */}
      <JobMatchModal
        open={matchCvId !== null}
        onClose={() => setMatchCvId(null)}
        cvs={cvSummaries}
        initialResumeId={matchCvId}
        redirectOnQueue
      />

      {/* Blocking upload error modal (client validation or server failure). */}
      <ErrorModal
        open={uploadError !== null}
        title={t('cvsUploadErrorTitle')}
        description={uploadError ?? ''}
        actionLabel={tCommon('retry')}
        onAction={() => setUploadError(null)}
      />
    </div>
  );
}







