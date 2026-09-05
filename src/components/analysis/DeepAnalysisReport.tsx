'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { InsightItem, QuickTestAnalysis, ScoreBreakdownItem } from '@/types/quick-test';
import type { DeepAnalysisOutput } from '@/types/resume';

/**
 * Full deep-analysis report for an authenticated user's resume (dashboard
 * preview view). Mirrors the visitor Quick Test result layout (score ring,
 * per-dimension bars, strengths/weaknesses, prioritized recommendations,
 * expert advice) — the same QuickTestAnalysis payload persisted in
 * `resume_analyses.structured_output` by the /api/resume/analyze pipeline.
 */

/** Defensively coerces the raw `structured_output` jsonb into a typed payload. */
export { parseDeepAnalysisOutput } from '@/lib/analysis/deep-output';

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  // Animate from 0 on mount: the ring sweep + count-up create a celebratory
  // reveal once the analysis completes (perceived performance pattern).
  const [shownScore, setShownScore] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
      setShownScore(score);
    });
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const progress = mounted ? shownScore / 100 : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-orange-100" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-orange-500 transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-navy-900">{shownScore}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-orange-700">/ 100</span>
      </div>
    </div>
  );
}

/** Per-dimension score bars with the recruiter justification underneath. */
function ScoreBreakdownPanel({ items }: { items: ScoreBreakdownItem[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-navy-900">
        Détail du score par dimension
      </h4>
      <ul className="mt-3 space-y-3.5">
        {items.map((item) => (
          <li key={item.category}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-navy-900">{item.category}</p>
              <p className="shrink-0 text-sm font-bold text-orange-800">{item.score}/100</p>
            </div>
            <div
              role="progressbar"
              aria-valuenow={item.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Score ${item.category}`}
              className="mt-1 h-2 w-full overflow-hidden rounded-full bg-navy-100"
            >
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  item.score >= 70
                    ? 'bg-emerald-500'
                    : item.score >= 45
                      ? 'bg-orange-500'
                      : 'bg-red-400'
                }`}
                style={{ width: `${item.score}%` }}
              />
            </div>
            {item.comment && <p className="mt-1 text-xs text-navy-500">{item.comment}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Titled strengths/weaknesses list with ✓/✕ markers. */
function FindingList({
  title,
  items,
  tone,
}: {
  title: string;
  items: InsightItem[];
  tone: 'positive' | 'negative';
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-navy-900">{title}</h4>
      <ul className="mt-2.5 space-y-3">
        {items.map((item) => (
          <li key={item.title} className="flex gap-2 text-sm">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                tone === 'positive'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {tone === 'positive' ? '✓' : '✕'}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-navy-900">{item.title}</p>
              {item.detail && <p className="mt-0.5 text-navy-600">{item.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Targeted expert advice cards (formatting, action verbs, quantified impact). */
function ExpertAdvice({ analysis }: { analysis: QuickTestAnalysis }) {
  const cards = [
    { title: 'Mise en page & format', body: analysis.formattingAdvice },
    { title: 'Verbes d’action', body: analysis.actionVerbsAdvice },
    { title: 'Impact chiffré', body: analysis.impactMetricsAdvice },
  ].filter((card) => card.body.length > 0);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-navy-900">Conseils d’expert ciblés</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-lg border border-navy-100 bg-navy-50 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
              {card.title}
            </p>
            <p className="mt-1.5 text-sm text-navy-600">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DeepAnalysisReportProps {
  output: DeepAnalysisOutput;
  /** ISO completion timestamp of the analysis row (displayed in the header). */
  completedAt?: string;
}

export default function DeepAnalysisReport({ output, completedAt }: DeepAnalysisReportProps) {
  const { analysis, source } = output;
  const t = useTranslations('landing');

  return (
    <div className="animate-fade-slide-in" aria-live="polite">
      {/* Score & completion header */}
      <div className="flex flex-col items-center gap-6 rounded-xl border border-orange-200 bg-orange-50/60 p-5 sm:flex-row">
        <ScoreRing score={analysis.score} />
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            {t('resultsBadge')}
          </p>
          <h3 className="mt-1 text-lg font-bold text-navy-900">
            {analysis.score}/100
          </h3>
          {completedAt && (
            <p className="mt-1 text-sm text-navy-500">
              {new Date(completedAt).toLocaleString('fr-FR', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}
          <p className="mt-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                source === 'llm'
                  ? 'border border-orange-300 bg-orange-100 text-orange-900'
                  : 'border border-navy-100 bg-navy-50 text-navy-500'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-3 w-3"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
                <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
              </svg>
              {source === 'llm' ? t('sourceLlm') : t('sourceLocalLegacy')}
            </span>
          </p>
        </div>
      </div>

      {/* Score breakdown by dimension */}
      {analysis.scoreBreakdown.length > 0 && (
        <div className="mt-6 rounded-xl border border-navy-100 bg-white p-4 sm:p-5">
          <ScoreBreakdownPanel items={analysis.scoreBreakdown} />
        </div>
      )}

      {/* Findings */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <FindingList title="Points forts" items={analysis.strengths} tone="positive" />
        <FindingList title="Points faibles" items={analysis.weaknesses} tone="negative" />
      </div>

      {/* Prioritized recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
          <h4 className="text-sm font-semibold text-orange-900">
            Recommandations prioritaires
          </h4>
          <ol className="mt-3 space-y-3">
            {analysis.recommendations.map((recommendation, index) => (
              <li key={recommendation.title} className="flex gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-navy-900">{recommendation.title}</p>
                  {recommendation.detail && (
                    <p className="mt-0.5 text-navy-600">{recommendation.detail}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Targeted expert advice */}
      <ExpertAdvice analysis={analysis} />
    </div>
  );
}
