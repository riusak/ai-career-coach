import type { JobMatchingDetails, JobMatchResult } from '@/types/matching';

/**
 * Defensively coerces the raw `job_matchings.matching_details` jsonb into a
 * typed {@link JobMatchingDetails}. Pure and framework-free so both server
 * adapters and client components can rely on it (mirror of
 * `lib/analysis/deep-output.ts`).
 *
 * Returns null for:
 *  - non-object payloads;
 *  - the transient {status:'processing'} claim marker (queued row);
 *  - a payload whose `result` is missing/broken (never a partial report).
 */
export function parseJobMatchingDetails(value: unknown): JobMatchingDetails | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;

  // Transient claim marker written by the worker while the row is queued.
  if (record.status === 'processing') {
    return null;
  }

  const raw = record.result;
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.overall !== 'number' || !Number.isFinite(r.overall)) {
    return null;
  }

  const subscoresRaw =
    typeof r.subscores === 'object' && r.subscores !== null
      ? (r.subscores as Record<string, unknown>)
      : {};
  const score = (input: unknown): number =>
    typeof input === 'number' && Number.isFinite(input)
      ? Math.round(Math.min(100, Math.max(0, input)))
      : 0;

  const stringList = (input: unknown): string[] =>
    Array.isArray(input)
      ? input.filter((item): item is string => typeof item === 'string').slice(0, 12)
      : [];

  const insightList = (input: unknown): Array<{ title: string; detail: string }> =>
    Array.isArray(input)
      ? input
          .filter(
            (item): item is { title: string; detail: string } =>
              typeof item === 'object' &&
              item !== null &&
              typeof (item as Record<string, unknown>).title === 'string'
          )
          .map((item) => ({
            title: item.title.slice(0, 300),
            detail: typeof item.detail === 'string' ? item.detail.slice(0, 300) : '',
          }))
          .slice(0, 6)
      : [];

  const source = 'llm' as const;

  return {
    source,
    result: {
      overall: score(r.overall),
      subscores: {
        skills: score(subscoresRaw.skills),
        experience: score(subscoresRaw.experience),
        keywords: score(subscoresRaw.keywords),
      },
      summary: typeof r.summary === 'string' ? r.summary.slice(0, 600) : '',
      strengths: insightList(r.strengths),
      gaps: insightList(r.gaps),
      matchedKeywords: stringList(r.matchedKeywords),
      missingKeywords: stringList(r.missingKeywords),
      recommendations: insightList(r.recommendations),
      company: typeof r.company === 'string' ? r.company.slice(0, 120) : null,
      location: typeof r.location === 'string' ? r.location.slice(0, 120) : null,
    } satisfies JobMatchResult,
  };
}