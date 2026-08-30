/**
 * One-off diagnostic: validates the Gemini API key and the deep-analysis
 * responseSchema against the real API (same request shape as llm.ts).
 *
 * Usage: node scripts/test-gemini.mjs [model]
 * Reads GEMINI_API_KEY from the environment or from .env.local.
 */

import { readFileSync } from 'node:fs';

const MODEL = process.argv[2] ?? process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';

function loadApiKey() {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  const envLocal = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const match = envLocal.match(/^GEMINI_API_KEY=(.+)$/m);
  return match ? match[1].trim() : null;
}

const apiKey = loadApiKey();
if (!apiKey) {
  console.error('❌ No GEMINI_API_KEY found (env or .env.local).');
  process.exit(1);
}

const SAMPLE_CV = `Jean Dupont
jean.dupont@email.fr · +33 6 12 34 56 78 · linkedin.com/in/jeandupont

Expérience
- Développé une plateforme e-commerce ayant augmenté les ventes de 35 %.
- Piloté une équipe de 6 personnes et réduit les délais de livraison de 20 %.
- Conçu et optimisé l'architecture cloud, amélioré les coûts de 15 %.

Formation
Master Informatique — Université de Paris, 2019.

Compétences
TypeScript, React, Node.js, AWS, Docker.

Langues
Français (natif), Anglais (courant).`;

const SCHEMA = {
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
};

const prompt = [
  'Tu es un coach de carrière senior et recruteur expert (10+ ans en cabinet de recrutement).',
  'Réalise une analyse professionnelle COMPLÈTE et DÉTAILLÉE du CV ci-dessous.',
  'Renvoie UNIQUEMENT un objet JSON valide respectant le schéma fourni, entièrement en français,',
  'avec un score_breakdown couvrant au minimum : "Structure & lisibilité", "Impact chiffré",',
  '"Clarté des missions", "Adéquation au poste visé", "Mots-clés & ATS".',
  '',
  '=== CV ===',
  SAMPLE_CV,
  '=== FIN DU CV ===',
].join('\n');

const startedAt = Date.now();
console.info(`[test-gemini] START model=${MODEL} chars=${SAMPLE_CV.length}`);

try {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    }
  );

  const elapsedMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `[test-gemini] FAILED after ${elapsedMs}ms — HTTP ${response.status} ${response.statusText}`
    );
    console.error(errorBody.slice(0, 600));
    process.exit(1);
  }

  const body = await response.json();
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const parsed = JSON.parse(text);

  console.info(`[test-gemini] SUCCESS in ${elapsedMs}ms (source=llm)`);
  console.info(
    `score=${parsed.score} · breakdown=${parsed.score_breakdown.length} · ` +
      `strengths=${parsed.strengths.length} · weaknesses=${parsed.weaknesses.length} · ` +
      `recommendations=${parsed.recommendations.length}`
  );
  console.info(`breakdown[0]: ${parsed.score_breakdown[0].category} = ${parsed.score_breakdown[0].score}/100 — ${parsed.score_breakdown[0].comment}`);
  console.info(`strengths[0]: ${parsed.strengths[0].title} — ${parsed.strengths[0].detail}`);
  console.info(`formatting_advice: ${parsed.formatting_advice}`);
  console.info(`action_verbs_advice: ${parsed.action_verbs_advice}`);
  console.info(`impact_metrics_advice: ${parsed.impact_metrics_advice}`);
} catch (error) {
  const elapsedMs = Date.now() - startedAt;
  console.error(`[test-gemini] FAILED after ${elapsedMs}ms:`, error?.message ?? error);
  process.exit(1);
}
