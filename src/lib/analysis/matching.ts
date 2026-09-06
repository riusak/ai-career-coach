/**
 * analysis/matching.ts — THE single job-matching pipeline (Phase 5.2).
 *
 * The only implementation of the "CV + offre → diagnostic structuré" stage.
 * Like the deep-analysis pipeline (`analysis/pipeline.ts`), it is consumed by
 * a thin HTTP adapter (`POST /api/resume/match`) after the queue worker has
 * claimed its row: validation → stage signaling → LLM call → structured result.
 *
 * Principles (inherited from the analysis pipeline):
 *  - server-authoritative validation with bounded inputs (offer text 20–12k
 *    chars, resume text capped at 20k chars before hitting the prompt);
 *  - NO silent heuristic fallback: an unavailable or failed LLM is a visible
 *    error (`llm_unavailable` / `llm_failed`), never a fake score;
 *  - the `onStage` hook advances the client waiting-ticket in lockstep with
 *    the REAL work (extracting → comparing → reporting).
 */

import {
  isLlmConfigured,
  matchJobOfferWithGemini,
  type JobMatchLlmOutcome,
} from '@/lib/quick-test/matching-llm';
import type { JobMatchResult, MatchingStage } from '@/types/matching';

/** Max offer text accepted by the pipeline (mirrors the LLM module). */
export const MAX_MATCHING_OFFER_CHARS = 12_000;
/** Max job-title length (DB-enforced as well via job_matchings_title_check). */
export const MAX_MATCHING_TITLE_CHARS = 200;
/** Cap on the resume text embedded in the matching prompt. */
export const MAX_MATCHING_RESUME_CHARS = 20_000;

export type MatchingPipelineErrorCode =
  | 'resume_text_missing'
  | 'job_title_missing'
  | 'matching_empty'
  | 'matching_too_short'
  | 'matching_too_large'
  | 'llm_unavailable'
  | 'llm_failed';

export interface MatchingPipelineError {
  code: MatchingPipelineErrorCode;
  httpStatus: number;
  message: string;
}

export interface MatchCvAgainstOfferInput {
  /** Extracted CV text (parsed_content or on-the-fly extraction). */
  resumeText: string;
  jobTitle: string;
  jobDescription: string;
  /** Optional user-provided metadata (preferred over LLM detection). */
  company?: string | null;
  location?: string | null;
  /**
   * Real progress hook invoked around each stage boundary so the client
   * waiting-ticket advances with the actual pipeline work.
   */
  onStage?: (stage: MatchingStage) => void;
}

export interface MatchSuccess {
  ok: true;
  result: JobMatchResult;
  source: 'llm';
}

export interface MatchFailure {
  ok: false;
  error: MatchingPipelineError;
}

export type MatchingResult = MatchSuccess | MatchFailure;

function failure(
  code: MatchingPipelineErrorCode,
  httpStatus: number,
  message: string
): MatchFailure {
  return { ok: false, error: { code, httpStatus, message } };
}

function normalizeOptional(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : null;
}

/** Maps the LLM outcome to the persisted result shape (defensive defaults). */
function buildResult(
  outcome: JobMatchLlmOutcome,
  input: MatchCvAgainstOfferInput
): JobMatchResult {
  const llm = outcome.result;
  if (!llm) {
    // Unreachable when the caller checks outcome first; kept for exhaustiveness.
    throw new Error('Missing LLM matching result.');
  }

  const clamp = (value: number): number =>
    Math.round(Math.min(100, Math.max(0, value)));

  return {
    overall: clamp(llm.overallScore),
    subscores: {
      skills: clamp(llm.skillsScore),
      experience: clamp(llm.experienceScore),
      keywords: clamp(llm.keywordsScore),
    },
    summary: llm.summary,
    jobTitle: normalizeOptional(llm.jobTitle),
    strengths: llm.strengths.slice(0, 6),
    gaps: llm.gaps.slice(0, 6),
    matchedKeywords: llm.matchedKeywords.slice(0, 12),
    missingKeywords: llm.missingKeywords.slice(0, 12),
    recommendations: llm.recommendations.slice(0, 6),
    company: normalizeOptional(input.company) ?? normalizeOptional(llm.company),
    location: normalizeOptional(input.location) ?? normalizeOptional(llm.location),
  };
}

/**
 * Runs the CV-vs-offer comparison: validates the inputs, then delegates the
 * single LLM call to the matching Gemini module. Returns the structured
 * diagnostic or an explicit machine-readable failure.
 */
export async function analyzeJobMatch(
  input: MatchCvAgainstOfferInput
): Promise<MatchingResult> {
  const resumeText = input.resumeText.trim();
  if (resumeText.length === 0) {
    return failure(
      'resume_text_missing',
      422,
      'Le contenu du CV est introuvable. Analysez d’abord ce CV puis relancez le matching.'
    );
  }

  const jobTitle = input.jobTitle.trim();
  if (jobTitle.length === 0) {
    return failure(
      'job_title_missing',
      422,
      'L’intitulé du poste cible est requis pour lancer le matching.'
    );
  }

  const jobDescription = input.jobDescription.trim();
  if (jobDescription.length === 0) {
    return failure(
      'matching_empty',
      400,
      'Collez le texte de l’offre d’emploi avant de lancer le matching.'
    );
  }
  if (jobDescription.length < 20) {
    return failure(
      'matching_too_short',
      422,
      'Le texte de l’offre est trop court (20 caractères minimum) pour une évaluation fiable.'
    );
  }
  if (jobDescription.length > MAX_MATCHING_OFFER_CHARS) {
    return failure(
      'matching_too_large',
      413,
      `Le texte de l’offre dépasse la limite de ${MAX_MATCHING_OFFER_CHARS} caractères.`
    );
  }

  // Stage boundary — extraction done (caller pre-resolves the CV text).
  input.onStage?.('comparing');

  if (!isLlmConfigured()) {
    console.error('[matching] GEMINI_API_KEY non configurée — matching impossible.');
    return failure(
      'llm_unavailable',
      503,
      "Configuration serveur incomplète : la clé d'API IA (GEMINI_API_KEY) n'est pas définie sur le serveur."
    );
  }

  const outcome = await matchJobOfferWithGemini({
    resumeText: resumeText.slice(0, MAX_MATCHING_RESUME_CHARS),
    jobTitle: jobTitle.slice(0, MAX_MATCHING_TITLE_CHARS),
    jobDescription,
  });

  if (!outcome.result) {
    console.error(
      `[matching] LLM matching FAILED for a valid input (resume ${resumeText.length} chars, offer ${jobDescription.length} chars).`
    );
    return failure(
      'llm_failed',
      502,
      'Le matching IA n’a pas abouti après plusieurs tentatives (service momentanément saturé ou indisponible). Veuillez relancer.'
    );
  }

  // Stage boundary — LLM comparison done; compose the final report.
  input.onStage?.('reporting');

  const result = buildResult(outcome, input);
  console.info(
    `[matching] ✅ Matching completed — overall=${result.overall}, ` +
      `skills=${result.subscores.skills}, experience=${result.subscores.experience}, ` +
      `keywords=${result.subscores.keywords}, missing=${result.missingKeywords.length}`
  );
  return { ok: true, result, source: 'llm' };
}