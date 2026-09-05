import type { InsightItem } from '@/types/quick-test';
import { isLlmConfigured, extractGeminiText } from '@/lib/quick-test/llm';

/**
 * Gemini (Flash) client for the JOB MATCHING pipeline - Phase 5.2.
 *
 * Unlike the deep-analysis call (document-native, multimodal), a matching run
 * is TEXT-ONLY: the resume text (parsed_content or on-the-fly extraction) and
 * the pasted offer are both embedded in a single strict-schema prompt. The
 * model returns the full recruitment diagnostic in ONE structured call:
 *   - global score + 3 sub-scores (skills / experience / keywords);
 *   - a one-paragraph synthesis;
 *   - strengths (with proof from the CV) and per-requirement gaps;
 *   - matched / missing ATS keywords;
 *   - targeted recommendations;
 *   - detected company & location.
 *
 * Consistency with the analysis module:
 *   - the SAME 3.x model chain (gemini-3.5-flash-lite primary ->
 *     gemini-3.6-flash fallback; 2.0/2.5 are decommissioned and 404);
 *   - the SAME wall-clock budget / per-model retry / fast-failure promotion
 *     semantics of `analyzeWithGemini` (llm.ts);
 *   - NO silent heuristic fallback: a failed call returns a machine-readable
 *     reason and the caller surfaces an explicit error - never a fake score.
 */

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_GEMINI_MODEL = 'gemini-3.6-flash';
// NOTE: `thinkingConfig` must NOT be sent to the 3.x models (HTTP 400).
const MAX_OUTPUT_TOKENS = 4096;
const MATCHING_TIMEOUT_MS = 20_000;
const MATCHING_TOTAL_BUDGET_MS = 32_000;
const MATCHING_FAST_FAILURE_CEILING_MS = 10_000;
const MAX_ATTEMPTS_PER_MODEL = 2;
const RETRY_BACKOFF_MS = 1_500;
/** Max CV text embedded in the matching prompt (memory / focus guard). */
const MAX_MATCHING_RESUME_CHARS = 20_000;
/** Max offer text accepted in the prompt (board guard, mirrored in pipeline). */
const MAX_MATCHING_OFFER_CHARS = 12_000;

/** Coerced matching payload returned to the pipeline. */
export interface JobMatchLlmResult {
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  keywordsScore: number;
  summary: string;
  strengths: InsightItem[];
  gaps: InsightItem[];
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendations: InsightItem[];
  company: string;
  location: string;
}

export interface JobMatchLlmOutcome {
  result: JobMatchLlmResult | null;
  reason: string | null;
}

/** Hard caps also applied during coercion (bounded output, adversarial-safe). */
const MAX_ITEMS = 6;
const MAX_KEYWORDS = 12;
const MAX_ITEM_TEXT_LENGTH = 300;
const MAX_SUMMARY_LENGTH = 600;

function clampScore(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

function coerceScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampScore(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? clampScore(parsed) : null;
  }
  return null;
}

function coerceText(value: unknown, max = MAX_ITEM_TEXT_LENGTH): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, max);
}

// == SECTION-2 ==

/** Coerces a raw item into a titled insight (accepts plain strings too). */
function coerceInsight(value: unknown): InsightItem | null {
  if (typeof value === 'string') {
    const text = value.trim();
    return text.length > 0 ? { title: text.slice(0, MAX_ITEM_TEXT_LENGTH), detail: '' } : null;
  }
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const title = coerceText(record.title);
  const detail = coerceText(record.detail);
  if (title.length === 0 && detail.length === 0) {
    return null;
  }
  return { title: title || detail.slice(0, 120), detail };
}

function coerceInsightList(value: unknown): InsightItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: InsightItem[] = [];
  for (const raw of value) {
    const item = coerceInsight(raw);
    if (item !== null) {
      items.push(item);
      if (items.length >= MAX_ITEMS) {
        break;
      }
    }
  }
  return items;
}

function coerceKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const keywords: string[] = [];
  for (const raw of value.slice(0, MAX_KEYWORDS * 2)) {
    const text = coerceText(raw, 60);
    if (text.length > 0) {
      keywords.push(text);
      if (keywords.length >= MAX_KEYWORDS) {
        break;
      }
    }
  }
  return keywords;
}

/**
 * Defensively coerces the raw LLM payload into the JobMatchLlmResult shape.
 * Returns null when the payload lacks the mandatory fields (overall score and
 * at least one item per list) - mirroring coerceLlmAnalysis's strictness so a
 * garbled generation is a visible failure, never a fake match.
 */
export function coerceLlmMatchingResult(raw: unknown): JobMatchLlmResult | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const record = raw as Record<string, unknown>;

  const overallScore = coerceScore(record.overall_score);
  if (overallScore === null) {
    return null;
  }

  const strengths = coerceInsightList(record.strengths);
  const gaps = coerceInsightList(record.gaps);
  const missingKeywords = coerceKeywords(record.missing_keywords);
  const recommendations = coerceInsightList(record.recommendations);

  if (strengths.length === 0 || gaps.length === 0 || recommendations.length === 0) {
    return null;
  }

  return {
    overallScore,
    skillsScore: coerceScore(record.skills_score) ?? 0,
    experienceScore: coerceScore(record.experience_score) ?? 0,
    keywordsScore: coerceScore(record.keywords_score) ?? 0,
    summary: coerceText(record.summary, MAX_SUMMARY_LENGTH),
    strengths,
    gaps,
    matchedKeywords: coerceKeywords(record.matched_keywords),
    missingKeywords,
    recommendations,
    company: coerceText(record.company, 120),
    location: coerceText(record.location, 120),
  };
}

// == SECTION-3 ==

/** Strict JSON response schema passed to Gemini (snake_case, as generated). */
const MATCHING_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    overall_score: { type: 'NUMBER' },
    skills_score: { type: 'NUMBER' },
    experience_score: { type: 'NUMBER' },
    keywords_score: { type: 'NUMBER' },
    summary: { type: 'STRING' },
    strengths: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, detail: { type: 'STRING' } },
        required: ['title', 'detail'],
      },
    },
    gaps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, detail: { type: 'STRING' } },
        required: ['title', 'detail'],
      },
    },
    matched_keywords: { type: 'ARRAY', items: { type: 'STRING' } },
    missing_keywords: { type: 'ARRAY', items: { type: 'STRING' } },
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, detail: { type: 'STRING' } },
        required: ['title', 'detail'],
      },
    },
    company: { type: 'STRING' },
    location: { type: 'STRING' },
  },
  required: [
    'overall_score',
    'skills_score',
    'experience_score',
    'keywords_score',
    'summary',
    'strengths',
    'gaps',
    'matched_keywords',
    'missing_keywords',
    'recommendations',
  ],
} as const;

/** Builds the French matching prompt (resume text + offer pasted inline). */
export function buildMatchingPrompt(input: {
  resumeText: string;
  jobTitle: string;
  jobDescription: string;
}): string {
  const resumeText =
    input.resumeText.length > MAX_MATCHING_RESUME_CHARS
      ? `${input.resumeText.slice(0, MAX_MATCHING_RESUME_CHARS)}\n[tronqué]`
      : input.resumeText;
  const offerText =
    input.jobDescription.length > MAX_MATCHING_OFFER_CHARS
      ? `${input.jobDescription.slice(0, MAX_MATCHING_OFFER_CHARS)}\n[tronqué]`
      : input.jobDescription;

  return `Tu es un recruteur technique expert qui évalue l'adéquation d'un CANDIDAT à une OFFRE D'EMPLOI précise. Compare le CV ci-dessous à l'offre et renvoie UNIQUEMENT un JSON valide (sans texte autour) avec cette structure exacte :
{
  "overall_score": <0-100, score global d'adéquation>,
  "skills_score": <0-100, adéquation des compétences techniques>,
  "experience_score": <0-100, adéquation du niveau d'expérience et de séniorité>,
  "keywords_score": <0-100, correspondance des mots-clés ATS entre l'offre et le CV>,
  "summary": "<synthèse en 2-3 phrases du degré d'adéquation>",
  "strengths": [{"title": "<point fort>", "detail": "<preuve PRÉCISE tirée du CV (poste, entreprise, métrique)>"}],
  "gaps": [{"title": "<exigence ou lacune>", "detail": "<écart constaté et son impact sur la candidature>"}],
  "matched_keywords": ["<mots-clés techniques de l'offre présents dans le CV>"],
  "missing_keywords": ["<mots-clés techniques de l'offre ABSENTS du CV>"],
  "recommendations": [{"title": "<action concrète>", "detail": "<comment la mettre en œuvre (reformulation CV, préparation entretien...)>"}],
  "company": "<entreprise identifiée dans l'offre, ou chaîne vide>",
  "location": "<localisation identifiée dans l'offre, ou chaîne vide>"
}

Règles :
- Calibre les scores avec rigueur de recruteur : un score global >= 80 exige la quasi-totalité des exigences ESSENTIELLES couvertes ; 50-79 = adéquation partielle avec des manques à combler ; < 50 = mauvaise adéquation.
- "strengths" : 2 à 4 points FORTS, chaque preuve doit citer du concret du CV (technologie, mission, métrique, entreprise).
- "gaps" : 2 à 4 écarts PAR EXIGENCE de l'offre (compétence manquante, niveau de séniorité, stack, langue, domaine métier).
- "missing_keywords" : liste les mots-clés d'ATS explicites de l'offre absents du CV (max 8).
- "matched_keywords" : liste les mots-clés d'ATS explicites de l'offre retrouvés dans le CV (max 8).
- "recommendations" : 3 à 5 actions ACTIONNABLES et spécifiques (reformuler telle section, ajouter tel mot-clé, préparer tel sujet d'entretien).
- N'invente JAMAIS une compétence ou une expérience absente du CV. Si l'offre ne mentionne pas d'entreprise ou de localisation, renvoie une chaîne vide.
- Le CV comme l'offre peuvent être en français, anglais ou allemand : évalue dans leur langue.

INTITULÉ DU POSTE CIBLE : ${input.jobTitle}

TEXTE DE L'OFFRE D'EMPLOI :
${offerText}

CONTENU DU CV DU CANDIDAT :
${resumeText}`;
}

// == SECTION-4 ==

/** Model chain: configured (or default) model first, then the fallback. */
function getMatchingModels(): string[] {
  const primary = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  return primary === FALLBACK_GEMINI_MODEL
    ? [primary]
    : [primary, FALLBACK_GEMINI_MODEL];
}

/** A failure reason is retryable when plausibly transient (same rules as llm.ts). */
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
  return (
    reason === 'empty response (no generated content)' ||
    reason === 'invalid JSON payload' ||
    reason === 'schema coercion failed'
  );
}

interface MatchingAttemptResult {
  result: JobMatchLlmResult | null;
  reason: string;
  raw?: unknown;
}

/** Runs ONE attempt against a single model with the text-only prompt. */
async function matchOnce(input: {
  resumeText: string;
  jobTitle: string;
  jobDescription: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}): Promise<MatchingAttemptResult> {
  const { resumeText, jobTitle, jobDescription, apiKey, model, timeoutMs } = input;
  const startedAt = Date.now();
  const prompt = buildMatchingPrompt({ resumeText, jobTitle, jobDescription });

  console.time(`[matching] Gemini (match) model=${model}`);
  console.info(
    `[matching] Gemini START model=${model} promptChars=${prompt.length} ` +
      `timeoutMs=${timeoutMs}`
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
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: MATCHING_RESPONSE_SCHEMA,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );

    const elapsedMs = Date.now() - startedAt;

    if (!response.ok) {
      console.error(
        `[matching] Gemini FAILED after ${elapsedMs}ms — HTTP ${response.status} ${response.statusText}.`
      );
      console.timeEnd(`[matching] Gemini (match) model=${model}`);
      return { result: null, reason: `HTTP ${response.status} ${response.statusText}` };
    }

    const body: unknown = await response.json();
    const generatedText = extractGeminiText(body);
    if (generatedText === null || generatedText.trim().length === 0) {
      console.error(
        `[matching] Gemini FAILED after ${elapsedMs}ms — response contained no generated content.`
      );
      console.timeEnd(`[matching] Gemini (match) model=${model}`);
      return { result: null, reason: 'empty response (no generated content)' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(generatedText);
    } catch {
      console.error(
        `[matching] Gemini FAILED after ${elapsedMs}ms — generated text is not valid JSON (${generatedText.length} chars).`
      );
      console.timeEnd(`[matching] Gemini (match) model=${model}`);
      return { result: null, reason: 'invalid JSON payload' };
    }

    const result = coerceLlmMatchingResult(parsed);
    if (!result) {
      console.error(
        `[matching] Gemini FAILED after ${elapsedMs}ms — payload failed schema coercion (missing/broken required fields).`
      );
      console.timeEnd(`[matching] Gemini (match) model=${model}`);
      return { result: null, reason: 'schema coercion failed', raw: parsed };
    }

    console.info(
      `[matching] Gemini SUCCESS in ${elapsedMs}ms → overall=${result.overallScore}, ` +
        `skills=${result.skillsScore}, experience=${result.experienceScore}, ` +
        `keywords=${result.keywordsScore}, strengths=${result.strengths.length}, ` +
        `gaps=${result.gaps.length}, missing=${result.missingKeywords.length}`
    );
    console.timeEnd(`[matching] Gemini (match) model=${model}`);
    return { result, reason: 'ok' };
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(
      `[matching] Gemini FAILED after ${elapsedMs}ms — network/timeout error:`,
      error
    );
    console.timeEnd(`[matching] Gemini (match) model=${model}`);
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return { result: null, reason: isTimeout ? 'timeout' : 'network error' };
  }
}

// == SECTION-5 ==

/**
 * Runs the full matching comparison through Gemini, synchronously, walking the
 * model chain with per-model transient-failure retries (same semantics as
 * analyzeWithGemini - never a silent fallback). Returns the coerced result, or
 * null + the exact failure reason for the pipeline to surface.
 */
export async function matchJobOfferWithGemini(input: {
  resumeText: string;
  jobTitle: string;
  jobDescription: string;
}): Promise<JobMatchLlmOutcome> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[matching] GEMINI_API_KEY non configurée - matching impossible.');
    return { result: null, reason: 'unconfigured' };
  }

  const models = getMatchingModels();
  const overallStartedAt = Date.now();
  console.time(`[matching] Chain total`);
  let lastReason = 'unknown';

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];
    const remainingBudgetMs = MATCHING_TOTAL_BUDGET_MS - (Date.now() - overallStartedAt);
    if (remainingBudgetMs <= 5_000) {
      console.warn(`[matching] Chain stopped - remaining budget ${remainingBudgetMs}ms too small.`);
      break;
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
      const timeoutMs = Math.min(MATCHING_TIMEOUT_MS, remainingBudgetMs);
      const outcome = await matchOnce({ ...input, apiKey, model, timeoutMs });

      if (outcome.result) {
        console.timeEnd(`[matching] Chain total`);
        return { result: outcome.result, reason: null };
      }

      lastReason = outcome.reason;
      const retryable = isRetryableFailure(lastReason);
      if (attempt < MAX_ATTEMPTS_PER_MODEL && retryable) {
        console.warn(
          `[matching] Gemini model=${model} attempt ${attempt}/${MAX_ATTEMPTS_PER_MODEL} ` +
            `failed (${lastReason}) - retrying in ${RETRY_BACKOFF_MS}ms…`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));
        continue;
      }

      // Fast failure → try the next model of the chain.
      const attemptElapsedMs = Date.now() - overallStartedAt;
      const hasNextModel = modelIndex < models.length - 1;
      if (hasNextModel && attemptElapsedMs <= MATCHING_FAST_FAILURE_CEILING_MS) {
        console.warn(
          `[matching] Gemini model=${model} failed fast (${lastReason}) - trying next model…`
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
        break;
      }

      console.error(
        `[matching] Gemini FAILED after ${Date.now() - overallStartedAt}ms - ` +
          `model=${model}, last reason: ${lastReason}.` +
          (hasNextModel ? '' : ' No models left in the chain.')
      );
      console.timeEnd(`[matching] Chain total`);
      return { result: null, reason: lastReason };
    }
  }

  console.error(
    `[matching] Gemini FAILED after all models in ${Date.now() - overallStartedAt}ms - ` +
      `last reason: ${lastReason}.`
  );
  console.timeEnd(`[matching] Chain total`);
  return { result: null, reason: lastReason };
}

/** Convenience re-export so callers can import everything from this module. */
export { isLlmConfigured };