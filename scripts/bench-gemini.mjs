/**
 * Latency benchmark: measures the real end-to-end analysis latency of several
 * Gemini models against a large (~12k chars) CV, with and without thinking
 * disabled (thinkingConfig.thinkingBudget = 0), using the exact same request
 * shape as src/lib/quick-test/llm.ts (responseSchema enforced).
 *
 * Usage: node scripts/bench-gemini.mjs
 * Reads GEMINI_API_KEY from the environment or from .env.local.
 */

import { readFileSync } from 'node:fs';

function loadApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const envLocal = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const match = envLocal.match(/^GEMINI_API_KEY=(.+)$/m);
  return match ? match[1].trim() : null;
}

/* ---------- ~12k realistic CV (same scale as the reported slow case) ----- */

const SECTION = `
EXPERIENCE PROFESSIONNELLE
Consultant senior - Cabinet Delta & Partners, Lyon (2019 - aujourd'hui)
- Développé une plateforme e-commerce ayant augmenté les ventes de 35 % en deux exercices.
- Piloté une équipe de 6 personnes et réduit les délais de livraison de 20 % grâce au Kanban.
- Conçu et optimisé l'architecture cloud, réduit les coûts d'infrastructure de 15 %.
- Automatisé le déploiement CI/CD et amélioré la fréquence de release de 40 %.
- Mené la refonte du SI commercial, amélioré la satisfaction client de 12 points.
- Coordonné la migration ERP avec les équipes métier, livrée sans interruption de service.

Chef de projet digital - Groupe Novaris, Grenoble (2016 - 2019)
- Dirigé un portefeuille de 8 projets Web d'un budget cumulé de 1,2 M€.
- Négocié les contrats fournisseurs et réduit les dépenses externes de 18 %.
- Animé une communauté de 40 utilisateurs internes et formé 25 collaborateurs.
`;

const HEADER = `Marie Martin
marie.martin@email.fr · +33 6 98 76 54 32 · linkedin.com/in/mariemartin · github.com/mariemartin

PROFIL
Chef de projet digital certifiée PMP, 9 ans d'expérience dans le pilotage de
projets web et data à forte valeur ajoutée, en environnement agile.

COMPÉTENCES
Gestion de projet, Agile/Scrum, TypeScript, React, Node.js, AWS, Docker,
Kubernetes, PostgreSQL, Power BI, SQL, ITIL, Risk Management.

LANGUES
Français (natif), Anglais (courant C1), Espagnol (intermédiaire B1).

FORMATION
Master Informatique — Université de Lyon, 2016.
Certification PMP — PMI, 2018.
`;
const CV_TEXT = HEADER + SECTION.repeat(Math.ceil((12_000 - HEADER.length) / SECTION.length));

/* ---------- Same schema as llm.ts ---------------------------------------- */

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
    'score', 'score_breakdown', 'strengths', 'weaknesses',
    'recommendations', 'formatting_advice', 'action_verbs_advice', 'impact_metrics_advice',
  ],
};

const PROMPT = [
  'Tu es un recruteur expert. Analyse ce CV et renvoie UNIQUEMENT un JSON valide',
  '(sans texte autour) respectant exactement cette structure :',
  '{"score": <0-100>, "score_breakdown": [{"category":"<dimension>","score":<0-100>,"comment":"<justification>"}],',
  ' "strengths": [{"title":"<titre>","detail":"<preuve>"}], "weaknesses": [{"title":"<titre>","detail":"<impact>"}],',
  ' "recommendations": [{"title":"<action>","detail":"<comment>"}], "formatting_advice":"<texte>",',
  ' "action_verbs_advice":"<texte>", "impact_metrics_advice":"<texte>"}',
  'Règles : 5 dimensions minimum (Structure, Impact chiffré, Clarté missions, Adéquation poste, Mots-clés ATS) ;',
  '2-4 éléments par liste ; conseils concrets ; français ; pas d invention.',
  '',
  'CV :',
  CV_TEXT,
].join('\n');

/* -------------------------------------------------------------------------- */

const MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];

const VARIANTS = [
  { label: 'thinking par défaut', extra: {} },
  { label: 'thinking OFF (budget 0)', extra: { thinkingConfig: { thinkingBudget: 0 } } },
];

async function bench(model, variant) {
  const startedAt = Date.now();
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': loadApiKey(),
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: SCHEMA,
            maxOutputTokens: 4096,
            ...variant.extra,
          },
        }),
        signal: AbortSignal.timeout(45_000),
      }
    );
    const elapsedMs = Date.now() - startedAt;
    if (!response.ok) {
      const errText = await response.text();
      return { ok: false, elapsedMs, note: `HTTP ${response.status} — ${errText.slice(0, 120)}` };
    }
    const body = await response.json();
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    const usage = body.usageMetadata ?? {};
    const parsed = JSON.parse(text);
    return {
      ok: true,
      elapsedMs,
      score: parsed.score,
      outTokens: usage.candidatesTokenCount,
      thinkTokens: usage.thoughtsTokenCount ?? 0,
      inTokens: usage.promptTokenCount,
    };
  } catch (error) {
    return { ok: false, elapsedMs: Date.now() - startedAt, note: error?.message ?? String(error) };
  }
}

console.info(`Prompt: ${PROMPT.length} chars (~${Math.round(PROMPT.length / 4)} tokens)`);
for (const model of MODELS) {
  for (const variant of VARIANTS) {
    const result = await bench(model, variant);
    if (result.ok) {
      console.info(
        `OK ${model.padEnd(22)} ${variant.label.padEnd(26)} ${String(result.elapsedMs).padStart(6)}ms  ` +
          `score=${result.score} in=${result.inTokens} out=${result.outTokens} think=${result.thinkTokens}`
      );
    } else {
      console.info(
        `XX ${model.padEnd(22)} ${variant.label.padEnd(26)} ${String(result.elapsedMs).padStart(6)}ms  ${result.note}`
      );
    }
  }
}
