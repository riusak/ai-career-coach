'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatBytes } from '@/lib/resume-validation';
import LoadingSteps from '@/components/ui/LoadingSteps';
import type {
  InsightItem,
  QuickTestResponse,
} from '@/types/quick-test';

/**
 * Compact « Bento grid » rendering of the visitor Quick Test result.
 * Replaces the former monolithic vertical stack: an airy multi-card grid
 * (score, per-dimension breakdown, findings, recommendations, expert advice)
 * that stays visually balanced next to the hero headline. Deeper conversion
 * (locked features + CTAs) lives below the grid, compact by design.
 */

interface QuickTestResultSectionProps {
  /** 'analyzing' renders the skeleton + waiting ticket; 'result' the report. */
  status: 'analyzing' | 'result';
  result?: QuickTestResponse | null;
  analysisStep?: number;
  onUnlock: () => void;
  onReset: () => void;
}

/** "Billet d'attente" step keys — translated at render time via
 *  `useTranslations('landing.analysisSteps')`. The constant FR defaults are
 *  kept exported so server-side callers (e.g. metadata hints) still work. */
export const ANALYSIS_STEP_KEYS = [
  'stepExtract',
  'stepSkills',
  'stepRecommendations',
] as const;

export const ANALYSIS_STEPS = [
  'Extraction du texte en cours',
  'Analyse des compétences par l’IA',
  'Génération des recommandations',
] as const;

/** Skeleton shown while the analysis runs — mirrors the bento grid shape so
 *  the layout doesn't jump when the report replaces it (shimmer + steps). */
function AnalyzingSkeleton({ analysisStep }: { analysisStep: number }) {
  const t = useTranslations('landing');
  return (
    <div aria-live="polite">
      <div className="rounded-2xl border border-orange-100 bg-white/80 p-5 sm:p-6 shadow-sm">
        <LoadingSteps
          steps={ANALYSIS_STEP_KEYS.map((key) => t(`analysisSteps.${key}`))}
          activeIndex={analysisStep}
          label={t('analyzingHeading')}
        />
      </div>
      <div aria-hidden="true" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="animate-shimmer h-44 rounded-2xl border border-navy-100/80"
          />
        ))}
      </div>
      <div aria-hidden="true" className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="animate-shimmer h-36 rounded-2xl border border-navy-100/80" />
        <div className="animate-shimmer h-36 rounded-2xl border border-navy-100/80" />
      </div>
      <p className="mt-4 text-center text-xs text-navy-600">
        {t('ephemeral')}
      </p>
    </div>
  );
}

/** Compact animated score ring (bento cell–sized). */
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
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 120 120" className="h-24 w-24 -rotate-90">
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
        <span className="text-2xl font-extrabold text-navy-900">{shownScore}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-orange-700">/ 100</span>
      </div>
    </div>
  );
}

/** Bento cell — global score + document identity, vertically centered. */
function ScoreCell({ result }: { result: QuickTestResponse }) {
  const t = useTranslations('landing');
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50/80 to-white p-4 sm:p-5">
      <ScoreRing score={result.analysis.score} />
      <div className="min-w-0 text-center">
        <p
          className="max-w-full truncate text-sm font-bold text-navy-900"
          title={result.metadata.fileName}
        >
          {result.metadata.fileName}
        </p>
        <p className="mt-0.5 text-xs text-navy-600">
          {result.metadata.pageCount} page{result.metadata.pageCount > 1 ? 's' : ''} ·{' '}
          {result.metadata.wordCount} mots · {formatBytes(result.metadata.fileSizeBytes)}
        </p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              result.source === 'llm'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-navy-100 text-navy-600'
            }`}
          >
            {result.source === 'llm' ? (
              <>
                {/* Minimal line icon (CPU) — no star/sparkle glyphs. */}
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
                {t('sourceLlm')}
              </>
            ) : (
              t('sourceDegraded')
            )}
          </span>
          <span className="inline-flex rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-medium text-navy-500">
            {t('ephemeral')}
          </span>
        </p>
      </div>
    </div>
  );
}

/** Bento cell — per-dimension scores as compact animated bars. */
function DimensionsCell({ items }: { items: QuickTestResponse['analysis']['scoreBreakdown'] }) {
  const t = useTranslations('landing');
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-4 sm:p-5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-navy-600">
        {t('row1Dimensions')}
      </h4>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.category}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-semibold text-navy-900">{item.category}</p>
              <p className="shrink-0 text-xs font-bold text-orange-700">
                {item.score}
                <span className="font-medium text-navy-400">/100</span>
              </p>
            </div>
            <div
              role="progressbar"
              aria-valuenow={item.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Score ${item.category}`}
              className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-navy-100"
            >
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  item.score >= 70
                    ? 'bg-orange-500'
                    : item.score >= 45
                      ? 'bg-orange-400'
                      : 'bg-navy-300'
                }`}
                style={{ width: `${item.score}%` }}
              />
            </div>
            {item.comment && (
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-navy-600">
                {item.comment}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Bento cell — strengths / weaknesses compact list.
 *  Strict brand palette: positive → orange (the brand accent), negative → navy.
 *  Icons are minimal line glyphs (check / x), no stars or sparkles. */
function FindingsCell({
  titleKey,
  items,
  tone,
}: {
  titleKey: 'row1Strengths' | 'row1Weaknesses';
  items: InsightItem[];
  tone: 'positive' | 'negative';
}) {
  const t = useTranslations('landing');
  const accent =
    tone === 'positive'
      ? 'border-orange-200 bg-orange-50/60 text-orange-700'
      : 'border-navy-200 bg-navy-50/60 text-navy-700';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy-600">
        <span
          aria-hidden="true"
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${accent}`}
        >
          {tone === 'positive' ? '✓' : '✕'}
        </span>
        {t(titleKey)}
      </h4>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item.title}>
            <p className="text-sm font-semibold text-navy-900">{item.title}</p>
            {item.detail && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-navy-600">{item.detail}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Bento cell — prioritized recommendations, numbered chips. */
function RecommendationsCell({
  items,
}: {
  items: QuickTestResponse['analysis']['recommendations'];
}) {
  const t = useTranslations('landing');
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 sm:p-5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-orange-800">
        {t('row2Recommendations')}
      </h4>
      <ol className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {items.map((recommendation, index) => (
          <li key={recommendation.title} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy-900">{recommendation.title}</p>
              {recommendation.detail && (
                <p className="mt-0.5 line-clamp-3 text-xs leading-snug text-navy-600">
                  {recommendation.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Bento cell — targeted expert advice mini-cards. */
function ExpertAdviceCell({
  analysis,
}: {
  analysis: QuickTestResponse['analysis'];
}) {
  const t = useTranslations('landing');
  const cards = [
    { titleKey: 'expertLayout', body: analysis.formattingAdvice },
    { titleKey: 'expertActionVerbs', body: analysis.actionVerbsAdvice },
    { titleKey: 'expertImpact', body: analysis.impactMetricsAdvice },
  ].filter((card) => card.body.length > 0);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-4 sm:p-5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-navy-600">
        {t('row2ExpertTips')}
      </h4>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.titleKey} className="rounded-xl border border-navy-50 bg-navy-50/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700">
              {t(card.titleKey)}
            </p>
            <p className="mt-1 line-clamp-4 text-xs leading-snug text-navy-700">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const LOCKED_FEATURE_KEYS = [
  { key: 'unlockFull' },
  { key: 'unlockMatching' },
  { key: 'unlockLibrary' },
] as const;

function LockedFeatureCard({
  titleKey,
  descriptionKey,
  onUnlock,
}: {
  titleKey: (typeof LOCKED_FEATURE_KEYS)[number]['key'];
  descriptionKey: (typeof LOCKED_FEATURE_KEYS)[number]['key'];
  onUnlock: () => void;
}) {
  const t = useTranslations('landing');
  return (
    <button
      type="button"
      onClick={onUnlock}
      className="group relative w-full cursor-pointer overflow-hidden rounded-xl border border-navy-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange hover:shadow-md motion-reduce:transform-none"
    >
      <div aria-hidden="true" className="pointer-events-none select-none blur-[3px]">
        <h3 className="text-sm font-semibold text-navy-900">{t(titleKey)}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-navy-600">{t(`${descriptionKey}Desc`)}</p>
        <div className="mt-3 h-2 w-3/4 rounded-full bg-navy-100" />
        <div className="mt-2 h-2 w-1/2 rounded-full bg-navy-100" />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white/65 px-4 text-center backdrop-blur-[1px]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-5 w-5 text-orange-600"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p className="text-xs font-semibold text-navy-900">{t('unlockReserved')}</p>
        <p className="text-[11px] font-medium text-orange-700 underline underline-offset-2">
          {t('unlockClick')}
        </p>
      </div>
    </button>
  );
}

export default function QuickTestResultSection({
  status,
  result = null,
  analysisStep = 0,
  onUnlock,
  onReset,
}: QuickTestResultSectionProps) {
  const t = useTranslations('landing');
  return (
    <section
      id="resultats-analyse"
      aria-live="polite"
      className="scroll-mt-28 border-t border-navy-100/80 bg-brand-bg px-4 pb-20 pt-10 sm:px-6 sm:pt-12 lg:px-8"
    >
      <div className="mx-auto max-w-7xl 2xl:max-w-screen-2xl">
        {status === 'analyzing' || !result ? (
          <AnalyzingSkeleton analysisStep={analysisStep} />
        ) : (
          <div>
            {/* Compact success header — strictly navy + orange. */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {t('resultsBadge')}
              </span>
              <p className="text-xs text-navy-600">{t('resultsPreview')}</p>
            </div>

            {/* Row 1 — score gauge, dimensions breakdown, pros / cons */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ScoreCell result={result} />
              <DimensionsCell items={result.analysis.scoreBreakdown} />
              <FindingsCell
                titleKey="row1Strengths"
                items={result.analysis.strengths}
                tone="positive"
              />
              <FindingsCell
                titleKey="row1Weaknesses"
                items={result.analysis.weaknesses}
                tone="negative"
              />
            </div>

            {/* Row 2 — priority recommendations + targeted expert tips */}
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <RecommendationsCell items={result.analysis.recommendations} />
              <ExpertAdviceCell analysis={result.analysis} />
            </div>

            {/* Row 3 — premium unlock cards (conversion) */}
            <div className="mt-5">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-orange-200" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  {t('row3UnlockTitle')}
                </p>
                <span className="h-px flex-1 bg-orange-200" aria-hidden="true" />
              </div>
              <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
                {LOCKED_FEATURE_KEYS.map((feature) => (
                  <LockedFeatureCard
                    key={feature.key}
                    titleKey={feature.key}
                    descriptionKey={feature.key}
                    onUnlock={onUnlock}
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
                <Link
                  href="/signup"
                  className="rounded-lg bg-orange px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2"
                >
                  {t('unlockButton')}
                </Link>
                <button
                  type="button"
                  onClick={onReset}
                  className="text-sm font-medium text-navy-600 underline transition-colors hover:text-navy-900"
                >
                  {t('testAnother')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

