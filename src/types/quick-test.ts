/**
 * Shared types for the visitor Quick Test funnel (docs/product/mvp.md §2).
 * The client component and the API route handler must stay in sync on these
 * shapes; neither side is allowed to persist any of this data.
 */

/** Document metadata returned after ephemeral text extraction. */
export interface QuickTestMetadata {
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  wordCount: number;
}

/** Lightweight visitor-grade analysis (analysis_type = 'light' equivalent). */
export interface QuickTestAnalysis {
  /** Global score, 0–100. */
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

/** Successful Quick Test response. */
export interface QuickTestResponse {
  metadata: QuickTestMetadata;
  analysis: QuickTestAnalysis;
  /** Which engine produced the analysis: Gemini LLM or heuristic fallback. */
  source: 'llm' | 'heuristic';
}