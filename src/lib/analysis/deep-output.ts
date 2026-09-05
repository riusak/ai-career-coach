import type { InsightItem, ScoreBreakdownItem } from '@/types/quick-test';
import type { DeepAnalysisOutput } from '@/types/resume';

/**
 * Defensively coerces the raw `resume_analyses.structured_output` jsonb into a
 * typed {@link DeepAnalysisOutput}. Pure and framework-free so both server
 * adapters and client components can rely on it (extracted from
 * DeepAnalysisReport during the Phase 2 dashboard migration).
 */
export function parseDeepAnalysisOutput(value: unknown): DeepAnalysisOutput | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const source = record.source;
  if (source !== 'llm' && source !== 'heuristic') {
    // Also rejects the transient {status:'processing'} claim marker.
    return null;
  }
  const raw = record.analysis;
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const a = raw as Record<string, unknown>;
  if (typeof a.score !== 'number') {
    return null;
  }

  const stringItems = (input: unknown): InsightItem[] =>
    Array.isArray(input)
      ? input.filter(
          (item): item is InsightItem =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as Record<string, unknown>).title === 'string'
        )
      : [];

  const breakdown: ScoreBreakdownItem[] = Array.isArray(a.scoreBreakdown)
    ? a.scoreBreakdown.filter(
        (item): item is ScoreBreakdownItem =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>).category === 'string' &&
          typeof (item as Record<string, unknown>).score === 'number'
      )
    : [];

  return {
    source,
    analysis: {
      score: a.score,
      scoreBreakdown: breakdown,
      strengths: stringItems(a.strengths),
      weaknesses: stringItems(a.weaknesses),
      recommendations: stringItems(a.recommendations),
      formattingAdvice: typeof a.formattingAdvice === 'string' ? a.formattingAdvice : '',
      actionVerbsAdvice: typeof a.actionVerbsAdvice === 'string' ? a.actionVerbsAdvice : '',
      impactMetricsAdvice: typeof a.impactMetricsAdvice === 'string' ? a.impactMetricsAdvice : '',
    },
  };
}