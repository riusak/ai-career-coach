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
// NOTE: gemini-2.5-flash was retired for new Google accounts (2026) — use
// gemini-3.6-flash (or override with GEMINI_MODEL). `gemini-flash-latest`
// also tracks the newest stable Flash model.
const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_LLM_TEXT_CHARS = 15_000;
const LLM_TIMEOUT_MS = 30_000;

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
  prompt: string
): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[quick-test] GEMINI_API_KEY not configured — skipping Gemini call.');
    return null;
  }

  const model = getGeminiModel();
  const startedAt = Date.now();
  console.info(`[quick-test] Gemini (generic) START model=${model} promptChars=${prompt.length}`);

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
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      }
    );

    const elapsedMs = Date.now() - startedAt;

    if (!response.ok) {
      console.error(`[quick-test] Gemini (generic) FAILED after ${elapsedMs}ms — HTTP ${response.status} ${response.statusText}.`);
      return null;
    }

    const body: unknown = await response.json();
    const generatedText = extractGeminiText(body);
    if (!generatedText || generatedText.trim().length === 0) {
      console.error(`[quick-test] Gemini (generic) FAILED after ${elapsedMs}ms — no generated content.`);
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(generatedText);
    } catch {
      console.error(`[quick-test] Gemini (generic) FAILED after ${elapsedMs}ms — invalid JSON (${generatedText.length} chars).`);
      return null;
    }

    console.info(`[quick-test] Gemini (generic) SUCCESS in ${elapsedMs}ms`);
    return parsed as T;
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(`[quick-test] Gemini (generic) FAILED after ${elapsedMs}ms — network/timeout error:`, error);
    return null;
  }
}

/** Builds the French deep-analysis prompt for the Gemini request. */
export function buildAnalysisPrompt(cvText: string): string {
  const truncated =
    cvText.length > MAX_LLM_TEXT_CHARS
      ? `${cvText.slice(0, MAX_LLM_TEXT_CHARS)}\n[Texte tronqué]`
      : cvText;

  return [
    'Tu es un coach de carrière senior et recruteur expert (10+ ans en cabinet de recrutement).',
    'Réalise une analyse professionnelle COMPLÈTE et DÉTAILLÉE du CV ci-dessous,',
    'identique à celle d’un audit payant. Renvoie UNIQUEMENT un objet JSON valide, sans texte autour,',
    'avec exactement cette structure :',
    '{',
    '  "score": <nombre 0-100, note globale du CV>,',
    '  "score_breakdown": [',
    '    {"category": "<dimension>", "score": <0-100>, "comment": "<justification d’une phrase>"}',
    '  ],',
    '  "strengths": [{"title": "<point fort>", "detail": "<explication précise, preuve tirée du CV>"}],',
    '  "weaknesses": [{"title": "<point faible>", "detail": "<explication précise, impact recruteur>"}],',
    '  "recommendations": [{"title": "<action prioritaire>", "detail": "<comment faire, concrètement>"}],',
    '  "formatting_advice": "<conseil contextuel sur la mise en page, la longueur et la lisibilité>",',
    '  "action_verbs_advice": "<conseil contextuel sur les verbes d’action et les formulations>",',
    '  "impact_metrics_advice": "<conseil contextuel sur le chiffrage des résultats et la preuve d’impact>"',
    '}',
    '',
    'Exigences de qualité :',
    '- score_breakdown : évalue au minimum ces 5 dimensions sur 100 avec une justification chacune :',
    '  "Structure & lisibilité", "Impact chiffré", "Clarté des missions", "Adéquation au poste visé", "Mots-clés & ATS".',
    '- strengths : 2 à 4 points forts, chacun ancré dans une preuve précise du texte.',
    '- weaknesses : 2 à 4 points faibles concrets, formulés comme un recruteur les verrait.',
    '- recommendations : 2 à 4 actions concrètes et priorisées, adaptées AU CONTENU de ce CV',
    '  (pas de conseil générique), avec le « comment » opérationnel.',
    '- Les 3 conseils ciblés doivent citer des éléments réels du CV et proposer une reformulation exemple.',
    '- Texte entièrement en français ; ton professionnel et direct.',
    '- Base-toi uniquement sur le texte fourni, sans inventer d’expérience.',
    '',
    '=== CV ===',
    truncated,
    '=== FIN DU CV ===',
  ].join('\n');
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

/**
 * Runs the deep analysis through Gemini, synchronously, in real time.
 * Every step is logged server-side: START, SUCCESS (with duration and
 * payload statistics) and FAILURE (with the exact reason) — a fallback to
 * the heuristic analyzer is never silent. Returns null on any failure
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

  const model = getGeminiModel();
  const startedAt = Date.now();
  console.info(
    `[quick-test] Gemini START model=${model} chars=${cvText.length} timeoutMs=${LLM_TIMEOUT_MS}`
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
            temperature: 0.4,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
          },
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      }
    );

    const elapsedMs = Date.now() - startedAt;

    if (!response.ok) {
      console.error(
        `[quick-test] Gemini FAILED after ${elapsedMs}ms — HTTP ${response.status} ${response.statusText}. Falling back to heuristic.`
      );
      return null;
    }

    const body: unknown = await response.json();
    const generatedText = extractGeminiText(body);
    if (generatedText === null || generatedText.trim().length === 0) {
      console.error(
        `[quick-test] Gemini FAILED after ${elapsedMs}ms — response contained no generated content. Falling back to heuristic.`
      );
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(generatedText);
    } catch {
      console.error(
        `[quick-test] Gemini FAILED after ${elapsedMs}ms — generated text is not valid JSON (${generatedText.length} chars). Falling back to heuristic.`
      );
      return null;
    }

    const analysis = coerceLlmAnalysis(parsed);
    if (!analysis) {
      console.error(
        `[quick-test] Gemini FAILED after ${elapsedMs}ms — payload failed schema coercion (missing/broken required fields). Falling back to heuristic.`
      );
      return null;
    }

    console.info(
      `[quick-test] Gemini SUCCESS in ${elapsedMs}ms → score=${analysis.score}, ` +
        `breakdown=${analysis.scoreBreakdown.length}, strengths=${analysis.strengths.length}, ` +
        `weaknesses=${analysis.weaknesses.length}, recommendations=${analysis.recommendations.length} (source=llm)`
    );
    return analysis;
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(
      `[quick-test] Gemini FAILED after ${elapsedMs}ms — network/timeout error:`,
      error,
      'Falling back to heuristic.'
    );
    return null;
  }
}