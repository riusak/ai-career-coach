/**
 * Shared types for the visitor Quick Test funnel (docs/product/mvp.md §2).
 * The client component and the API route handler must stay in sync on these
 * shapes; neither side is allowed to persist any of this data.
 *
 * v2 — deep analysis: the visitor receives the same professional-grade
 * report as a paid user (score breakdown per dimension, structured
 * strengths/weaknesses/recommendations, targeted expert advice).
 */

/** Document metadata returned after ephemeral text extraction. */
export interface QuickTestMetadata {
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  wordCount: number;
}

/** One dimension of the score breakdown (e.g. "Impact chiffré" → 72). */
export interface ScoreBreakdownItem {
  /** Human-readable dimension label (French), e.g. "Structure & lisibilité". */
  category: string;
  /** Dimension score, 0–100. */
  score: number;
  /** One-sentence recruiter justification for this dimension score. */
  comment: string;
}

/** A titled insight: short label + explanatory detail. */
export interface InsightItem {
  title: string;
  detail: string;
}

/** An actionable recommendation: what to do + how/why. */
export interface RecommendationItem {
  title: string;
  detail: string;
}

/** Deep visitor-grade analysis (same professional depth as paid analyses). */
export interface QuickTestAnalysis {
  /** Global score, 0–100. */
  score: number;
  /** Per-dimension scores with recruiter justification. */
  scoreBreakdown: ScoreBreakdownItem[];
  strengths: InsightItem[];
  weaknesses: InsightItem[];
  recommendations: RecommendationItem[];
  /** Tailored advice on layout & formatting. */
  formattingAdvice: string;
  /** Tailored advice on action verbs & phrasing. */
  actionVerbsAdvice: string;
  /** Tailored advice on quantified impact & metrics. */
  impactMetricsAdvice: string;
}

/** Which engine produced the analysis: Gemini LLM or heuristic fallback. */
export type QuickTestSource = 'llm' | 'heuristic';

/** Successful Quick Test response. */
export interface QuickTestResponse {
  metadata: QuickTestMetadata;
  analysis: QuickTestAnalysis;
  source: QuickTestSource;
}
