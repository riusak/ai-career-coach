import type { InsightItem, QuickTestAnalysis, ScoreBreakdownItem } from '@/types/quick-test';

/**
 * Google Gemini (Flash) client for the visitor Quick Test — DEEP analysis.
 *
 * v2 requirements (quality review):
 *  - the real Gemini Flash API is called synchronously on every request
 *    with a comprehensive recruiter-grade prompt and a strict responseSchema;
 *  - every phase is logged server-side (START / SUCCESS with duration and
 *    payload stats / FAILURE with the exact reason) so a fallback to the
 *    heuristic analyzer is never silent;
 *  - the CV text lives only for the duration of the request — nothing is
 *    logged or persisted beyond the API call itself.
 */

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
// Model selection (live-latency benchmarked 2026-09, 12k-char CV): the flash
// tier is the best quality/speed tradeoff — flash-lite variants are faster
// but produce inconsistent scores. gemini-2.5-* models return 404 on current
// keys. Override with GEMINI_MODEL.
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
const MAX_LLM_TEXT_CHARS = 12_000;
// Thinking is explicitly DISABLED for the flash model: it silently emits
// ~1200 internal "thought" tokens per call, doubling the latency
// (9.7s → 4.7s measured on a 12k-char CV with the full analysis schema).
const GEMINI_THINKING_CONFIG = { thinkingConfig: { thinkingBudget: 0 } } as const;
// Hard cap on generated JSON size (measured output ≈ 850 tokens; the cap only
// guards against runaway generations, which would hit the timeout anyway).
const MAX_OUTPUT_TOKENS = 4096;
// Timeout for a single analysis attempt — 4x the measured p95 (~5 s with
// thinking disabled), yet bounded so the request always finishes well before
// the 60 s Vercel maxDuration and the 45 s client fetch timeout.
const LLM_TIMEOUT_MS = 20_000;
// Total wall-clock budget for the full analyzeWithGemini call, including one
// fast-failure retry. Must stay under the 45 s client timeout once the
// guardrail call (8 s) and PDF extraction are accounted for.
const LLM_TOTAL_BUDGET_MS = 32_000;
// A first attempt that fails quicker than this is considered a "fast failure"
// (429/503/model-404/network refused) — worth one immediate retry. A timeout
// already consumed most of the budget, so it is never retried.
const LLM_FAST_FAILURE_CEILING_MS = 10_000;
// Shorter timeout for the guardrail validation call (fast-path). Bumped from
// 5 s: the previous value aborted valid calls when the API was slow, forcing
// the heuristic guardrail fallback more often than necessary.
export const GUARDRAIL_TIMEOUT_MS = 8_000;

export type AnalysisSource = 'llm' | 'heuristic';

export function isLlmConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
}

/**
 * Generic Gemini JSON caller — reusable for non-analysis prompts (e.g. the
 * CV-validation guardrail). Returns `null` on any failure so the caller can
 * decide how to fall back. Logs every phase synchronously like analyzeWithGemini.
 */
export async function callGeminiJson<T>(
  prompt: string,
  options: { timeoutMs?: number; temperature?: number } = {}
): Promise<T | null> {
  const { timeoutMs = LLM_TIMEOUT_MS, temperature = 0.1 } = options;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[quick-test] GEMINI_API_KEY not configured — skipping Gemini call.');
    return null;
  }

  const model = getGeminiModel();
  const startedAt = Date.now();
  console.time(`[quick-test] Gemini (generic) model=${model}`);
  console.info(`[quick-test] Gemini (generic) START model=${model} promptChars=${prompt.length} timeoutMs=${timeoutMs}`);

  try {
    const response = await fetch(
      `${GEMINI_API_BASE_URL}/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            responseMimeType: 'application/json',
            ...GEMINI_THINKING_CONFIG,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );

    const elapsedMs = Date.now() - startedAt;

    if (!response.ok) {
      console.error(`[quick-test] Gemini (generic) FAILED after ${elapsedMs}ms — HTTP ${response.status} ${response.statusText}.`);
      console.timeEnd(`[quick-test] Gemini (generic) model=${model}`);
      return null;
    }

    const body: unknown = await response.json();
    const generatedText = extractGeminiText(body);
    if (!generatedText || generatedText.trim().length === 0) {
      console.error(`[quick-test] Gemini (generic) FAILED after ${elapsedMs}ms — no generated content.`);
      console.timeEnd(`[quick-test] Gemini (generic) model=${model}`);
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(generatedText);
    } catch {
      console.error(`[quick-test] Gemini (generic) FAILED after ${elapsedMs}ms — invalid JSON (${generatedText.length} chars).`);
      console.timeEnd(`[quick-test] Gemini (generic) model=${model}`);
      return null;
    }

    console.info(`[quick-test] Gemini (generic) SUCCESS in ${elapsedMs}ms`);
    console.timeEnd(`[quick-test] Gemini (generic) model=${model}`);
    return parsed as T;
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(`[quick-test] Gemini (generic) FAILED after ${elapsedMs}ms — network/timeout error:`, error);
    console.timeEnd(`[quick-test] Gemini (generic) model=${model}`);
    return null;
  }
}

/** Builds the French deep-analysis prompt for the Gemini request. */
export function buildAnalysisPrompt(cvText: string): string {
  const truncated =
    cvText.length > MAX_LLM_TEXT_CHARS
      ? `${cvText.slice(0, MAX_LLM_TEXT_CHARS)}\n[tronqué]`
      : cvText;

  return `Tu es un recruteur expert. Analyse ce CV et renvoie UNIQUEMENT un JSON valide (sans texte autour) avec cette structure exacte :
{
  "score": <0-100>,
  "score_breakdown": [
    {"category": "<dimension>", "score": <0-100>, "comment": "<justification>"}
  ],
  "strengths": [{"title": "<titre>", "detail": "<preuve du CV>"}],
  "weaknesses": [{"title": "<titre>", "detail": "<impact recruteur>"}],
  "recommendations": [{"title": "<action>", "detail": "<comment faire>"}],
  "formatting_advice": "<conseil mise en page>",
  "action_verbs_advice": "<conseil verbes d'action>",
  "impact_metrics_advice": "<conseil chiffrage>"
}

Règles : 5 dimensions minimum (Structure, Impact chiffré, Clarté missions, Adéquation poste, Mots-clés ATS) ; 2-4 éléments par liste ; conseils concrets et spécifiques au CV ; français ; pas d'invention.

CV :
${truncated}`;
}

const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    score: { type: 'NUMBER' },
    score_breakdown: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING' },
          score: { type: 'NUMBER' },
          comment: { type: 'STRING' },
        },
        required: ['category', 'score', 'comment'],
      },
    },
    strengths: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, detail: { type: 'STRING' } },
        required: ['title', 'detail'],
      },
    },
    weaknesses: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, detail: { type: 'STRING' } },
        required: ['title', 'detail'],
      },
    },
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, detail: { type: 'STRING' } },
        required: ['title', 'detail'],
      },
    },
    formatting_advice: { type: 'STRING' },
    action_verbs_advice: { type: 'STRING' },
    impact_metrics_advice: { type: 'STRING' },
  },
  required: [
    'score',
    'score_breakdown',
    'strengths',
    'weaknesses',
    'recommendations',
    'formatting_advice',
    'action_verbs_advice',
    'impact_metrics_advice',
  ],
} as const;

const MAX_BREAKDOWN_ITEMS = 8;
const MAX_INSIGHT_ITEMS = 4;
const MAX_RECOMMENDATION_ITEMS = 5;
const MAX_ITEM_TEXT_LENGTH = 400;
const MAX_ADVICE_LENGTH = 700;

const clampScore = (value: number): number => Math.round(Math.min(100, Math.max(0, value)));

/** Coerces a raw item into a titled insight (accepts plain strings too). */
function coerceInsight(value: unknown): InsightItem | null {
  if (typeof value === 'string') {
    const text = value.trim();
    return text.length > 0 ? { title: text.slice(0, 120), detail: '' } : null;
  }
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  const detail = typeof record.detail === 'string' ? record.detail.trim() : '';
  if (title.length === 0 && detail.length === 0) {
    return null;
  }
  return {
    title: title.slice(0, MAX_ITEM_TEXT_LENGTH) || detail.slice(0, 120),
    detail: detail.slice(0, MAX_ITEM_TEXT_LENGTH),
  };
}

function coerceInsightList(value: unknown, max: number): InsightItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(coerceInsight)
    .filter((item): item is InsightItem => item !== null)
    .slice(0, max);
}

function coerceBreakdown(value: unknown): ScoreBreakdownItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: ScoreBreakdownItem[] = [];
  for (const raw of value.slice(0, MAX_BREAKDOWN_ITEMS * 2)) {
    if (typeof raw !== 'object' || raw === null) {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const category = typeof record.category === 'string' ? record.category.trim() : '';
    const scoreRaw = typeof record.score === 'number' ? record.score : Number.NaN;
    const comment = typeof record.comment === 'string' ? record.comment.trim() : '';
    if (category.length === 0 || !Number.isFinite(scoreRaw)) {
      continue;
    }
    items.push({
      category: category.slice(0, 80),
      score: clampScore(scoreRaw),
      comment: comment.slice(0, MAX_ITEM_TEXT_LENGTH),
    });
    if (items.length >= MAX_BREAKDOWN_ITEMS) {
      break;
    }
  }
  return items;
}

/** Coerces and validates the raw LLM payload into the deep analysis shape. */
export function coerceLlmAnalysis(raw: unknown): QuickTestAnalysis | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const record = raw as Record<string, unknown>;

  const scoreRaw = record.score;
  const score =
    typeof scoreRaw === 'number'
      ? scoreRaw
      : typeof scoreRaw === 'string'
        ? Number.parseFloat(scoreRaw)
        : Number.NaN;
  if (!Number.isFinite(score)) {
    return null;
  }

  const scoreBreakdown = coerceBreakdown(record.score_breakdown);
  const strengths = coerceInsightList(record.strengths, MAX_INSIGHT_ITEMS);
  const weaknesses = coerceInsightList(record.weaknesses, MAX_INSIGHT_ITEMS);
  const recommendations = coerceInsightList(record.recommendations, MAX_RECOMMENDATION_ITEMS);

  if (
    scoreBreakdown.length === 0 ||
    strengths.length === 0 ||
    weaknesses.length === 0 ||
    recommendations.length === 0
  ) {
    return null;
  }

  const advice = (value: unknown): string => {
    if (typeof value !== 'string') {
      return '';
    }
    const trimmed = value.trim();
    return trimmed.slice(0, MAX_ADVICE_LENGTH);
  };

  return {
    score: clampScore(score),
    scoreBreakdown,
    strengths,
    weaknesses,
    recommendations,
    formattingAdvice: advice(record.formatting_advice),
    actionVerbsAdvice: advice(record.action_verbs_advice),
    impactMetricsAdvice: advice(record.impact_metrics_advice),
  };
}

/** Pulls the generated text out of a Gemini `generateContent` response body. */
export function extractGeminiText(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const candidates = (body as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }
  const content = (candidates[0] as Record<string, unknown>).content;
  if (typeof content !== 'object' || content === null) {
    return null;
  }
  const parts = (content as Record<string, unknown>).parts;
  if (!Array.isArray(parts)) {
    return null;
  }
  return parts
    .map((part) =>
      typeof part === 'object' && part !== null
        ? ((part as Record<string, unknown>).text ?? '')
        : ''
    )
    .join('');
}

/** Outcome of a single analysis attempt, with the machine-readable reason. */
interface GeminiAttemptResult {
  analysis: QuickTestAnalysis | null;
  reason: string | null;
}

/**
 * Runs the deep analysis through Gemini, synchronously, in real time, with a
 * built-in retry: a second attempt is made when the first one failed FAST
 * (HTTP 429/503/model-404, connection refused…) within
 * LLM_FAST_FAILURE_CEILING_MS, while the remaining wall-clock budget allows
 * it. Timeouts are never retried (they already consumed the budget).
 *
 * Every step is logged server-side: START, SUCCESS (with duration and
 * payload statistics) and FAILURE (with the exact reason) — a fallback to
 * the heuristic analyzer is never silent. Returns null on any final failure
 * (network, timeout, malformed output) so the caller can fall back.
 */
export async function analyzeWithGemini(cvText: string): Promise<QuickTestAnalysis | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(
      '[quick-test] GEMINI_API_KEY not configured — heuristic fallback active (dev/CI mode).'
    );
    return null;
  }

  const overallStartedAt = Date.now();
  let lastReason = 'unknown';

  for (let attempt = 1; attempt <= 2; attempt++) {
    const elapsedMs = Date.now() - overallStartedAt;
    const remainingBudgetMs = LLM_TOTAL_BUDGET_MS - elapsedMs;
    if (remainingBudgetMs < 5_000) {
      console.warn(
        `[quick-test] Gemini retry skipped — remaining budget ${remainingBudgetMs}ms too small.`
      );
      break;
    }

    const { analysis, reason } = await analyzeWithGeminiOnce(
      cvText,
      apiKey,
      Math.min(LLM_TIMEOUT_MS, remainingBudgetMs)
    );
    if (analysis) {
      return analysis;
    }
    lastReason = reason ?? 'unknown';

    // Only worth retrying when the attempt failed quickly — a timeout or a
    // slow failure already consumed most of the wall-clock budget.
    const attemptElapsedMs = Date.now() - overallStartedAt - elapsedMs;
    if (attempt === 1 && attemptElapsedMs <= LLM_FAST_FAILURE_CEILING_MS) {
      console.warn(
        `[quick-test] Gemini attempt 1 failed fast in ${attemptElapsedMs}ms (${lastReason}) — retrying once within the remaining budget…`
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    break;
  }

  console.error(
    `[quick-test] Gemini FAILED after all attempts in ${Date.now() - overallStartedAt}ms — ` +
      `last reason: ${lastReason}. Falling back to heuristic.`
  );
  return null;
}

/**
 * Runs ONE analysis attempt against Gemini. Returns the coerced analysis on
 * success, or a structured failure reason for the retry/fallback logic.
 */
async function analyzeWithGeminiOnce(
  cvText: string,
  apiKey: string,
  timeoutMs: number
): Promise<GeminiAttemptResult> {
  const model = getGeminiModel();
  const startedAt = Date.now();
  console.time(`[quick-test] Gemini (analysis) model=${model}`);
  console.info(
    `[quick-test] Gemini START model=${model} chars=${cvText.length} timeoutMs=${timeoutMs}`
  );

  try {
    const response = await fetch(
      `${GEMINI_API_BASE_URL}/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildAnalysisPrompt(cvText) }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            ...GEMINI_THINKING_CONFIG,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );

    const elapsedMs = Date.now() - startedAt;

    if (!response.ok) {
      console.error(
        `[quick-test] Gemini FAILED after ${elapsedMs}ms — HTTP ${response.status} ${response.statusText}.`
      );
      console.timeEnd(`[quick-test] Gemini (analysis) model=${model}`);
      return { analysis: null, reason: `HTTP ${response.status} ${response.statusText}` };
    }

    const body: unknown = await response.json();
    const generatedText = extractGeminiText(body);
    if (generatedText === null || generatedText.trim().length === 0) {
      console.error(
        `[quick-test] Gemini FAILED after ${elapsedMs}ms — response contained no generated content.`
      );
      console.timeEnd(`[quick-test] Gemini (analysis) model=${model}`);
      return { analysis: null, reason: 'empty response (no generated content)' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(generatedText);
    } catch {
      console.error(
        `[quick-test] Gemini FAILED after ${elapsedMs}ms — generated text is not valid JSON (${generatedText.length} chars).`
      );
      console.timeEnd(`[quick-test] Gemini (analysis) model=${model}`);
      return { analysis: null, reason: 'invalid JSON payload' };
    }

    const analysis = coerceLlmAnalysis(parsed);
    if (!analysis) {
      console.error(
        `[quick-test] Gemini FAILED after ${elapsedMs}ms — payload failed schema coercion (missing/broken required fields).`
      );
      console.timeEnd(`[quick-test] Gemini (analysis) model=${model}`);
      return { analysis: null, reason: 'schema coercion failed' };
    }

    console.info(
      `[quick-test] Gemini SUCCESS in ${elapsedMs}ms → score=${analysis.score}, ` +
        `breakdown=${analysis.scoreBreakdown.length}, strengths=${analysis.strengths.length}, ` +
        `weaknesses=${analysis.weaknesses.length}, recommendations=${analysis.recommendations.length} (source=llm)`
    );
    console.timeEnd(`[quick-test] Gemini (analysis) model=${model}`);
    return { analysis, reason: null };
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(
      `[quick-test] Gemini FAILED after ${elapsedMs}ms — network/timeout error:`,
      error
    );
    console.timeEnd(`[quick-test] Gemini (analysis) model=${model}`);
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return { analysis: null, reason: isTimeout ? 'timeout' : 'network error' };
  }
}