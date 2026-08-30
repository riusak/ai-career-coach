'use client';

import { useEffect, useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
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
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(initialAnalysis);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  const isQueued = analysis !== null && analysis.score === null;

  // Polling loop: only active while an analysis is queued and not timed out.
  useEffect(() => {
    if (!isQueued || pollTimedOut) {
      return;
    }

    let cancelled = false;

    const poll = async (): Promise<void> => {
      try {
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

  return (
    <div className="mt-4 text-sm" aria-live="polite">
      {analysis ? (
        analysis.score === null ? (
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-800">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-500"
              />
              {pollTimedOut ? 'Still processing' : 'Queued'}
            </span>
            <p className="text-slate-600">
              {pollTimedOut
                ? 'The analysis is taking longer than expected. It will appear here automatically once processed — or reload the page later.'
                : `Requested on ${formatDateTime(analysis.created_at)}. Results will appear here automatically once processed.`}
            </p>
          </div>
        ) : (
          <div className="animate-fade-slide-in space-y-2">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
              Score: {analysis.score}/100
            </span>
            <p className="text-slate-600">
              Completed on {formatDateTime(analysis.created_at)}.
            </p>
          </div>
        )
      ) : (
        <EmptyState
          icon="chart"
          title="Aucune analyse pour le moment"
          description="Cliquez sur « Analyze my CV » pour obtenir un rapport complet — rien ne s’exécute automatiquement au téléversement."
        />
      )}
    </div>
  );
}
