/**
 * quick-test/guardrail.ts — Filet sémantique « est-ce un CV ? ».
 *
 * Le guardrail PRINCIPAL vit désormais dans le même appel LLM que l'analyse
 * (`llm.ts` renvoie `is_cv` / `document_type` / `detected_language` via le
 * responseSchema fusionné). Ce module est le FILET DE SECURITÉ utilisé quand
 * le LLM est indisponible : avant de présenter un résultat heuristique, on
 * vérifie de façon 100 % déterministe que le texte ressemble à un CV.
 *
 * Les indicateurs couvrent le français, l'anglais et l'allemand — les CV
 * peuvent être rédigés dans n'importe laquelle des langues supportées.
 * Fonction pure et synchrone : aucune donnée n'est stockée (RGPD).
 */

interface HeuristicGateResult {
  ok: boolean;
  reason: string;
}

/** Mots-clés attendus dans un CV, toutes langues supportées confondues. */
const CV_INDICATORS = [
  // Français
  'expérience', 'experience', 'formation', 'compétences', 'competences',
  'profil', 'parcours', 'mission', 'diplôme', 'diplome', 'stage', 'poste',
  'langues', 'certifications', 'réalisations', 'realisations', 'curriculum',
  'vitae', 'cv',
  // Anglais
  'experience', 'education', 'skills', 'summary', 'work history',
  'employment', 'profile', 'projects', 'certifications', 'references',
  'resume', 'curriculum vitae',
  // Allemand
  'berufserfahrung', 'ausbildung', 'kenntnisse', 'lebenslauf', 'sprachen',
  'qualifikationen', 'praktikum', 'arbeitszeugnis',
];

/** Mots-clés typiques de documents NON-CV (factures, paie, etc.). */
const NON_CV_INDICATORS = [
  'facture', 'facturation', 'paiement', 'solde dû', 'montant dû', 'devis',
  'bulletin de paie', 'salaire net', 'paye', 'paie', 'net à payer',
  'total ttc', 'tva', 'iban', 'bic', 'numéro de commande', 'échéance',
  'invoice', 'bill to', 'amount due', 'subtotal', 'vat', 'due date',
  'purchase order', 'receipt', 'pay stub', 'gross pay', 'net pay',
  'rechnung', 'zahlungsbedingungen', 'rechnungsbetrag', 'ust-id', 'mwst',
  'lohnabrechnung', 'nettobetrag', 'zwischensumme',
];

/**
 * Détermine de façon déterministe si le texte ressemble à un CV.
 * Retourne `ok: false` seulement quand les indices NON-CV dominent largement
 * — en cas d'incertitude on accepte (le LLM, quand il répond, tranche avec
 * `is_cv` ; l'heuristique ne doit jamais bloquer un vrai CV).
 */
export function heuristicCvGate(text: string): HeuristicGateResult {
  const trimmed = text.trim();
  if (trimmed.length < 40) {
    return { ok: false, reason: 'texte extrait trop court pour être un CV' };
  }

  const lower = trimmed.toLowerCase();
  const negativeHits = NON_CV_INDICATORS.filter((word) => lower.includes(word));
  const positiveHits = CV_INDICATORS.filter((word) => lower.includes(word));

  if (negativeHits.length >= 3 && positiveHits.length < 2) {
    return {
      ok: false,
      reason: `document ressemblant à un document administratif/financier (${negativeHits.slice(0, 3).join(', ')}…)`,
    };
  }

  if (positiveHits.length >= 2) {
    return { ok: true, reason: 'mots-clés CV détectés' };
  }

  // Ni clairement CV ni clairement autre : on laisse passer (conservateur).
  return { ok: true, reason: 'incertain — accepté par défaut' };
}
