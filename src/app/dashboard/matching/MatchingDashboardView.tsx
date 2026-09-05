'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Briefcase,
  Clock,
  FileSearch,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { deleteJobMatchingAction, getLatestMatchingAction } from './actions';
import JobMatchModal from './JobMatchModal';
import LatestMatchingCard from './LatestMatchingCard';
import MatchingReport from './MatchingReport';
import { parseJobMatchingDetails } from '@/lib/analysis/matching-output';
import type { CvSummaryData } from '@/types/dashboard';
import type { JobMatching, JobMatchingSummary } from '@/types/matching';

/**
 * Job-Matching dashboard (Phase 5.2 — Step A). Client studio:
 *  — CV selector + "New matching" button opening the JobMatchModal;
 *  — history grid (latest first); clicking a card loads its full report via
 *    the read-only server action and renders MatchingReport inline;
 *  — delete reuses the server action, then reloads to refresh the RSC list.
 */

interface MatchingDashboardViewProps {
  cvs: CvSummaryData[];
  matchings: JobMatchingSummary[];
  primaryCvId: string | null;
  /**
   * Id of a matching queued from the dashboard quick-access modal
   * (?queued=<id>) — renders the live processing/result panel on arrival.
   */
  queuedMatchingId?: string | null;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { dateStyle: 'medium' });
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

export default function MatchingDashboardView({
  cvs,
  matchings,
  primaryCvId,
  queuedMatchingId = null,
}: MatchingDashboardViewProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const router = useRouter();

  const [selectedCvId, setSelectedCvId] = useState<string>(
    primaryCvId ?? cvs[0]?.id ?? ''
  );
  const [modalOpen, setModalOpen] = useState(false);
  /** Frozen once so a re-render doesn't remount the live card. */
  const [autoQueuedId] = useState<string | null>(queuedMatchingId);
  const [selectedMatchingId, setSelectedMatchingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobMatching | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const openDetail = (matchingId: string) => {
    if (matchingId === selectedMatchingId) {
      return; // already visible
    }
    setSelectedMatchingId(matchingId);
    setDetailLoading(true);
    setDetailError(null);
    void getLatestMatchingAction(matchingId)
      .then((row) => {
        setDetail(row);
        setDetailLoading(false);
      })
      .catch(() => {
        setDetailError(t('matchingDetailError'));
        setDetailLoading(false);
      });
  };

  const detailParsed = detail ? parseJobMatchingDetails(detail.matching_details) : null;
  const detailResult = detailParsed?.result ?? null;

  return (
    <div id="matching-dashboard-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-brand-500">
              <Briefcase className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t('matchingTitle')}
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{t('matchingSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={cvs.length === 0}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t('matchingNewCta')}
        </button>
      </div>

      {/* CV selector for the new matching */}
      {cvs.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label htmlFor="matching-cv-select" className="text-xs font-bold text-slate-600">
            {t('matchingSelectCvForNew')}
          </label>
          <select
            id="matching-cv-select"
            value={selectedCvId}
            onChange={(event) => setSelectedCvId(event.target.value)}
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {cvs.map((cv) => (
              <option key={cv.id} value={cv.id}>
                {cv.name}
                {cv.isPrimary ? ` · ${t('primaryBadge')}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Live panel for a matching queued from the dashboard quick modal */}
      {autoQueuedId && (
        <section className="rounded-3xl border border-brand-200 bg-brand-50/40 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileSearch className="h-4 w-4 text-brand-500" />
            {t('matchingQuickResultTitle')}
          </h2>
          <LatestMatchingCard
            key={autoQueuedId}
            matchingId={autoQueuedId}
            initialMatching={null}
            onCompleted={() => {
              // Refresh the RSC history list once the worker is done.
              void router.refresh();
            }}
          />
        </section>
      )}

      {/* History */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">{t('matchingHistoryTitle')}</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            {matchings.length}
          </span>
        </div>

        {cvs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-900">{t('matchingRequiresCv')}</p>
            <p className="mt-1 text-xs text-slate-500">{t('matchingRequiresCvDesc')}</p>
          </div>
        ) : matchings.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/30 px-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-500">
              <FileSearch className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              {t('matchingEmptyTitle')}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500">{t('matchingEmptyDesc')}</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              {t('matchingNewCta')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {matchings.map((item) => {
              const selected = item.id === selectedMatchingId;
              return (
                <article
                  key={item.id}
                  onClick={() => openDetail(item.id)}
                  className={`flex cursor-pointer flex-col justify-between rounded-xl border bg-white p-4 shadow-xs transition-all ${
                    selected
                      ? 'border-brand-500 ring-1 ring-inset ring-brand-500/30'
                      : 'border-slate-200 hover:border-brand-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3
                          className="truncate text-sm font-bold text-slate-900"
                          title={item.jobTitle}
                        >
                          {item.jobTitle}
                        </h3>
                        <p className="truncate text-[11px] font-medium text-slate-500">
                          {[item.company, item.location].filter(Boolean).join(' • ') ||
                            t('matchingNoContext')}
                        </p>
                      </div>
                      <ScoreBadge score={item.matchScore} />
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                      <FileText className="h-3 w-3" />
                      {t('matchingCvUsed', { date: formatDate(item.createdAt, locale) })}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="text-[11px] font-semibold text-brand-600">
                      {selected ? t('matchingReportVisible') : t('matchingSeeReport')}
                    </span>
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
      </div>

      {/* Detail panel */}
      {selectedMatchingId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">{t('matchingDetailTitle')}</h2>
            <button
              type="button"
              onClick={() => {
                setSelectedMatchingId(null);
                setDetail(null);
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              {t('matchingCloseDetail')}
            </button>
          </div>
          {detailLoading && (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-xs">{t('matchingDetailLoading')}</span>
            </div>
          )}
          {detailError && (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
            >
              {detailError}
            </p>
          )}
          {detail && detailResult && (
            <MatchingReport
              result={detailResult}
              jobTitle={detail.job_title}
              company={detail.company ?? detailResult.company}
              location={detail.location ?? detailResult.location}
              completedAt={detail.created_at}
            />
          )}
          {detail && !detailResult && detail.match_score === null && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 text-center text-xs text-amber-800">
              {t('matchingStillPending')}
            </div>
          )}
        </div>
      )}

      <JobMatchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        cvs={cvs}
        initialResumeId={selectedCvId}
      />
    </div>
  );
}