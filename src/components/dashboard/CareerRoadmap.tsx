'use client';

import { useTranslations } from 'next-intl';

interface CareerRoadmapProps {
  stage: 1 | 2 | 3 | 4;
  progressPercent: number;
}

const STAGE_KEYS = ['careerStage1', 'careerStage2', 'careerStage3', 'careerStage4'] as const;

/**
 * Multi-stage progress bar tracing the user's career journey.
 * Recomputed server-side on profile edits; no client mutation.
 */
export default function CareerRoadmap({ stage, progressPercent }: CareerRoadmapProps) {
  const t = useTranslations('dashboard');

  return (
    <section className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            {t('careerRoadmap')}
          </p>
          <p className="mt-1 text-sm text-navy-600">
            {progressPercent}% — {t(`careerStage${stage}` as 'careerStage1' | 'careerStage2' | 'careerStage3' | 'careerStage4')}
          </p>
        </div>
        <span className="text-2xl font-extrabold text-navy-900">{progressPercent}%</span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-5 h-2 w-full overflow-hidden rounded-full bg-navy-100"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAGE_KEYS.map((key, index) => {
          const stepNumber = (index + 1) as 1 | 2 | 3 | 4;
          const isDone = stepNumber < stage;
          const isCurrent = stepNumber === stage;
          return (
            <li
              key={key}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs transition-colors ${
                isCurrent
                  ? 'border-orange-300 bg-orange-50/60'
                  : isDone
                    ? 'border-navy-100 bg-white'
                    : 'border-navy-100 bg-navy-50/40'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isCurrent
                    ? 'bg-orange-500 text-white'
                    : isDone
                      ? 'bg-navy-900 text-white'
                      : 'bg-navy-100 text-navy-400'
                }`}
              >
                {isDone ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-3 w-3"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </span>
              <span
                className={`font-medium ${
                  isCurrent ? 'text-orange-900' : isDone ? 'text-navy-700' : 'text-navy-400'
                }`}
              >
                {t(key)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}