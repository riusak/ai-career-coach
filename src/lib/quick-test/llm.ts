import type { QuickTestAnalysis } from '@/types/quick-test';

/**
 * Google Gemini (Flash) client for the visitor Quick Test.
 *
 * Called with a raw `fetch` (no SDK dependency). When GEMINI_API_KEY is
 * missing or the call fails, callers fall back to the deterministic
 * heuristic analyzer so the funnel keeps working in dev/CI.
 * The CV text lives only for the duration of the request — nothing is
 * logged or persisted beyond the API call itself.
 */

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_LLM_TEXT_CHARS = 15_000;
const LLM_TIMEOUT_MS = 30_000;

export type AnalysisSource = 'llm' | 'heuristic';

export function isLlmConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
}

/** Builds the French analysis prompt for the Gemini request. */
export function buildAnalysisPrompt(cvText: string): string {
  const truncated =
    cvText.length > MAX_LLM_TEXT_CHARS
      ? `${cvText.slice(0, MAX_LLM_TEXT_CHARS)}\n[Texte tronqué]`
      : cvText;

  return [
    'Tu es un coach de carrière expert en recrutement.',
    'Analyse le CV ci-dessous et renvoie UNIQUEMENT un objet JSON valide, sans texte autour,',
    'avec exactement cette structure :',
    '{"score": <nombre 0-100>, "strengths": [<2 à 3 points forts>],',
    ' "weaknesses": [<2 à 3 points faibles>], "recommendations": [<1 à 2 recommandations>]}',
    'Règles : texte entièrement en français ; chaque élément est une phrase concise',
    '(140 caractères maximum) ; le score reflète la qualité globale du CV (structure,',
    'impact chiffré, clarté, cohérence) ; base-toi uniquement sur le texte fourni.',
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
    strengths: { type: 'ARRAY', items: { type: 'STRING' } },
    weaknesses: { type: 'ARRAY', items: { type: 'STRING' } },
    recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['score', 'strengths', 'weaknesses', 'recommendations'],
} as const;

const MAX_ITEM_LENGTH = 280;

function sanitizeList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, MAX_ITEM_LENGTH))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

/**
 * Validates and coerces a raw LLM payload into a {@link QuickTestAnalysis}.
 * Returns null when the payload does not match the expected shape — callers
 * must then fall back to the heuristic analyzer.
 */
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

  const strengths = sanitizeList(record.strengths, 3);
  const weaknesses = sanitizeList(record.weaknesses, 3);
  const recommendations = sanitizeList(record.recommendations, 2);

  if (strengths.length === 0 || weaknesses.length === 0 || recommendations.length === 0) {
    return null;
  }

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    strengths,
    weaknesses,
    recommendations,
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
 * Runs the visitor-grade analysis through Gemini. Returns null on any
 * failure (network, timeout, malformed output) — the caller must fall back
 * to the heuristic analyzer.
 */
export async function analyzeWithGemini(cvText: string): Promise<QuickTestAnalysis | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${GEMINI_API_BASE_URL}/${getGeminiModel()}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildAnalysisPrompt(cvText) }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
          },
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      console.error(
        `[quick-test] Gemini call failed: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const body: unknown = await response.json();
    const generatedText = extractGeminiText(body);
    if (!generatedText) {
      console.error('[quick-test] Gemini returned no generated content.');
      return null;
    }

    return coerceLlmAnalysis(JSON.parse(generatedText));
  } catch (error) {
    console.error('[quick-test] Gemini analysis error:', error);
    return null;
  }
}