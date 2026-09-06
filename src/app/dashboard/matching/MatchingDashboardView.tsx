'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  FileSearch,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import { deleteJobMatchingAction, getLatestMatchingAction } from './actions';
import MatchingOfferForm from './MatchingOfferForm';
import LatestMatchingCard from './LatestMatchingCard';
import MatchingReport from './MatchingReport';
import PageGuideToggle from '@/components/dashboard/onboarding/PageGuideToggle';
import PageOnboardingGuide from '@/components/dashboard/onboarding/PageOnboardingGuide';
import { usePageGuide } from '@/components/dashboard/onboarding/usePageGuide';
import { startDashboardTour } from '@/lib/dashboard/tour-events';
import { parseJobMatchingDetails } from '@/lib/analysis/matching-output';
import type { CvSummaryData } from '@/types/dashboard';
import type { JobMatching, JobMatchingSummary } from '@/types/matching';

interface MatchingDashboardViewProps {
  cvs: CvSummaryData[];
  matchings: JobMatchingSummary[];
  primaryCvId: string | null;
  /**
   * Id of a matching queued from the dashboard quick-access modal
   * (?queued=<id>) — renders the live processing/result panel on arrival.
   */
  queuedMatchingId?: string | null;
  /**
   * Deep-link from the CV library (?cv=<id>): preselects the document in the
   * Step 1 grid. Ignored for unknown ids.
   */
  initialCvId?: string | null;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { dateStyle: 'medium' });
}

/** Completed matching diagnostic of a row (defensive parse), or null. */
function matchingResult(m: JobMatching) {
  return parseJobMatchingDetails(m.matching_details)?.result ?? null;
}

function ScoreBadge({ score }: { score: number | null }) {
  const tone =
    score === null
      ? 'bg-slate-100 text-slate-500 ring-slate-200'
      : score >= 80
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        : score >= 50
          ? 'bg-brand-50 text-brand-700 ring-brand-200'
          : 'bg-rose-50 text-rose-700 ring-rose-200';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${tone}`}
    >
      {score === null ? '…' : `${score}%`}
    </span>
  );
}

/** Trash icon firing the delete server action, then reloading the RSC list. */
function DeleteMatchingButton({
  matchingId,
  label,
  onDeleted,
}: {
  matchingId: string;
  label: string;
  onDeleted: () => void;
}) {
  const [pending, setPending] = useState(false);

  const handleDelete = () => {
    setPending(true);
    const formData = new FormData();
    formData.set('matchingId', matchingId);
    void deleteJobMatchingAction(formData)
      .then(() => {
        onDeleted();
        window.location.reload();
      })
      .catch(() => setPending(false));
  };

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        handleDelete();
      }}
      disabled={pending}
      title={label}
      aria-label={label}
      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}

/** Compact outcome status indicator for the Zone 2 header (IA active / Succès / Échec). */
function EvaluationStatusBadge({ state }: { state: 'running' | 'success' | 'failed' }) {
  const t = useTranslations('dashboard');
  if (state === 'success') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        {t('matchingStatusSuccess')}
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
        <AlertTriangle className="h-3 w-3" />
        {t('matchingStatusFailed')}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 ring-1 ring-inset ring-brand-200">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500 align-middle" />
      {t('matchingStatusRunning')}
    </span>
  );
}

export default function MatchingDashboardView({
  cvs,
  matchings,
  primaryCvId,
  queuedMatchingId = null,
  initialCvId = null,
}: MatchingDashboardViewProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isFrench = locale !== 'en';
  const t = useTranslations('dashboard');

  // Chart 7 — page guide state (hidden by default, header toggle to reveal).
  const guide = usePageGuide('matching');

  const selectedCvDefault =
    (initialCvId && cvs.some((cv) => cv.id === initialCvId) ? initialCvId : null) ??
    primaryCvId ??
    cvs[0]?.id ??
    null;
  const [selectedCvId, setSelectedCvId] = useState<string | null>(selectedCvDefault);
  const [liveMatch, setLiveMatch] = useState<JobMatching | null>(null);
  const [selectedMatchingId, setSelectedMatchingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobMatching | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  /** Outcome-header state: whether the live evaluation finished (Succès/Échec). */
  const [liveCompleted, setLiveCompleted] = useState(false);
  const [liveFailed, setLiveFailed] = useState(false);

  const selectedCv = cvs.find((cv) => cv.id === selectedCvId) ?? null;

  /** True when the Zone 2 header should read « Diagnostic du matching ». */
  const outcomeFinished =
    liveCompleted || (detail !== null && matchingResult(detail) !== null);

  const handleQueued = (matching: JobMatching) => {
    setLiveMatch(matching);
    setLiveCompleted(false);
    setLiveFailed(false);
    setSelectedMatchingId(null);
    setDetail(null);
    setDetailError(null);
    // Scroll to the outcome zone once it has rendered (state commit is async).
    window.setTimeout(() => {
      document.getElementById('matching-outcome')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);
  };

  const openDetail = async (id: string) => {
    if (id === selectedMatchingId) return;
    setSelectedMatchingId(id);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const row = await getLatestMatchingAction(id);
      setDetail(row);
    } catch {
      setDetailError(t('matchingDetailError'));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div id="job-matching-view" className="flex flex-col gap-6 sm:gap-7 pb-16">
      {/* Top header — back link, page title/subtitle, guide toggle. */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors shadow-2xs flex items-center gap-2 text-xs sm:text-sm font-bold cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
            <span>{isFrench ? 'Retour au Dashboard' : 'Back to Dashboard'}</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-700 border border-brand-500/25">
              {isFrench ? 'Adéquation IA' : 'AI Matching'}
            </span>
            <span className="text-xs font-medium text-slate-400 hidden md:inline">
              {isFrench
                ? 'Comparez votre CV à une offre et passez à la simulation.'
                : 'Compare your CV against an offer and jump to the interview.'}
            </span>
          </div>
        </div>

        <PageGuideToggle visible={guide.visible} onToggle={guide.toggle} />
      </div>

      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          <span>{t('matchingTitle')}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-medium">{t('matchingSubtitle')}</p>
      </div>
      {/* Page guide (hidden by default — revealed by the header toggle). */}
      {guide.visible && (
        <PageOnboardingGuide
          menu="matching"
          onDismiss={guide.hide}
          onStartGlobalTour={() => startDashboardTour(pathname, (href) => router.push(href))}
        />
      )}
      {/* ZONE 1 — action zone: Step 1 CV selection + Step 2 offer submission. */}
      {cvs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-3 text-base font-bold text-slate-900">{t('matchingRequiresCv')}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 leading-relaxed">
            {t('matchingRequiresCvDesc')}
          </p>
          <Link
            href="/dashboard/cvs"
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#FF7A00] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#E66E00]"
          >
            <Plus className="h-4 w-4" />
            <span>{t('cvsUploadNew')}</span>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-5">
            {/* Step 1 — CV selection grid. */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{t('matchingStepSelectCv')}</h3>
                </div>
                <span className="rounded-full border border-orange-200 bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-brand-600">
                  {t('matchingCvAvailableCount', { count: cvs.length })}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {cvs.map((cv) => {
                  const active = cv.id === selectedCvId;
                  return (
                    <button
                      key={cv.id}
                      type="button"
                      onClick={() => setSelectedCvId(cv.id)}
                      aria-pressed={active}
                      className={`flex cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                        active ? 'border-brand-400 bg-brand-50/50 ring-1 ring-inset ring-brand-200' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <FileText className={`h-4 w-4 shrink-0 ${active ? 'text-brand-600' : 'text-slate-400'}`} />
                        {cv.isPrimary && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            {t('matchingPrimaryBadge')}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs font-bold text-slate-800">{cv.name}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span>{t('matchingCvAtsScore')} :</span>
                        {cv.score !== null ? (
                          <span className="font-bold text-brand-600">{cv.score}%</span>
                        ) : (
                          <span className="font-medium">{t('cvsNoScore')}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2 — shared offer submission form (file / URL / text). */}
            <MatchingOfferForm
              resumeId={selectedCvId}
              selectedCvName={selectedCv?.name}
              onQueued={handleQueued}
            />
          </div>
        </div>
      )}
      {/* ZONE 2 — evaluation outcome: compact status → full central diagnostic.
          Shown while a run is queued (from the inline form, the quick-access
          deep-link or a history card), then seamlessly replaced by the full
          « Diagnostic du matching » card — never a stretched sidebar widget. */}
      {(liveMatch || selectedMatchingId || queuedMatchingId) && (
        <section
          id="matching-outcome"
          aria-live="polite"
          className="animate-fade-slide-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#FF7A00]">
                <FileSearch className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                  {outcomeFinished ? t('matchingDiagnosticTitle') : t('matchingEvalTitle')}
                </h2>
                <p className="truncate text-[11px] text-slate-500">{t('matchingEvalHint')}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <EvaluationStatusBadge
                state={
                  liveFailed || detailError
                    ? 'failed'
                    : outcomeFinished
                      ? 'success'
                      : 'running'
                }
              />
              <button
                type="button"
                onClick={() => {
                  setLiveMatch(null);
                  setLiveCompleted(false);
                  setLiveFailed(false);
                  setSelectedMatchingId(null);
                  setDetail(null);
                  setDetailError(null);
                }}
                className="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                {t('matchingCloseDetail')}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {/* Live run — compact status card that becomes the diagnostic. */}
            {liveMatch && !selectedMatchingId && (
              <LatestMatchingCard
                matchingId={liveMatch.id}
                initialMatching={liveMatch}
                onCompleted={() => setLiveCompleted(true)}
                onFailed={() => setLiveFailed(true)}
              />
            )}
            {!liveMatch && !selectedMatchingId && queuedMatchingId && (
              <LatestMatchingCard
                matchingId={queuedMatchingId}
                initialMatching={null}
                onCompleted={() => setLiveCompleted(true)}
                onFailed={() => setLiveFailed(true)}
              />
            )}

            {/* History card drill-down — loading / error / report states. */}
            {detailLoading && (
              <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50/60 p-8 text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-xs">{t('matchingDetailLoading')}</span>
              </div>
            )}
            {detailError && (
              <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                {detailError}
              </p>
            )}
            {detail && matchingResult(detail) && (
              <MatchingReport
                result={matchingResult(detail)!}
                jobTitle={detail.job_title}
                company={detail.company ?? matchingResult(detail)!.company}
                location={detail.location ?? matchingResult(detail)!.location}
                completedAt={detail.created_at}
                simulateHref={`/dashboard/mock?role=${encodeURIComponent(detail.job_title)}`}
              />
            )}
            {detail && !matchingResult(detail) && detail.match_score === null && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 text-center text-xs text-amber-800">
                {t('matchingStillPending')}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Recent matching history — template « Historique récent » block. */}
      <section className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base">
              <Clock className="h-4 w-4 text-brand-500" />
              {t('matchingHistoryTitle')}
            </h2>
            <p className="text-xs font-medium text-slate-500">{t('matchingHistorySubtitle')}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
            {t('matchingHistoryCount', { count: matchings.length })}
          </span>
        </div>

        {matchings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
            <FileSearch className="mx-auto h-7 w-7 text-slate-400" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">{t('matchingEmptyTitle')}</h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
              {t('matchingEmptyDesc')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {matchings.map((item) => {
              const sourceLabel = item.sourceType === 'file'
                ? t('matchingSourceFile')
                : item.sourceType === 'url'
                  ? t('matchingSourceUrl')
                  : item.sourceType === 'text'
                    ? t('matchingSourceText')
                    : null;
              const selected = selectedMatchingId === item.id;
              return (
                <article
                  key={item.id}
                  onClick={() => void openDetail(item.id)}
                  className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
                    selected ? 'border-[#FF7A00] bg-orange-50/30 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-bold text-slate-900 hover:text-[#FF7A00] transition-colors">
                        {item.jobTitle}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500">
                        {[item.company, item.location].filter(Boolean).join(' • ') || t('matchingNoContext')}
                      </p>
                    </div>
                    <ScoreBadge score={item.matchScore} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    {sourceLabel && (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        {sourceLabel}
                      </span>
                    )}
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(item.createdAt, locale)}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="text-[11px] font-semibold text-brand-600">
                      {selected ? t('matchingReportVisible') : t('matchingSeeReport')}
                    </span>
                    <Link
                      href={`/dashboard/mock?role=${encodeURIComponent(item.jobTitle)}`}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF7A00] hover:text-[#E66E00] hover:underline"
                    >
                      <Video className="h-3 w-3" />
                      <span>{t('matchingSimulateInterview')}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                    <DeleteMatchingButton
                      matchingId={item.id}
                      label={t('matchingDelete')}
                      onDeleted={() => {
                        if (selectedMatchingId === item.id) {
                          setSelectedMatchingId(null);
                          setDetail(null);
                        }
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}