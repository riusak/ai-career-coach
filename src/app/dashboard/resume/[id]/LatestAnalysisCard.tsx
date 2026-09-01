'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSteps from '@/components/ui/LoadingSteps';
import Skeleton from '@/components/ui/Skeleton';
import DeepAnalysisReport, {
  parseDeepAnalysisOutput,
} from '@/components/analysis/DeepAnalysisReport';
import type { ResumeAnalysis } from '@/types/resume';
import { getLatestAnalysisAction } from '../actions';

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
  const locale = useLocale();
  const queuedSteps = t.raw('queuedSteps') as string[];
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(initialAnalysis);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  /** Number of completed poll ticks — drives the progressive waiting ticket. */
  const [pollCount, setPollCount] = useState(0);

  const isQueued = analysis !== null && analysis.score === null;

  // Poll ticks every 3s; advance one "billet d'attente" step every 4 ticks
  // (≈12s per stage) so the wait feels progressive instead of frozen.
  const queuedStep = Math.min(
    Math.floor(pollCount / 4),
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
    if (!isQueued || pollTimedOut) {
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
  }, [isQueued, pollTimedOut, resumeId]);

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
    if (!isQueued || pollTimedOut) {
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
    }).catch(() => {
      // Network failure: the polling loop keeps running and its 2-minute
      // timeout surfaces the "still processing" state to the user.
    });
  }, [analysis, isQueued, pollTimedOut, resumeId]);

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
    </div>
  );
}
