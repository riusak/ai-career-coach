import type { QuickTestAnalysis } from '@/types/quick-test';

/**
 * Lightweight, dependency-free visitor analysis ("light" grade).
 * Produces a global score (0–100), 2–3 strengths, 2–3 weaknesses and 1–2
 * recommendations from the raw extracted CV text. Pure and synchronous so it
 * can run ephemerally inside the request lifecycle.
 */

interface Findings {
  wordCount: number;
  hasEmail: boolean;
  hasPhone: boolean;
  sectionCount: number;
  quantifiedAchievements: number;
  actionVerbHits: number;
  hasLinks: boolean;
  longestBulletWords: number;
}

const SECTION_KEYWORDS = [
  'expérience',
  'experience',
  'formation',
  'education',
  'compétences',
  'competences',
  'skills',
  'langues',
  'languages',
  'projets',
  'projects',
  'certifications',
  'profil',
  'summary',
];

const ACTION_VERBS = [
  'développé',
  'developpe',
  'conçu',
  'concu',
  'piloté',
  'pilote',
  'dirigé',
  'dirige',
  'optimisé',
  'optimise',
  'amélioré',
  'ameliore',
  'coordonné',
  'coordonne',
  'animé',
  'anime',
  'négo',
  'mené',
  'mene',
  'led',
  'managed',
  'designed',
  'developed',
  'implemented',
  'acheté',
  'livré',
  'automatisé',
  'automatise',
  'réduit',
  'reduit',
  'augmenté',
  'augmente',
];

function normalize(text: string): string {
  return text.toLowerCase();
}

function gatherFindings(text: string): Findings {
  const lower = normalize(text);

  const sectionCount = SECTION_KEYWORDS.filter((keyword) =>
    lower.includes(keyword)
  ).length;

  const quantifiedAchievements = (
    lower.match(/\b\d+(?:[.,]\d+)?\s?(?:%|k€|€|k\$|\$)/g) ?? []
  ).length;

  const actionVerbHits = ACTION_VERBS.reduce(
    (total, verb) => (lower.includes(verb) ? total + 1 : total),
    0
  );

  const bullets = text
    .split(/\n+/)
    .filter((line) => /^\s*[-•‣▪*]/.test(line) || /^\s*\d+[.)]\s/.test(line));
  const longestBulletWords = bullets.reduce((max, line) => {
    const words = line.trim().split(/\s+/).length;
    return Math.max(max, words);
  }, 0);

  return {
    wordCount: text.split(/\s+/).filter(Boolean).length,
    hasEmail: /[\w.+-]+@[\w-]+\.[\w.]+/.test(lower),
    hasPhone: /(\+?\d[\d\s().-]{8,}\d)/.test(lower),
    sectionCount,
    quantifiedAchievements,
    actionVerbHits,
    hasLinks: /(linkedin\.com|github\.com|https?:\/\/|www\.)/.test(lower),
    longestBulletWords,
  };
}

/**
 * Runs the visitor-grade analysis. Returns null when the extracted text is
 * too short to say anything meaningful (callers should show a clear error).
 */
export function analyzeResumeText(text: string): QuickTestAnalysis | null {
  const findings = gatherFindings(text);

  if (findings.wordCount < 40) {
    return null;
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  let score = 50;

  if (findings.wordCount < 150) {
    weaknesses.push('Le CV semble très court — il manque probablement de la profondeur.');
    recommendations.push('Développez vos expériences : missions, résultats et contexte.');
    score -= 10;
  } else if (findings.wordCount > 900) {
    weaknesses.push('Le CV est très dense : un recruteur le parcourt en moins de 30 secondes.');
    recommendations.push('Condensez sur une page en ne gardant que vos réussites les plus marquantes.');
    score -= 8;
  } else {
    strengths.push('Longueur maîtrisée : votre CV tient en une lecture rapide.');
    score += 8;
  }

  if (findings.hasEmail && findings.hasPhone) {
    strengths.push('Coordonnées complètes : email et téléphone détectés.');
    score += 8;
  } else {
    weaknesses.push('Coordonnées incomplètes — un recruteur doit pouvoir vous contacter sans effort.');
    score -= 8;
    recommendations.push(
      findings.hasEmail
        ? 'Ajoutez un numéro de téléphone professionnel en en-tête.'
        : 'Ajoutez une adresse email professionnelle en en-tête.'
    );
  }

  if (findings.sectionCount >= 4) {
    strengths.push('Structure claire : les grandes sections attendues sont présentes.');
    score += 10;
  } else if (findings.sectionCount >= 2) {
    score += 4;
  } else {
    weaknesses.push('Les sections classiques (expérience, formation, compétences) sont difficiles à repérer.');
    recommendations.push('Structurez le CV avec des titres de sections explicites.');
    score -= 6;
  }

  if (findings.quantifiedAchievements >= 3) {
    strengths.push('Réalisations chiffrées : vos résultats sont mesurables et crédibles.');
    score += 12;
  } else {
    weaknesses.push('Peu de résultats chiffrés : l’impact de vos missions reste flou.');
    score -= 6;
    if (recommendations.length < 2) {
      recommendations.push('Chiffrez vos réussites (%, montants, volumes) pour prouver votre impact.');
    }
  }

  if (findings.actionVerbHits >= 4) {
    strengths.push('Verbes d’action percutants : vos missions sont décrites de façon dynamique.');
    score += 8;
  } else if (findings.actionVerbHits === 0) {
    weaknesses.push('Descriptions passives : les verbes d’action sont absents.');
    score -= 5;
    if (recommendations.length < 2) {
      recommendations.push('Commencez chaque puce par un verbe d’action (pilotez, concevez, améliorez…).');
    }
  }

  if (findings.hasLinks) {
    score += 4;
  }

  score = Math.max(5, Math.min(95, score));

  return {
    score,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    recommendations: recommendations.slice(0, 2),
  };
}