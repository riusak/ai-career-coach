/**
 * JSON structure stored in the `resumes.parsed_content` column.
 * Populated by the parsing pipeline (Sprint 2.2); null until parsed.
 */
export interface ParsedResumeContent {
  raw_text: string;
  word_count: number;
  parsed_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  /** Optional user-defined category/description ("CV Dev", "CV Data FR"...). */
  label: string | null;
  /** The user's default CV (⭐). At most one true row per user (DB-enforced). */
  is_primary: boolean;
  parsed_content: ParsedResumeContent | null;
  created_at: string;
}

/** Kind of automated analysis stored in `resume_analyses.analysis_type`. */
export type ResumeAnalysisType = 'light' | 'deep';

/**
 * Row of the append-only `resume_analyses` log (migration 003).
 * `score` is null while the analysis job is queued/processing.
 */
export interface ResumeAnalysis {
  id: string;
  resume_id: string;
  user_id: string;
  analysis_type: ResumeAnalysisType;
  score: number | null;
  structured_output: Record<string, unknown> | null;
  created_at: string;
}

export type ResumeResponse<T> = {
  data: T | null;
  error: string | null;
};

import type { QuickTestAnalysis, QuickTestSource } from '@/types/quick-test';

/**
 * Payload persisted in `resume_analyses.structured_output` once the deep
 * analysis pipeline completes (migration 007 enables the completion UPDATE).
 */
export interface DeepAnalysisOutput {
  /** Which engine produced the analysis: Gemini LLM or heuristic fallback. */
  source: QuickTestSource;
  /** Full structured result (score breakdown, insights, expert advice). */
  analysis: QuickTestAnalysis;
}

/**
 * Transient claim marker written into `structured_output` while the pipeline
 * processes a queued row (score stays null). A claim older than the pipeline
 * stale-claim window is considered abandoned and may be reclaimed.
 */
export interface DeepAnalysisProcessingMarker {
  status: 'processing';
  claimed_at: string;
}
