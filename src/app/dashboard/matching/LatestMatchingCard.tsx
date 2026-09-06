'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import LoadingSteps from '@/components/ui/LoadingSteps';
import Skeleton from '@/components/ui/Skeleton';
import { parseJobMatchingDetails } from '@/lib/analysis/matching-output';
import type { MatchingStage } from '@/types/matching';
import type { JobMatching } from '@/types/matching';
import type { MatchingPipelineError } from '@/lib/analysis/matching';
import { getLatestMatchingAction } from './actions';
import MatchingReport from './MatchingReport';

/** How often the matching row is re-fetched while queued. */
const POLL_INTERVAL_MS = 3_000;

/** Gives up on polling after 2 minutes (the worker may be temporarily down). */
const POLL_TIMEOUT_MS = 120_000;

/** Terminal statuses mapped by the unified pipeline - the queued row is
 *  deleted server-side on these, so polling must stop immediately. */
const TERMINAL_STATUSES = [400, 413, 415, 422, 500, 502, 503];

const STAGE_ORDER: MatchingStage[] = ['extracting', 'comparing', 'reporting'];

interface LatestMatchingCardProps {
  matchingId: string;
  /** Latest matching row rendered by the server (or the last queued one). */
  initialMatching: JobMatching | null;
  /** Fired once the run completes so the parent can refresh the history list. */
  onCompleted?: (matching: JobMatching) => void;
  /** Fired when the pipeline fails terminally (row deleted) — lets the parent
   *  surface an explicit « Échec » status in its outcome header. */
  onFailed?: () => void;
}

/** Maps the REAL pipeline stage persisted in the claim marker to a step index. */
function stageIndex(stage: MatchingStage | undefined): number | null {
  if (!stage) {
    return null;
  }
  const index = STAGE_ORDER.indexOf(stage);
  return index >= 0 ? index : null;
}

interface MatchingErrorPayload {
  code: MatchingPipelineError['code'] | 'server_error';
  message: string;
}

/**
 * Client-side "Latest matching" card used inside the JobMatchModal and the
 * matching dashboard. While the row is still queued (`match_score === null`)
 * it polls the read-only server action every few seconds so the diagnostic
 * appears as soon as the /api/resume/match worker completes - no manual page
 * refresh needed. The queued -> completed switch is animated.
 *
 * Pipeline trigger: queueing only inserts a row - the matching itself is
 * executed by POST /api/resume/match, fired exactly once per queued row
 * (fire-and-forget, never aborted: an aborted request would kill the worker
 * mid-run and leave the row claimed forever).
 */
export default function LatestMatchingCard({
  matchingId,
  initialMatching,
  onCompleted,
  onFailed,
}: LatestMatchingCardProps) {
  const t = useTranslations('dashboard');
  const matchingSteps = t.raw('matchingSteps') as string[];
  const [matching, setMatching] = useState<JobMatching | null>(initialMatching);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  /** Fallback cadence of the waiting ticket (~9s per stage if no live stage). */
  const [pollCount, setPollCount] = useState(0);
  /** Non-null when the matching pipeline failed terminally (row deleted). */
  const [pipelineError, setPipelineError] = useState<MatchingErrorPayload | null>(null);

  const isQueued = matching !== null && matching.match_score === null;
  const details = matching ? parseJobMatchingDetails(matching.matching_details) : null;
  const result = details?.result ?? null;
  // Real pipeline stage reported by the worker through the transient marker
  // (derived at render time - never stored to avoid cascade re-renders).
  const serverStage =
    matching && matching.match_score === null
      ? (parseJobMatchingDetails(matching.matching_details)?.stage ?? null)
      : null;
// Polling loop while queued.
  useEffect(() => {
    if (!isQueued || pollTimedOut || pipelineError) {
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutId = setTimeout(() => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      setPollTimedOut(true);
    }, POLL_TIMEOUT_MS);

    const tick = () => {
      void getLatestMatchingAction(matchingId).then((latest) => {
        if (cancelled) return;
        if (latest) {
          setMatching(latest);
        }
        setPollCount((count) => count + 1);
      });
    };

    tick();
    intervalId = setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [isQueued, pollTimedOut, pipelineError, matchingId]);

  // Worker trigger - exactly once per queued row (self-healing on re-visits).
  const triggeredMatchingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isQueued || pollTimedOut || pipelineError) {
      return;
    }
    if (!matching || triggeredMatchingIdRef.current === matching.id) {
      return;
    }
    triggeredMatchingIdRef.current = matching.id;

    void fetch('/api/resume/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchingId }),
    }).then(async (res) => {
      if (TERMINAL_STATUSES.includes(res.status)) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
          code?: string;
        } | null;
        setPipelineError({
          code: (payload?.code as MatchingErrorPayload['code']) ?? 'server_error',
          message: payload?.error ?? 'Le matching n’a pas pu être exécuté.',
        });
      }
    });
  }, [isQueued, pollTimedOut, pipelineError, matching, matchingId]);

  // Fire the failure callback once the terminal pipeline error is known.
  const failedNotifiedRef = useRef(false);
  useEffect(() => {
    if (pipelineError && !failedNotifiedRef.current) {
      failedNotifiedRef.current = true;
      onFailed?.();
    }
  }, [pipelineError, onFailed]);

  // Fire the completion callback once the client sees the finished row.
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (matching && matching.match_score !== null && !notifiedRef.current) {
      notifiedRef.current = true;
      onCompleted?.(matching);
    }
  }, [matching, onCompleted]);

  const fallbackStep =
    Math.min(STAGE_ORDER.length - 1, Math.floor(pollCount / 3));
  const activeStep =
    serverStage !== null ? (stageIndex(serverStage) ?? fallbackStep) : fallbackStep;

  // --- Terminal failure state -----------------------------------------------
  if (pipelineError) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/60 p-5 text-center">
        <p className="text-sm font-bold text-rose-800">{t('matchingFailedTitle')}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-rose-700">
          {pipelineError.message}
        </p>
        <p className="mt-1 text-[11px] text-rose-500">{t('matchingFailedHint')}</p>
      </div>
    );
  }

  // --- Completed state -----------------------------------------------------
  if (matching && matching.match_score !== null && result) {
    return (
      <MatchingReport
        result={result}
        jobTitle={matching.job_title}
        company={matching.company ?? result.company}
        location={matching.location ?? result.location}
        completedAt={matching.created_at}
      />
    );
  }

  // --- Queued state (skeleton + waiting ticket) -----------------------------
  if (isQueued) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-900">
            {pollTimedOut ? t('latestCard.stillProcessing') : t('matchingQueued')}
          </p>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-inset ring-brand-200">
            <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500 align-middle" />
            {t('matchingQueuedBadge')}
          </span>
        </div>

        {/* Shimmer skeleton mirroring the incoming report shape. */}
        <div
          aria-hidden="true"
          className="animate-fade-slide-in rounded-xl border border-slate-200 bg-white p-6"
        >
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 h-3 w-1/3" />
          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
            <Skeleton className="h-32 w-32 shrink-0 rounded-full" />
            <div className="w-full space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-2 w-5/6 rounded-full" />
                <Skeleton className="h-2 w-2/3 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <LoadingSteps
          steps={matchingSteps}
          activeIndex={activeStep}
          label={t('matchingProcessingLabel')}
        />

        {pollTimedOut && (
          <p className="text-center text-xs leading-relaxed text-slate-500">
            {t('matchingStillProcessingDesc')}
          </p>
        )}
      </div>
    );
  }

  return null;
}
