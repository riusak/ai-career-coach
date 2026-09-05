import type { InsightItem, RecommendationItem } from '@/types/quick-test';

/**
 * Job-matching types — Phase 5.2 pipeline.
 *
 * A `job_matchings` row (migration 003 + 011) is an append-only event log:
 * the row is inserted QUEUED (`match_score` null, `matching_details` null),
 * claimed by the worker (transient {status:'processing'} marker), then
 * completed with { match_score, matching_details } — or deleted on a terminal
 * failure so the UI never hangs on a result that will never arrive.
 */

/** Where the offer text came from. `job_description` is always the text. */
export type MatchingSourceType = 'file' | 'url' | 'text';

/**
 * Real pipeline stages reported by the matching worker through the transient
 * marker (mirrors `AnalysisStage` of the deep-analysis pipeline, adapted to
 * the matching steps).
 */
export type MatchingStage = 'extracting' | 'comparing' | 'reporting';

/** The three global sub-dimensions of the match score (skills/experience/ats). */
export interface JobMatchSubscores {
  /** Technical skills overlap, 0–100. */
  skills: number;
  /** Seniority / experience adequacy, 0–100. */
  experience: number;
  /** Keyword / ATS correspondence, 0–100. */
  keywords: number;
}

/** Full structured result of a completed matching run. */
export interface JobMatchResult {
  /** Global match score, 0–100. */
  overall: number;
  subscores: JobMatchSubscores;
  /** One-paragraph recruiter-grade synthesis of the fit. */
  summary: string;
  /** What the CV demonstrates really well for THIS offer. */
  strengths: InsightItem[];
  /** Requirement-level gaps (missing skills, under-claimed proof…). */
  gaps: InsightItem[];
  /** ATS keywords found in both the offer and the CV. */
  matchedKeywords: string[];
  /** Explicit ATS keywords of the offer absent from the CV. */
  missingKeywords: string[];
  /** Targeted actions to close the gap (title, keywords, interview prep…). */
  recommendations: RecommendationItem[];
  /** Company / location detected by the LLM (falls back to the user input). */
  company: string | null;
  location: string | null;
}

/**
 * Payload persisted in `job_matchings.matching_details`.
 * While queued it only carries the transient processing marker; once completed
 * it carries the full {@link JobMatchResult} (see `matching-output.ts` for the
 * defensive parse).
 */
export interface JobMatchingDetails {
  /** Which engine produced the match: Gemini LLM (only one today). */
  source: 'llm';
  /** Transient claim marker written while the worker processes the row. */
  status?: 'processing';
  claimed_at?: string;
  /** Last REAL pipeline stage reached by the worker (loading ticket). */
  stage?: MatchingStage;
  /** Final result — present only when the run completed (match_score set). */
  result?: JobMatchResult;
}

/** Full `job_matchings` row as read from Supabase. */
export interface JobMatching {
  id: string;
  resume_id: string;
  user_id: string;
  job_title: string;
  job_description: string;
  company: string | null;
  location: string | null;
  source_type: MatchingSourceType | null;
  source_url: string | null;
  offer_file_name: string | null;
  /** Global score (0–100) — null while queued/processing. */
  match_score: number | null;
  matching_details: JobMatchingDetails | null;
  created_at: string;
}

export type MatchingResponse<T> = {
  data: T | null;
  error: string | null;
};

/** Light history-card model sent to the matching dashboard client (no text). */
export interface JobMatchingSummary {
  id: string;
  resumeId: string;
  jobTitle: string;
  company: string | null;
  location: string | null;
  /** Global score (0–100) — null while queued/processing or on failure. */
  matchScore: number | null;
  /** ISO timestamp rendered client-side with the active locale. */
  createdAt: string;
  /** True when the row carries a usable completed result payload. */
  hasDetails: boolean;
}