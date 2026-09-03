'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import EmptyState from '@/components/ui/EmptyState';
import ErrorModal from '@/components/ui/ErrorModal';
import LoadingSteps from '@/components/ui/LoadingSteps';
import Skeleton from '@/components/ui/Skeleton';
import DeepAnalysisReport, {
  parseDeepAnalysisOutput,
} from '@/components/analysis/DeepAnalysisReport';
import { parseQuickTestError, QUICK_TEST_DOCUMENT_TYPES } from '@/lib/quick-test/error-codes';
import type { QuickTestErrorPayload } from '@/lib/quick-test/error-codes';
import type { ResumeAnalysis } from '@/types/resume';
import { analyzeResumeAction, getLatestAnalysisAction } from '../actions';

/** How often the latest analysis row is re-fetched while queued. */
const POLL_INTERVAL_MS = 3_000;

/** Gives up on polling after 2 minutes (the pipeline may be temporarily down). */
const POLL_TIMEOUT_MS = 120_000;

interface LatestAnalysisCardProps {
  resumeId: string;
  /** Latest analysis row rendered by the server on page load/revalidation. */
  initialAnalysis: ResumeAnalysis | null;
}

function formatDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Client-side "Latest analysis" card. While the latest row is still queued
 * (`score === null`), it polls the read-only server action every few seconds
 * so the result appears as soon as the pipeline completes — no manual page
 * refresh needed. The queued → completed switch is animated for a smooth
 * transition.
 *
 * The parent keys this component by the analysis row id: when a new analysis
 * is queued (page revalidated by `analyzeResumeAction`), the component remounts
 * with fresh state from the new prop — no prop→state syncing effects needed.
 */
export default function LatestAnalysisCard({
  resumeId,
  initialAnalysis,
}: LatestAnalysisCardProps) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const queuedSteps = t.raw('queuedSteps') as string[];
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(initialAnalysis);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  /** Number of completed poll ticks — fallback cadence of the waiting ticket. */
  const [pollCount, setPollCount] = useState(0);
  /** Last REAL pipeline stage reported by the worker (waiting-ticket index). */
  const [serverStage, setServerStage] = useState<number | null>(null);
  /** Non-null when the analysis pipeline reported a terminal error (e.g. the
   *  document is not a resume → 422). The queue row is deleted server-side on
   *  such failures, so polling stops and the blocking modal is shown instead. */
  const [pipelineError, setPipelineError] = useState<QuickTestErrorPayload | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const isQueued = analysis !== null && analysis.score === null;

  // Poll ticks every 3s; advance one "billet d'attente" step every 3 ticks
  // (≈9s per stage) so the wait feels progressive instead of frozen.
  // Waiting ticket: the deep worker persists the REAL pipeline stage into the
  // transient `structured_output` marker, so the ticket advances in lockstep
  // with the actual API work whenever a stage is available. The poll-count
  // cadence (≈9s per stage) is only the fallback for legacy markers — both
  // paths are clamped and can only ever move forward.
  const queuedStep = Math.min(
    Math.max(serverStage ?? 0, Math.floor(pollCount / 3)),
    queuedSteps.length - 1,
  );

  // Once completed, the persisted structured_output holds the full report
  // (score ring, per-dimension breakdown, findings, recommendations). It is
  // parsed defensively: a row completed without a parseable payload (legacy
  // or corrupted jsonb) degrades to the compact score chip below.
  const parsedOutput =
    analysis && analysis.score !== null
      ? parseDeepAnalysisOutput(analysis.structured_output)
      : null;

  // Polling loop: only active while an analysis is queued and not timed out.
  useEffect(() => {
    if (!isQueued || pollTimedOut || pipelineError) {
      return;
    }

    let cancelled = false;

    const poll = async (): Promise<void> => {
      try {
        setPollCount((count) => count + 1);
        const latest = await getLatestAnalysisAction(resumeId);
        if (cancelled || !latest) {
          return;
        }
        setAnalysis(latest);

        // Live stage sync: the worker persists the transient processing
        // marker carrying the last REAL pipeline stage (reading → analyzing
        // → reporting). Map it to the waiting-ticket index (forward-only).
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
  }, [isQueued, pollTimedOut, pipelineError, resumeId]);

  // Pipeline trigger: queueing only inserts a row (score null) — the deep
  // analysis itself is executed by POST /api/resume/analyze, which this card
  // kicks off exactly once per queued row (fire-and-forget, NEVER aborted:
  // the deps of this effect change on every 3 s poll, and aborting the
  // in-flight request there would kill the pipeline mid-run, leaving the row
  // claimed forever and this card stuck on "Queued"). The polling loop above
  // is what surfaces the result. A later page visit re-triggers processing
  // for any still-queued row (self-healing, incl. stale claims).
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
      body: JSON.stringify({ resumeId }),
    })
      .then(async (res) => {
        // Terminal failures delete the queued row server-side — the polling
        // loop would spin uselessly for 2 minutes. These span every status the
        // unified pipeline can emit (400 empty file, 413 too large, 415
        // unsupported format, 422 non-CV/unreadable, 502/503 LLM unavailable).
        // Surface the structured error (code / documentType / documentKind)
        // immediately through the blocking modal instead.
        if (
          res.status === 400 ||
          res.status === 413 ||
          res.status === 415 ||
          res.status === 422 ||
          res.status === 500 ||
          res.status === 502 ||
          res.status === 503
        ) {
          const payload = (await res.json().catch(() => null)) as unknown;
          const parsed = parseQuickTestError(payload);
          if (parsed) {
            setPipelineError(parsed);
            setPollTimedOut(true);
          }
        }
        // 200 (completed / already_completed) → the polling loop picks up the
        // persisted result.
      })
      .catch(() => {
        // Network failure: the polling loop keeps running and its 2-minute
        // timeout surfaces the "still processing" state to the user.
      });
  }, [analysis, isQueued, pollTimedOut, pipelineError, resumeId]);

  /** Builds the precise, localized message for the blocking modal. */
  const rejectionMessage = (): string => {
    const err = pipelineError;
    if (!err) {
      return '';
    }
    if (err.code === 'not_a_cv') {
      if (err.documentKind === 'pdf') {
        // Multimodal PDF: dynamic, typed rejection message.
        const key = (QUICK_TEST_DOCUMENT_TYPES as readonly string[]).includes(
          err.documentType ?? ''
        )
          ? err.documentType!
          : 'other';
        return tErrors('notCvTyped', { type: tErrors(`docType.${key}`) });
      }
      // DOCX/TXT (text-extraction path): clean, elegant generic rejection.
      return tErrors('notCvGeneric');
    }
    if (err.code === 'llm_failed' || err.code === 'llm_unavailable') {
      return tErrors('technicalFailure');
    }
    return err.error;
  };

  /** Re-queues the deep analysis after a technical failure (explicit retry). */
  const retryAnalysis = async (): Promise<void> => {
    if (isRetrying) {
      return;
    }
    setIsRetrying(true);
    try {
      const formData = new FormData();
      formData.set('resumeId', resumeId);
      await analyzeResumeAction({ success: false, message: null }, formData);
      // Re-queued: clear the terminal error and restore the processing UI.
      // The page revalidation also remounts this card with the new row.
      const latest = await getLatestAnalysisAction(resumeId);
      setPipelineError(null);
      setPollTimedOut(false);
      setPollCount(0);
      if (latest) {
        setAnalysis(latest);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="mt-4 text-sm" aria-live="polite">
      {analysis ? (
        analysis.score === null ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500"
                />
                {pollTimedOut ? t('latestCard.stillProcessing') : t('latestCard.queued')}
              </span>
              <p className="text-navy-600">
                {pollTimedOut
                  ? t('latestCard.stillProcessingDesc')
                  : t('latestCard.queuedDesc', {
                      date: formatDateTime(analysis.created_at, locale),
                    })}
              </p>
            </div>

            {/* Shimmer skeleton mirroring the exact shape of the incoming
                report (score ring + per-dimension breakdown) instead of a
                bare spinner — perceived performance pattern. */}
            <div
              aria-hidden="true"
              className="animate-fade-slide-in rounded-xl border border-navy-100 bg-white p-6"
            >
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <Skeleton className="h-32 w-32 shrink-0 rounded-full" />
                <div className="w-full space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-2 w-5/6 rounded-full" />
                    <Skeleton className="h-2 w-2/3 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Billets d'attente — progressive pipeline steps. */}
            <LoadingSteps
              steps={queuedSteps}
              activeIndex={queuedStep}
              label={t('latestCard.queuedLabel')}
            />
          </div>
        ) : parsedOutput ? (
          <DeepAnalysisReport output={parsedOutput} completedAt={analysis.created_at} />
        ) : (
          <div className="animate-fade-slide-in space-y-2">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
              {t('latestCard.scoreLabel', { score: analysis.score })}
            </span>
            <p className="text-navy-600">
              {t('latestCard.completedOn', {
                date: formatDateTime(analysis.created_at, locale),
              })}
            </p>
          </div>
        )
      ) : (
        <EmptyState
          icon="chart"
          title={t('latestCard.emptyTitle')}
          description={t('latestCard.emptyDesc')}
        />
      )}

      {/* Blocking centered modal — document rejections ("Document non
          conforme" + dynamic typed message) and analysis failures
          ("Échec de l'analyse"). Replaces the old inline error banner. */}
      <ErrorModal
        open={pipelineError !== null}
        title={
          pipelineError?.code === 'not_a_cv'
            ? tErrors('rejectionTitle')
            : tErrors('analysisFailedTitle')
        }
        description={rejectionMessage()}
        actionLabel={
          pipelineError?.code === 'not_a_cv' ? tCommon('close') : tErrors('retryAnalysis')
        }
        onAction={() => {
          if (pipelineError?.code === 'not_a_cv') {
            // Retrying the same document would fail identically — the user
            // re-uploads a valid CV instead (the hint stays in the page).
            setPipelineError(null);
            return;
          }
          void retryAnalysis();
        }}
        onClose={() => setPipelineError(null)}
        titleId="latest-analysis-error-modal-title"
      />
    </div>
  );
}
