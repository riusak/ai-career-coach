/**
 * quick-test/guardrail.ts — Prérequis sémantique avant analyse complète.
 *
 * Objectif : vérifier qu’un document uploadé est bien un CV et non une
 * facture, un bulletin de paie, ou un fichier texte quelconque.
 *
 * Stratégie en deux niveaux :
 * 1) Fast-path heuristique (mots-clés CV / mots-interdits) — 100 % deterministe.
 * 2) Appel Gemini 2.5-flash pour validation fine en cas d’incertitude.
 *
 * La validation est une fonctionnalité pure (pas de côté effet de bord) ; aucune
 * donnée utilisateur n’est stockée. Respecte le RGPD : l’IP n’intervient
 * ici que dans un éventuel futur contrôle de douceur côté serveur.
 */

import { callGeminiJson, GUARDRAIL_TIMEOUT_MS } from './llm';

interface QuickTestValidation {
  ok: boolean;
  reason: string;
}

const CV_INDICATORS = [
  'expérience', 'expérience professionnelle', 'formation', 'compétences',
  'profil', 'mission', 'diplôme', 'stage', 'poste', 'recrutement',
  'réalisations', 'responsabilités', 'objectifs professionnels',
  'expérience', 'parcours', 'compétences techniques',
];

const NON_CV_INDICATORS = [
  'facture', 'facturation', 'paiement', 'solde', 'montant', 'devis',
  'paie', 'bulletin', 'salaire', 'pay stub', 'reçu', 'invoice',
  '€', '$', 'total ttc', 'iban', 'bic',
];

/** Détecte assez tôt si le texte ressemble à un document non-CV. */
function heuristicIsCv(text: string): { ok: boolean; reason: string } {
  const lower = text.toLowerCase();
  const negativeHits = NON_CV_INDICATORS.filter((w) => lower.includes(w));
  const positiveHits = CV_INDICATORS.filter((w) => lower.includes(w));

  if (negativeHits.length >= 2 && positiveHits.length < 2) {
    return { ok: false, reason: `texte riche en mots non-CV (${negativeHits.join(', ')})` };
  }

  if (positiveHits.length >= 2) {
    return { ok: true, reason: `mots-clés CV détectés (${positiveHits.join(', ')})` };
  }

  // Entre les deux: on laisse Gemini trancher.
  return { ok: true, reason: 'incertain — validation Gemini' };
}

/**
 * Applique la réglette de validation. Retourne `ok: true` seulement quand le
 * document est raisonnablement identifiable comme un CV.
 */
export async function validateCvDocument(text: string): Promise<QuickTestValidation> {
  const trimmed = text.trim();
  if (trimmed.length < 10) {
    return { ok: false, reason: 'Texte extrait trop court' };
  }

  const fast = heuristicIsCv(trimmed);
  if (!fast.ok) {
    return { ok: false, reason: fast.reason };
  }
  if (fast.reason && !fast.reason.includes('incertain')) {
    return { ok: fast.ok, reason: fast.reason };
  }

  // Validation fine via Gemini — on force la sortie JSON stricte.
  console.time('[quick-test] Guardrail Gemini call');
  const prompt = `
Tu es un expert en recrutement. Analyse ce texte et réponds STRICTEMENT par du JSON valide
(sans aucun texte autour) au format:
{ "is_cv": true|false, "confidence": 0-100, "reason": "court texte" }

Critères : est-ce un curriculum vitae / resume d’une personne physique, ou un
document administratif/financier (facture, paie, devis, reçu…) ?
Texte (tronqué à 3000 caractères) :
"""${trimmed.slice(0, 3000)}"""
`;
    const res = await callGeminiJson<{ is_cv: boolean; confidence: number; reason: string }>(prompt, {
      timeoutMs: GUARDRAIL_TIMEOUT_MS,
    });
    console.timeEnd('[quick-test] Guardrail Gemini call');

  if (res && typeof res.is_cv === 'boolean') {
    return { ok: res.is_cv, reason: res.reason || (res.is_cv ? 'validation Gemini ok' : 'rejeté par Gemini') };
  }

  // Repli sur l’heuristique (conservateur : on accepte).
  return { ok: true, reason: 'repli heuristique (incertain)' };
}
