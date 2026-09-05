'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Lightbulb,
  Target,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import type { JobMatchResult } from '@/types/matching';

/**
 * Matching diagnostic report â€” the full Phase 5.2 result card.
 * Clean-slate styling (white cards on brand-bg, #FF7A00 brand accents):
 * animated score ring, the 3 sub-score bars (skills / experience / keywords),
 * the recruiter synthesis, strengths, per-requirement gaps, matched/missing
 * ATS keyword chips and prioritized recommendations.
 */

interface MatchingReportProps {
  result: JobMatchResult;
  jobTitle: string;
  company?: string | null;
  location?: string | null;
  /** ISO timestamp of the completed run (rendered with the active locale). */
  completedAt?: string;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
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
    <div className="relative h-32 w-32 shrink-0" aria-hidden="true">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-brand-100" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-brand-500 transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900">{shownScore}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-brand-700">/ 100</span>
      </div>
    </div>
  );
}

function SubScoreBar({
  label,
  icon,
  score,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  score: number;
  tone: 'skills' | 'experience' | 'keywords';
}) {
  const barColor =
    tone === 'skills'
      ? 'bg-brand-500'
      : tone === 'experience'
        ? 'bg-navy-700'
        : 'bg-emerald-500';

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
          <span className="text-brand-500">{icon}</span>
          {label}
        </p>
        <p className="shrink-0 text-sm font-bold text-slate-900">{score}/100</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function FindingCard({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ title: string; detail: string }>;
  tone: 'positive' | 'warning';
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-xs ${
        tone === 'positive' ? 'border-emerald-200/80' : 'border-amber-200/80'
      }`}
    >
      <h4
        className={`mb-3 flex items-center gap-2 text-sm font-bold ${
          tone === 'positive' ? 'text-emerald-800' : 'text-amber-900'
        }`}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            tone === 'positive'
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-amber-100 text-amber-600'
          }`}
        >
          {icon}
        </span>
        {title}
      </h4>
      <ul className="space-y-3">
        {items.length === 0 && <li className="text-xs text-slate-400">â€”</li>}
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-2 text-[13px] text-slate-700">
            <span
              aria-hidden="true"
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                tone === 'positive' ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span>
              <strong className="font-bold text-slate-900">{item.title}</strong>
              {item.detail && <span className="text-slate-600"> â€” {item.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeywordChip({ label, tone }: { label: string; tone: 'matched' | 'missing' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
        tone === 'matched'
          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200'
          : 'bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200'
      }`}
    >
      {tone === 'matched' ? (
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
      ) : (
        <AlertTriangle className="h-3 w-3 text-rose-500" />
      )}
      {label}
    </span>
  );
}

function formatDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function MatchingReport({
  result,
  jobTitle,
  company,
  location,
  completedAt,
}: MatchingReportProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();

  return (
    <div
      id="matching-report"
      className="animate-fade-slide-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      {/* Headline */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
            {t('matchingReportKicker')}
          </p>
          <h3 className="mt-1 truncate text-lg font-extrabold text-slate-900" title={jobTitle}>
            {jobTitle}
          </h3>
          {(company || location) && (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {[company, location].filter(Boolean).join(' â€¢ ')}
            </p>
          )}
          {completedAt && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              {t('matchingCompletedOn', { date: formatDateTime(completedAt, locale) })}
            </p>
          )}
        </div>
        <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 ring-1 ring-inset ring-brand-200">
          <FileSearch className="h-3.5 w-3.5" />
          {t('matchingReportAtsBadge')}
        </span>
      </div>

      {/* Hero: global ring + recruter synthesis */}
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <ScoreRing score={result.overall} />
          <div>
            <p className="text-sm font-bold text-slate-900">{t('matchingReportOverall')}</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{result.summary}</p>
          </div>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SubScoreBar
          label={t('matchingSubSkills')}
          icon={<Wrench className="h-3.5 w-3.5" />}
          score={result.subscores.skills}
          tone="skills"
        />
        <SubScoreBar
          label={t('matchingSubExperience')}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          score={result.subscores.experience}
          tone="experience"
        />
        <SubScoreBar
          label={t('matchingSubKeywords')}
          icon={<Target className="h-3.5 w-3.5" />}
          score={result.subscores.keywords}
          tone="keywords"
        />
      </div>

      {/* Strengths & gaps */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FindingCard
          title={t('matchingReportStrengths')}
          icon={<CheckCircle2 className="h-4 w-4" />}
          items={result.strengths}
          tone="positive"
        />
        <FindingCard
          title={t('matchingReportGaps')}
          icon={<AlertTriangle className="h-4 w-4" />}
          items={result.gaps}
          tone="warning"
        />
      </div>

      {/* Keyword correspondence */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {t('matchingReportMatched')}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {result.matchedKeywords.length === 0 && (
              <span className="text-xs text-slate-400">â€”</span>
            )}
            {result.matchedKeywords.map((keyword) => (
              <KeywordChip key={keyword} label={keyword} tone="matched" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-rose-800">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            {t('matchingReportMissing')}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {result.missingKeywords.length === 0 && (
              <span className="text-xs text-slate-400">â€”</span>
            )}
            {result.missingKeywords.map((keyword) => (
              <KeywordChip key={keyword} label={keyword} tone="missing" />
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-5 rounded-2xl border border-brand-200/70 bg-brand-50/40 p-5">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-900">
          <Lightbulb className="h-4 w-4 text-brand-600" />
          {t('matchingReportRecommendations')}
        </h4>
        <ol className="space-y-3">
          {result.recommendations.length === 0 && (
            <li className="text-xs text-slate-500">â€”</li>
          )}
          {result.recommendations.map((item) => (
            <li key={item.title} className="flex items-start gap-2.5 text-[13px] text-slate-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-black text-white">
                {result.recommendations.indexOf(item) + 1}
              </span>
              <span>
                <strong className="font-bold text-slate-900">{item.title}</strong>
                {item.detail && <span className="text-slate-600"> â€” {item.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
