'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSearch,
  FileText,
  Layers,
  Loader2,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Video,
  X,
} from 'lucide-react';
import {
  analyzeResumeAction,
  deleteResumeAction,
  getLatestAnalysisAction,
  getResumeDownloadUrlAction,
  setPrimaryResumeAction,
} from '@/app/dashboard/resume/actions';
import { mapSubscores } from '@/lib/dashboard/adapters';
import { parseDeepAnalysisOutput } from '@/lib/analysis/deep-output';
import { parseQuickTestError } from '@/lib/quick-test/error-codes';
import { formatBytes } from '@/lib/resume-validation';
import type { QuickTestErrorPayload } from '@/lib/quick-test/error-codes';
import LoadingSteps from '@/components/ui/LoadingSteps';
import type { CvDetailData } from '@/types/dashboard';
import type { ResumeAnalysis } from '@/types/resume';
import { formatShortDate } from '@/lib/dashboard/relative-time';

type PreviewTab = 'preview' | 'analysis' | 'services';

interface CVPreviewModalProps {
  cv: CvDetailData;
  /** Opens the modal directly on a given tab (e.g. ATS analysis). */
  initialTab?: PreviewTab;
  /** Queues a FRESH analysis on open (dashboard « Diagnostic ATS » flow). */
  autoQueueAnalysis?: boolean;
  onClose: () => void;
}

const SUBSCORE_CARDS = [
  { key: 'previewSubImpact', color: 'emerald', Icon: TrendingUp, bar: 'bg-emerald-500' },
  { key: 'previewSubKeywords', color: 'brand', Icon: Layers, bar: 'bg-brand-500' },
  { key: 'previewSubGrammar', color: 'blue', Icon: ShieldCheck, bar: 'bg-blue-500' },
] as const;

const ICON_COLOR: Record<(typeof SUBSCORE_CARDS)[number]['color'], string> = {
  emerald: 'text-emerald-500',
  brand: 'text-brand-500',
  blue: 'text-blue-500',
};

/** How often the latest analysis row is re-fetched while queued. */
const POLL_INTERVAL_MS = 3_000;

/** Gives up on polling after 2 minutes (the pipeline may be down). */
const POLL_TIMEOUT_MS = 120_000;

/** Terminal pipeline statuses — the queued row is deleted server-side. */
const TERMINAL_STATUSES = [400, 413, 415, 422, 500, 502, 503];

/**
 * Rebuilds the modal payload from the FRESH analysis row returned by polling,
 * avoiding any stale server-rendered data (same mapping as the dashboard
 * adapters' buildCvDetails).
 */
function buildFreshCvDetail(base: CvDetailData, analysis: ResumeAnalysis): CvDetailData {
  const parsed =
    analysis.score !== null ? parseDeepAnalysisOutput(analysis.structured_output) : null;
  const deepAnalysis = parsed?.analysis ?? null;
  const topRecommendation = deepAnalysis?.recommendations[0] ?? null;
  const score =
    analysis.score !== null ? Math.max(0, Math.min(100, Math.round(analysis.score))) : null;

  return {
    ...base,
    score,
    subscores: deepAnalysis ? mapSubscores(deepAnalysis.scoreBreakdown, deepAnalysis.score) : null,
    summary: topRecommendation
      ? `${topRecommendation.title} — ${topRecommendation.detail}`
      : null,
    strengths: deepAnalysis?.strengths ?? [],
    weaknesses: deepAnalysis?.weaknesses ?? [],
    recommendations: deepAnalysis?.recommendations ?? [],
  };
}

/**
 * CV preview & ATS diagnostic modal — the validated template layout: document
 * preview tab, ATS analysis tab (score hero + the three sub-cards « Impact &
 * Chiffres », « Correspondance Mots-Clés », « Grammaire & Clarté » followed by
 * « Points Forts » and « Axes d'Amélioration »), and an AI-services tab.
 * All mutations reuse the existing resume server actions.
 */
export default function CVPreviewModal({
  cv,
  initialTab = 'preview',
  autoQueueAnalysis = false,
  onClose,
}: CVPreviewModalProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<PreviewTab>(initialTab);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isPdf = cv.name.toLowerCase().endsWith('.pdf');

  // Fresh-analysis state — the modal ALWAYS re-fetches the latest analysis
  // row (never trusts the possibly stale server-rendered payload), polls it
  // while queued and renders the outcome from the fresh structured_output.
  // `undefined` = initial fetch in flight, `null` = no analysis row at all.
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null | undefined>(undefined);
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  /** Last REAL pipeline stage reported by the worker (waiting-ticket index). */
  const [serverStage, setServerStage] = useState<number | null>(null);
  /** Terminal pipeline failure (queued row deleted server-side). */
  const [pipelineError, setPipelineError] = useState<QuickTestErrorPayload | null>(null);

  // PDF preview state — the document is rendered as-is through a short-lived
  // signed URL (iframe embed); raw parsed text stays the non-PDF fallback.
  // PDFs start in the « loading » state (the signed URL is fetched on mount).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewUrlState, setPreviewUrlState] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    () => (isPdf ? 'loading' : 'idle')
  );

  const isQueued = analysis !== undefined && analysis !== null && analysis.score === null;
  const queuedSteps = t.raw('queuedSteps') as string[];

  // NOTE: state is intentionally NEVER reset in an effect. The parent mounts
  // this modal with `<CVPreviewModal key={cv.id} … />` so React remounts the
  // whole tree per CV, giving us a fresh tab/delete-confirmation state for each
  // document without a cascading setState-in-effect.

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /** Queues a fresh deep analysis through the existing server action. */
  async function runAnalysis() {
    if (isQueueing) return;
    setIsQueueing(true);
    setQueueError(null);
    try {
      const formData = new FormData();
      formData.set('resumeId', cv.id);
      const result = await analyzeResumeAction({ success: false, message: null }, formData);
      if (!result.success) {
        setQueueError(result.message ?? t('previewAnalysisError'));
        return;
      }
      // Pick up the freshly queued row — the polling loop takes over.
      const latest = await getLatestAnalysisAction(cv.id);
      if (latest) {
        setAnalysis(latest);
      }
    } catch {
      setQueueError(t('previewAnalysisError'));
    } finally {
      setIsQueueing(false);
    }
  }

  // Initial load — fetch the latest analysis row fresh from the database.
  // In auto-queue mode (« Diagnostic ATS » quick action), a NEW analysis is
  // queued immediately unless one is already being processed.
  const autoQueuedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    getLatestAnalysisAction(cv.id)
      .then((latest) => {
        if (cancelled) return;
        setAnalysis(latest);
        const hasQueuedRow = latest !== null && latest.score === null;
        if (autoQueueAnalysis && !autoQueuedRef.current && !hasQueuedRow) {
          autoQueuedRef.current = true;
          void runAnalysis();
        }
      })
      .catch(() => {
        if (!cancelled) setAnalysis(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cv.id, autoQueueAnalysis]);

  // Polling loop — only active while an analysis is queued and not timed out.
  useEffect(() => {
    if (!isQueued || pollTimedOut || pipelineError) {
      return;
    }

    let cancelled = false;

    const poll = async (): Promise<void> => {
      try {
        setPollCount((count) => count + 1);
        const latest = await getLatestAnalysisAction(cv.id);
        if (cancelled || !latest) {
          return;
        }
        setAnalysis(latest);

        // Live stage sync with the transient processing marker persisted by
        // the worker (reading → analyzing → reporting), forward-only.
        if (latest.score === null) {
          const marker: unknown = latest.structured_output;
          if (
            typeof marker === 'object' &&
            marker !== null &&
            (marker as Record<string, unknown>).status === 'processing'
          ) {
            const stage = (marker as Record<string, unknown>).stage;
            const stageIndex =
              stage === 'analyzing'
                ? 1
                : stage === 'reporting'
                  ? 2
                  : stage === 'reading'
                    ? 0
                    : null;
            if (stageIndex !== null) {
              setServerStage((prev) => Math.max(prev ?? 0, stageIndex));
            }
          }
        }
      } catch {
        // Transient network/server error: keep polling until the timeout.
      }
    };

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setPollTimedOut(true);
      }
    }, POLL_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [isQueued, pollTimedOut, pipelineError, cv.id]);

  // Pipeline trigger — queueing only inserts a row (score null); the deep
  // analysis runs through POST /api/resume/analyze, fired exactly once per
  // queued row (fire-and-forget, never aborted). Self-healing on re-visits.
  const triggeredAnalysisIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isQueued || pollTimedOut || pipelineError) {
      return;
    }
    const queuedAnalysisId = analysis?.id;
    if (!queuedAnalysisId || triggeredAnalysisIdRef.current === queuedAnalysisId) {
      return;
    }
    triggeredAnalysisIdRef.current = queuedAnalysisId;

    void fetch('/api/resume/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeId: cv.id }),
    })
      .then(async (res) => {
        if (TERMINAL_STATUSES.includes(res.status)) {
          const payload = (await res.json().catch(() => null)) as unknown;
          const parsed = parseQuickTestError(payload);
          if (parsed) {
            setPipelineError(parsed);
            setPollTimedOut(true);
          }
        }
        // 200 (completed / already_completed) → polling picks up the result.
      })
      .catch(() => {
        // Network failure: the polling timeout surfaces "still processing".
      });
  }, [analysis, isQueued, pollTimedOut, pipelineError, cv.id]);

  // Signed URL for the PDF preview — fetched once (ref-guarded; setState only
  // happens inside the async callback, never synchronously in the effect).
  const previewUrlRequestedRef = useRef(false);
  useEffect(() => {
    if (!isPdf || previewUrlRequestedRef.current) {
      return;
    }
    previewUrlRequestedRef.current = true;
    getResumeDownloadUrlAction(cv.id)
      .then((url) => {
        if (url) {
          setPreviewUrl(url);
          setPreviewUrlState('ready');
        } else {
          setPreviewUrlState('error');
        }
      })
      .catch(() => setPreviewUrlState('error'));
  }, [isPdf, cv.id]);

  // Fresh-first view: when a completed analysis row exists, the payload is
  // rebuilt from it (never from the potentially stale server snapshot).
  const view = analysis && analysis.score !== null ? buildFreshCvDetail(cv, analysis) : cv;

  async function handleDownload() {
    setDownloadError(null);
    const url = await getResumeDownloadUrlAction(cv.id);
    if (!url) {
      setDownloadError(t('previewDownloadError'));
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = cv.name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  const tabClass = (tab: PreviewTab): string =>
    `rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
      activeTab === tab ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <div
      id="cv-preview-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-xs sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        id="cv-preview-modal-container"
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Modal Top Header */}
        <div className="flex shrink-0 flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10 text-brand-500">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold leading-tight text-slate-900 sm:text-lg">
                  {cv.name}
                </h3>
                {cv.isPrimary ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                    <BadgeCheck className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                    {t('primaryBadge')}
                  </span>
                ) : (
                  <form action={setPrimaryResumeAction}>
                    <input type="hidden" name="resumeId" value={cv.id} />
                    <button
                      type="submit"
                      className="flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-600 shadow-2xs transition-colors hover:border-amber-300 hover:text-brand-500"
                    >
                      <BadgeCheck className="h-3 w-3 text-slate-400" />
                      {t('previewSetPrimary')}
                    </button>
                  </form>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {t('previewAddedOn', { date: formatShortDate(cv.createdAt, locale) })}
                {cv.sizeBytes !== null && (
                  <>
                    {' • '}
                    <span className="font-semibold text-slate-700">{formatBytes(cv.sizeBytes)}</span>
                  </>
                )}
                {' • '}
                {t('previewScoreAts')}{' '}
                <strong className="text-slate-800">{view.score !== null ? `${view.score}%` : '—'}</strong>
              </p>
            </div>
          </div>

          {/* View Switcher Pills & Close */}
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center rounded-xl bg-slate-200/70 p-1 text-xs font-semibold">
              <button type="button" onClick={() => setActiveTab('preview')} className={tabClass('preview')}>
                {t('previewTabDocument')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analysis')}
                className={tabClass('analysis')}
              >
                <span>{t('previewTabAnalysis')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('services')}
                className={`flex items-center gap-1 ${tabClass('services')}`}
              >
                <Video className="h-3.5 w-3.5 text-amber-500" />
                <span>{t('previewTabServices')}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('milestoneClose')}
              className="cursor-pointer rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto bg-slate-100/50 p-4 sm:p-6 lg:p-8">

          {/* TAB 1 — Document preview rendered AS-IS: PDFs are embedded through
              a short-lived signed URL (no raw-text dump); the parsed text view
              stays the fallback for text-based formats (.txt/.docx). */}
          {activeTab === 'preview' && (
            isPdf ? (
              <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3">
                  <span className="truncate text-xs font-black uppercase tracking-wider text-slate-400">
                    {cv.label || cv.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {previewUrlState === 'ready' && previewUrl && (
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-600"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('previewOpenNewTab')}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDownload()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-slate-800"
                    >
                      <Download className="h-3 w-3" />
                      {t('previewDownload')}
                    </button>
                  </div>
                </div>

                {previewUrlState === 'ready' && previewUrl ? (
                  <iframe
                    key={previewUrl}
                    src={previewUrl}
                    title={cv.name}
                    className="h-[68vh] w-full bg-white"
                  />
                ) : previewUrlState === 'error' ? (
                  /* Chart 4 — fixed height identical to the iframe above so
                     swapping between loading / ready / error never shifts the
                     modal layout (CLS = 0 on the document viewer). */
                  <div className="flex h-[68vh] flex-col items-center justify-center gap-2 p-10 text-center">
                    <AlertCircle className="h-7 w-7 text-slate-300" />
                    <p className="max-w-md text-sm text-slate-500">{t('previewPdfError')}</p>
                    {cv.rawText && (
                      <div className="mt-4 max-h-64 w-full select-text overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-left text-xs leading-relaxed text-slate-700">
                        {cv.rawText.slice(0, 5000)}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Chart 4 — reserved height: no jump when the PDF arrives. */
                  <div className="flex h-[68vh] flex-col items-center justify-center gap-3 p-14 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
                    <p className="text-sm text-slate-500">{t('previewPdfLoading')}</p>
                  </div>
                )}
              </div>
            ) : (
            <div className="mx-auto max-w-3xl select-text rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md sm:p-10">
              <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <span className="truncate text-xs font-black uppercase tracking-wider text-slate-400">
                  {cv.label || cv.name}
                </span>
                {cv.wordCount !== null && (
                  <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {cv.wordCount} {t('previewWords')}
                  </span>
                )}
              </div>
              {cv.rawText ? (
                <>
                  <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
                    {cv.rawText}
                  </div>
                  {cv.rawTextTruncated && (
                    <p className="mt-6 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {t('previewTruncated')}
                    </p>
                  )}
                </>
              ) : (
                <p className="py-8 text-center text-sm text-slate-400">{t('previewRawEmpty')}</p>
              )}
            </div>
            )
          )}

          {/* TAB 2 — In-depth ATS diagnostic (validated template layout).
              The outcome is ALWAYS rendered from the fresh analysis row
              (fetched + polled live) — never from a stale cached payload. */}
          {activeTab === 'analysis' && (
            <div className="mx-auto max-w-3xl space-y-6">
              {analysis === undefined ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <Loader2 className="h-7 w-7 animate-spin text-brand-400" />
                  <p className="text-sm text-slate-500">{t('previewAnalysisLoading')}</p>
                </div>
              ) : pipelineError ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-center"
                >
                  <AlertCircle className="mx-auto h-7 w-7 text-rose-500" />
                  <p className="mt-3 text-sm font-bold text-rose-800">
                    {t('previewAnalysisFailed')}
                  </p>
                  <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-rose-700">
                    {pipelineError.error}
                  </p>
                </div>
              ) : isQueued ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
                  <p className="text-center text-sm font-bold text-slate-900">
                    {pollTimedOut ? t('previewAnalysisStill') : t('previewAnalysisQueued')}
                  </p>
                  <LoadingSteps
                    steps={queuedSteps}
                    activeIndex={
                      serverStage !== null
                        ? serverStage
                        : Math.min(queuedSteps.length - 1, Math.floor(pollCount / 3))
                    }
                    label={t('previewAnalysisProcessingLabel')}
                  />
                  {pollTimedOut && (
                    <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
                      {t('previewAnalysisStillDesc')}
                    </p>
                  )}
                </div>
              ) : view.score === null || !view.subscores ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <FileSearch className="h-8 w-8 text-brand-300" />
                  <p className="max-w-md text-sm leading-relaxed text-slate-500">
                    {t('previewAnalysisNone')}
                  </p>
                  {queueError && (
                    <p
                      role="alert"
                      className="max-w-md rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
                    >
                      {queueError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void runAnalysis()}
                    disabled={isQueueing}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isQueueing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    ) : (
                      <FileSearch className="h-4 w-4 text-amber-400" />
                    )}
                    {isQueueing ? t('previewAnalysisQueueing') : t('previewRunAnalysis')}
                  </button>
                </div>
              ) : (
                <>
                  {/* Score Showcase Hero */}
                  <div className="flex flex-col justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
                    <div className="flex items-center gap-5">
                      <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-brand-500 bg-brand-500/10">
                        <span className="text-3xl font-black leading-none text-brand-500">{view.score}%</span>
                        <span className="mt-0.5 text-[10px] font-bold uppercase text-slate-500">
                          {t('previewScoreAts')}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-black leading-tight text-slate-900">
                          {t('previewAnalysisTitle')}
                        </h3>
                        {view.summary && (
                          <p className="mt-1 max-w-md text-xs text-slate-500">{view.summary}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subscores grid */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {SUBSCORE_CARDS.map(({ key, color, Icon, bar }) => {
                      const value =
                        key === 'previewSubImpact'
                          ? view.subscores!.impact
                          : key === 'previewSubKeywords'
                            ? view.subscores!.keywords
                            : view.subscores!.grammar;
                      return (
                        <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <span className="mb-1 block text-xs font-semibold text-slate-400">{t(key)}</span>
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-black text-slate-900">{value}%</span>
                            <Icon className={`h-5 w-5 ${ICON_COLOR[color]}`} />
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${bar}`} style={{ width: `${value}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Strengths & Improvements */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-xs">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>{t('previewStrengths')}</span>
                      </h4>
                      <ul className="space-y-2.5 text-xs text-slate-700">
                        {view.strengths.length === 0 && <li className="text-slate-400">—</li>}
                        {view.strengths.map((item) => (
                          <li key={item.title} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            <span>
                              <strong className="font-bold text-slate-900">{item.title}</strong>
                              {item.detail && <span className="text-slate-600"> — {item.detail}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-rose-200/80 bg-white p-5 shadow-xs">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-rose-900">
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                        <span>{t('previewImprovements')}</span>
                      </h4>
                      <ul className="space-y-2.5 text-xs text-slate-700">
                        {view.weaknesses.length === 0 && <li className="text-slate-400">—</li>}
                        {view.weaknesses.map((item) => (
                          <li key={item.title} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                            <span>
                              <strong className="font-bold text-slate-900">{item.title}</strong>
                              {item.detail && <span className="text-slate-600"> — {item.detail}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3 — AI Services */}
          {activeTab === 'services' && (
            <div className="mx-auto max-w-3xl space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h4 className="text-sm font-bold text-slate-900">{t('previewServicesTitle')}</h4>
                <p className="mt-1 text-xs text-slate-500">{t('previewServicesIntro')}</p>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Service 1: Job Matching — the real Phase 5.2 pipeline */}
                  {view.score !== null ? (
                    <Link
                      href="/dashboard/matching"
                      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-brand-500 hover:shadow-md"
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <h5 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 transition-colors group-hover:text-brand-500">
                        <span>{t('previewServiceMatchTitle')}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </h5>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {t('previewServiceMatchDesc')}
                      </p>
                    </Link>
                  ) : (
                    <div
                      className="cursor-not-allowed rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4"
                      title={t('matchNeedsParsing')}
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-300">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <h5 className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                        <span>{t('previewServiceMatchTitle')}</span>
                        <span className="rounded-full bg-navy-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy-500">
                          {t('comingSoonBadge')}
                        </span>
                      </h5>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        {t('matchNeedsParsing')}
                      </p>
                    </div>
                  )}

                  {/* Service 2: Mock Interview (teaser) */}
                  <div
                    className="cursor-not-allowed rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4"
                    title={t('quickComingSoon')}
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-300">
                      <Video className="h-5 w-5" />
                    </div>
                    <h5 className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                      <span>{t('previewServiceInterviewTitle')}</span>
                      <span className="rounded-full bg-navy-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy-500">
                        {t('comingSoonBadge')}
                      </span>
                    </h5>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {t('previewServiceInterviewDesc')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Management Card */}
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{t('previewManageTitle')}</h4>
                  <p className="mt-0.5 text-xs text-slate-500">{t('previewManageDesc')}</p>
                  {downloadError && (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                      {downloadError}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t('previewDownload')}
                  </button>
                  {confirmingDelete ? (
                    <form action={deleteResumeAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="resumeId" value={cv.id} />
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        {t('previewCancel')}
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('previewConfirmDelete')}
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('deleteResume')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Sticky Bar — template standard: document export on the
            left, the primary job-matching action on the right (navy/orange). */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {!cv.isPrimary && (
              <form action={setPrimaryResumeAction}>
                <input type="hidden" name="resumeId" value={cv.id} />
                <button
                  type="submit"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100"
                >
                  <BadgeCheck className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" />
                  {t('previewSetPrimary')}
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => void handleDownload()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              {t('previewDownload')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {view.score !== null ? (
              <Link
                href={`/dashboard/matching?cv=${cv.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-slate-800 active:scale-95"
              >
                <Briefcase className="h-3.5 w-3.5 text-amber-400" />
                {t('previewMatchCta')}
              </Link>
            ) : (
              <span
                title={t('matchNeedsParsing')}
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-900/60 px-4 py-2 text-xs font-bold text-white/70"
              >
                <Briefcase className="h-3.5 w-3.5 text-amber-400/70" />
                {t('previewMatchCta')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
