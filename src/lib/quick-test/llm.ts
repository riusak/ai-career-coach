import type { InsightItem, QuickTestAnalysis, ScoreBreakdownItem } from '@/types/quick-test';

/**
 * Google Gemini (Flash) client for the CV analysis pipelines — DEEP analysis.
 *
 * v3 — document-native (multimodal) requirements:
 *  - PDFs are sent to the model as the NATIVE document (`inline_data`,
 *    mime_type 'application/pdf') so the LLM "sees" the real layout —
 *    columns, sidebars, visual hierarchy — exactly like a recruiter/ATS
 *    would; scanned/image-only PDFs become analyzable for free;
 *  - DOCX/TXT (not natively readable by Gemini) are sent as pre-extracted
 *    text with the same analysis prompt;
 *  - the real Gemini Flash API is called synchronously on every request
 *    with a comprehensive recruiter-grade prompt (layout + content) and a
 *    strict responseSchema;
 *  - every phase is logged server-side (START / SUCCESS with duration and
 *    payload stats / FAILURE with the exact reason) and transient failures
 *    are retried with an explicit backoff — there is NO silent heuristic
 *    fallback anymore: a failed analysis is a visible error, never a fake
 *    score;
 *  - the CV lives only for the duration of the request — nothing is logged
 *    or persisted beyond the API call itself.
 */

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
// Model selection (validated live 2026-09 against the real API): the 2.0/2.5
// generations have been DECOMMISSIONED by Google (HTTP 404 "no longer
// available" on every call) — this was the root cause of the "LLM n'a pas pu
// analyser" symptom. `gemini-3.5-flash-lite` answers in ~2 s with the full
// deep-analysis schema; `gemini-3.6-flash` is the quality upgrade but is
// periodically 503 (high demand), so it is used as the chain fallback.
// Both 3.x models natively understand PDF documents (inline_data).
// Override with GEMINI_MODEL.
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_LLM_TEXT_CHARS = 12_000;
// NOTE: `thinkingConfig` (e.g. { thinkingBudget: 0 }) is REJECTED with
// HTTP 400 INVALID_ARGUMENT by the 3.x models — it must NOT be sent.
// Hard cap on generated JSON size (measured output ≈ 850 tokens; the cap only
// guards against runaway generations, which would hit the timeout anyway).
const MAX_OUTPUT_TOKENS = 4096;
// Timeout for a single analysis attempt — bounded so the request always
// finishes well before the 60 s Vercel maxDuration and the 45 s client fetch
// timeout (measured p95 on 3.5-flash-lite ≈ 2-3 s).
const LLM_TIMEOUT_MS = 20_000;
// Total wall-clock budget for the full analyzeWithGemini call, including the
// per-model retries and the model-chain fallback. Must stay under the 45 s
// client timeout once PDF extraction/inline encoding is accounted for.
const LLM_TOTAL_BUDGET_MS = 32_000;
// A transient failure (429/5xx, network refused, garbled generation) is
// retried on the SAME model with an explicit backoff before moving to the
// next model of the chain. Non-transient failures (4xx invalid request,
// timeout) are never retried — they would fail identically or the wall-clock
// budget is already spent. A fast failure (under this ceiling) is also worth
// one attempt on the next model of the chain.
const LLM_FAST_FAILURE_CEILING_MS = 10_000;
const MAX_ATTEMPTS_PER_MODEL = 2;
const RETRY_BACKOFF_MS = 1_500;

export type AnalysisSource = 'llm' | 'heuristic';

/** MIME types accepted by the analysis pipeline (mirrors resume-validation). */
export type AnalysisDocumentMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain';

/** The native uploaded file passed to the multimodal analysis. */
export interface AnalysisDocument {
  buffer: Buffer;
  mimeType: AnalysisDocumentMimeType;
  /**
   * Pre-extracted text. Required for DOCX/TXT (Gemini cannot read them
   * natively — the analysis prompt embeds it). For PDFs it is optional:
   * the native document is what the model actually reads.
   */
  text: string;
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Ordered model chain tried by analyzeWithGemini: the configured (or default)
 * model first, then the fallback model. Deduplicated so an explicit
 * GEMINI_MODEL override does not retry the same model twice.
 */
function getGeminiModels(): string[] {
  const primary = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  return primary === FALLBACK_GEMINI_MODEL
    ? [primary]
    : [primary, FALLBACK_GEMINI_MODEL];
}

/** Primary model — kept for the generic `callGeminiJson` helper. */
function getGeminiModel(): string {
  return process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
}

/**
 * A failure reason is retryable when it is plausibly transient: 429/5xx
 * responses, network errors, and garbled/empty generations. Timeouts are NOT
 * retried (they already consumed the wall-clock budget) and other 4xx errors
 * (invalid request, auth, unknown model) would fail identically.
 */
function isRetryableFailure(reason: string): boolean {
  if (reason === 'timeout') {
    return false;
  }
  if (reason === 'network error') {
    return true;
  }
  if (reason.startsWith('HTTP ')) {
    const status = Number.parseInt(reason.slice(5), 10);
    return status === 429 || (status >= 500 && status <= 599);
  }
  // Generation-level hiccups are worth one clean retry.
  return (
    reason === 'empty response (no generated content)' ||
    reason === 'invalid JSON payload' ||
    reason === 'schema coercion failed'
  );
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

/**
 * Builds the French deep-analysis prompt. When `documentText` is provided
 * (DOCX/TXT path) it is embedded in the prompt; otherwise the CV travels as
 * a native PDF attachment and the prompt instructs the model to evaluate the
 * REAL layout (columns, sidebars, visual hierarchy) it can see.
 */
export function buildAnalysisPrompt(documentText: string | null): string {
  const truncated =
    documentText && documentText.length > MAX_LLM_TEXT_CHARS
      ? `${documentText.slice(0, MAX_LLM_TEXT_CHARS)}\n[tronqué]`
      : documentText;

  const documentBlock = truncated
    ? `Le texte ci-dessous a été extrait du document : la mise en page RÉELLE n'est PAS visible — base ton évaluation de mise en page sur la structure du texte uniquement.\n\nTEXTE DU DOCUMENT :\n${truncated}`
    : `Le CV est fourni en pièce jointe PDF. Examine sa mise en page RÉELLE exactement comme la verrait un recruteur ou un ATS : colonnes, sidebars, hiérarchie visuelle, typographie, densité, marges.`;

  return `Tu es un recruteur expert (10+ ans en cabinet) ET un spécialiste du design documentaire. Le document ci-dessous peut être rédigé dans N'IMPORTE QUELLE langue (français, anglais, allemand, espagnol…) — analyse-le dans sa langue, mais renvoie UNIQUEMENT un JSON valide (sans texte autour) avec cette structure exacte :
{
  "is_cv": <true si le document est un curriculum vitae / resume d'une personne physique, false sinon (facture, bulletin de paie, devis, lettre, manuel…)>,
  "document_type": "<type détecté, STRICTEMENT une de ces valeurs : 'cv', 'invoice', 'payslip', 'quote', 'letter', 'administrative_form', 'generic_text', 'empty', 'other'>",
  "detected_language": "<code ISO de la langue du document : 'fr', 'en', 'de'…>",
  "score": <0-100 — 0 si is_cv est false>,
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

Évalue le document sur TOUS ces axes (fond ET forme) :
1. Mise en page & lisibilité — colonnes, sidebars, marges, densité et risque de parsing ATS (les mises en page multi-colonnes ou à sidebar complexe cassent les parseurs ATS classiques) ;
2. Hiérarchie visuelle — titres, graisses, espacement, scannabilité en 6 secondes, standards professionnels du design de CV ;
3. Structure — sections standard présentes/absentes ;
4. Impact chiffré — résultats quantifiés (%, montants, volumes) ;
5. Clarté des missions ;
6. Adéquation au poste cible ;
7. Mots-clés ATS ;
8. Verbes d'action.

Règles : si et seulement si is_cv est true, score_breakdown doit contenir AU MOINS 6 dimensions parmi celles listées ci-dessus, dont obligatoirement « Mise en page & lisibilité » et « Hiérarchie visuelle » ; 2-4 éléments par liste ; conseils concrets et spécifiques au CV (cite ce que tu vois) ; pas d'invention. Si is_cv est false, remplis les listes avec des tableaux vides et score 0.

${documentBlock}`;
}

const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_cv: { type: 'BOOLEAN' },
    document_type: { type: 'STRING' },
    detected_language: { type: 'STRING' },
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
    'is_cv',
    'document_type',
    'detected_language',
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

/** Semantic gate returned alongside the analysis by the merged LLM call. */
export interface CvGate {
  isCv: boolean;
  documentType: string;
  detectedLanguage: string;
}

/**
 * Full LLM outcome: coerced analysis + semantic CV gate.
 *
 * `analysis` is null ONLY when the gate rejected the document (`isCv: false`):
 * the model is then explicitly instructed to emit empty lists + a zero score,
 * which `coerceLlmAnalysis` rejects by design. In that case the gate alone
 * drives the precise `not_a_cv` rejection — never a misleading `llm_failed`.
 */
export interface GeminiAnalysisResult {
  analysis: QuickTestAnalysis | null;
  gate: CvGate;
}

/**
 * Extracts the semantic CV gate (`is_cv` / `document_type` /
 * `detected_language`) from a raw LLM payload. Missing fields degrade
 * gracefully: an absent `is_cv` is treated as `true` (the schema requires it,
 * but older/looser generations may omit it — never block a real CV on a
 * missing optional detail).
 */
export function extractCvGate(raw: unknown): CvGate {
  const record = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const documentType = typeof record.document_type === 'string' ? record.document_type.trim() : '';
  const detectedLanguage =
    typeof record.detected_language === 'string' ? record.detected_language.trim().toLowerCase() : '';
  return {
    isCv: record.is_cv === undefined ? true : record.is_cv === true,
    documentType: documentType.length > 0 ? documentType : 'unknown',
    detectedLanguage: detectedLanguage.length > 0 ? detectedLanguage : 'unknown',
  };
}

/**
 * Builds the Gemini request parts for the analysis call:
 *  - PDF → the native document travels as `inline_data` (base64) so the model
 *    sees the real layout (columns, sidebars, hierarchy, typography);
 *  - DOCX/TXT → the pre-extracted text travels embedded in the prompt
 *    (Gemini cannot read these formats natively).
 */
function buildRequestParts(document: AnalysisDocument): Array<Record<string, unknown>> {
  const prompt = buildAnalysisPrompt(
    document.mimeType === 'application/pdf' ? null : document.text
  );
  if (document.mimeType === 'application/pdf') {
    return [
      { text: prompt },
      {
        inline_data: {
          mime_type: 'application/pdf',
          data: document.buffer.toString('base64'),
        },
      },
    ];
  }
  return [{ text: prompt }];
}

/**
 * Runs the deep analysis through Gemini, synchronously, in real time. Walks
 * a MODEL CHAIN (configured model first, then the fallback model) and, on
 * each model, RETRIES transient failures (429/5xx, network refused, garbled
 * generation) with an explicit backoff — at most MAX_ATTEMPTS_PER_MODEL
 * attempts per model, always bounded by the global wall-clock budget.
 * Non-transient failures (timeout, 4xx) move straight to the next model (if
 * the attempt failed fast) or abort the chain.
 *
 * Every step is logged server-side: START, SUCCESS (with duration and
 * payload statistics) and FAILURE (with the exact reason). There is NO
 * silent heuristic fallback: on final failure the function returns null and
 * the caller MUST surface an explicit error to the user.
 *
 * A non-CV verdict is a SUCCESS, not a failure: the model is instructed to
 * emit `is_cv:false` with empty lists + score 0 (which coerceLlmAnalysis
 * rejects by design), so the function returns `{ analysis: null, gate }` —
 * the caller turns it into the precise `not_a_cv` rejection.
 */
export async function analyzeWithGemini(
  document: AnalysisDocument
): Promise<GeminiAnalysisResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(
      '[quick-test] GEMINI_API_KEY not configured — the analysis cannot run (no heuristic fallback anymore).'
    );
    return null;
  }

  const models = getGeminiModels();
  const overallStartedAt = Date.now();
  let lastReason = 'unknown';

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex]!;
    const hasNextModel = modelIndex < models.length - 1;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
      const remainingBudgetMs = LLM_TOTAL_BUDGET_MS - (Date.now() - overallStartedAt);
      if (remainingBudgetMs < 5_000) {
        console.warn(
          `[quick-test] Gemini budget exhausted — remaining ${remainingBudgetMs}ms too small.`
        );
        console.error(
          `[quick-test] Gemini FAILED after ${Date.now() - overallStartedAt}ms — ` +
            `last reason: ${lastReason}.`
        );
        return null;
      }

      const { analysis, raw, reason } = await analyzeWithGeminiOnce(
        document,
        apiKey,
        model,
        Math.min(LLM_TIMEOUT_MS, remainingBudgetMs)
      );
      if (analysis) {
        return { analysis, gate: extractCvGate(raw) };
      }
      // Non-CV documents are NOT failed calls: the model is instructed to
      // return `is_cv:false` with empty lists + score 0, and coerceLlmAnalysis
      // rejects that payload by design. Surface the semantic gate so the
      // pipeline emits the precise `not_a_cv` rejection (typed message for
      // PDFs, generic otherwise) instead of retrying pointlessly and falling
      // into the generic `llm_failed` ("Analysis failed").
      if (raw !== undefined) {
        const gate = extractCvGate(raw);
        if (!gate.isCv) {
          console.warn(
            `[quick-test] Gemini: rejet non-CV (type=${gate.documentType}, langue=${gate.detectedLanguage}) — modèle ${model}, tentative ${attempt}.`
          );
          return { analysis: null, gate };
        }
      }
      lastReason = reason ?? 'unknown';

      const retryable = isRetryableFailure(lastReason);
      if (attempt < MAX_ATTEMPTS_PER_MODEL && retryable) {
        if (remainingBudgetMs > RETRY_BACKOFF_MS + 5_000) {
          console.warn(
            `[quick-test] Gemini model=${model} attempt ${attempt}/${MAX_ATTEMPTS_PER_MODEL} ` +
              `failed (${lastReason}) — retrying in ${RETRY_BACKOFF_MS}ms…`
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));
          continue;
        }
        console.warn(
          `[quick-test] Gemini retry skipped — remaining budget ${remainingBudgetMs}ms too small.`
        );
        break;
      }

      // Non-retryable for this model (or attempts exhausted). A fast failure
      // still leaves budget for the next model of the chain; a timeout or a
      // slow failure consumed most of it, so the chain stops.
      const attemptElapsedMs = Date.now() - overallStartedAt;
      if (hasNextModel && attemptElapsedMs <= LLM_FAST_FAILURE_CEILING_MS) {
        console.warn(
          `[quick-test] Gemini model=${model} failed fast (${lastReason}) — ` +
            `trying next model in the chain…`
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
        break;
      }

      console.error(
        `[quick-test] Gemini FAILED after ${Date.now() - overallStartedAt}ms — ` +
          `model=${model}, last reason: ${lastReason}.` +
          (hasNextModel ? '' : ' No models left in the chain.')
      );
      return null;
    }
  }

  console.error(
    `[quick-test] Gemini FAILED after all models in ${Date.now() - overallStartedAt}ms — ` +
      `last reason: ${lastReason}.`
  );
  return null;
}

/**
 * Runs ONE analysis attempt against a single Gemini model with the NATIVE
 * document (PDF inline_data) or the extracted text. Returns the coerced
 * analysis + raw payload on success, or a structured failure reason for the
 * retry/model-chain logic.
 */
async function analyzeWithGeminiOnce(
  document: AnalysisDocument,
  apiKey: string,
  model: string,
  timeoutMs: number
): Promise<GeminiAttemptResult & { raw?: unknown }> {
  const startedAt = Date.now();
  const isNativePdf = document.mimeType === 'application/pdf';
  const payloadStats = isNativePdf
    ? `pdfBytes=${document.buffer.length} (inline base64)`
    : `chars=${document.text.length}`;
  console.time(`[quick-test] Gemini (analysis) model=${model}`);
  console.info(
    `[quick-test] Gemini START model=${model} type=${document.mimeType} ` +
      `${payloadStats} timeoutMs=${timeoutMs}`
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
          contents: [{ role: 'user', parts: buildRequestParts(document) }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
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
      // Keep the raw payload: a non-CV verdict (`is_cv:false` + empty lists, as
      // instructed) legitimately fails coercion — the caller inspects the gate
      // to surface the precise `not_a_cv` rejection instead of `llm_failed`.
      return { analysis: null, reason: 'schema coercion failed', raw: parsed };
    }

    console.info(
      `[quick-test] Gemini SUCCESS in ${elapsedMs}ms → score=${analysis.score}, ` +
        `breakdown=${analysis.scoreBreakdown.length}, strengths=${analysis.strengths.length}, ` +
        `weaknesses=${analysis.weaknesses.length}, recommendations=${analysis.recommendations.length} (source=llm)`
    );
    console.timeEnd(`[quick-test] Gemini (analysis) model=${model}`);
    return { analysis, raw: parsed, reason: null };
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