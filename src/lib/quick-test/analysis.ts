import type {
  InsightItem,
  QuickTestAnalysis,
  RecommendationItem,
  ScoreBreakdownItem,
} from '@/types/quick-test';

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
 *
 * v2: produces the same rich shape as the LLM analysis (score breakdown,
 * titled insights, actionable recommendations, targeted advice) so the UI
 * renders identically whichever engine served the result.
 */
export function analyzeResumeText(text: string): QuickTestAnalysis | null {
  const findings = gatherFindings(text);

  if (findings.wordCount < 40) {
    return null;
  }

  const strengths: InsightItem[] = [];
  const weaknesses: InsightItem[] = [];
  const recommendations: RecommendationItem[] = [];
  const formatting: string[] = [];
  const verbsAdvice: string[] = [];
  const impactAdvice: string[] = [];

  let score = 50;

  if (findings.wordCount < 150) {
    weaknesses.push({
      title: 'CV trop court',
      detail: `Seulement ${findings.wordCount} mots détectés : le contenu manque de profondeur pour convaincre un recruteur.`,
    });
    recommendations.push({
      title: 'Développez vos expériences',
      detail: 'Décrivez vos missions, les résultats obtenus et le contexte de chaque poste (2-4 puces par expérience).',
    });
    formatting.push('Le CV est très court : enrichissez chaque expérience avec des missions détaillées plutôt que de simples titres de poste.');
    score -= 10;
  } else if (findings.wordCount > 900) {
    weaknesses.push({
      title: 'CV trop dense',
      detail: `${findings.wordCount} mots : un recruteur parcourt un CV en moins de 30 secondes, tout ne sera pas lu.`,
    });
    recommendations.push({
      title: 'Condensez sur une page',
      detail: 'Ne gardez que vos réussites les plus marquantes des 10 dernières années et supprimez les détails anciens ou redondants.',
    });
    formatting.push('Le CV dépasse une page : réduisez les expériences anciennes au profit de vos réussites récentes et chiffrées.');
    score -= 8;
  } else {
    strengths.push({
      title: 'Longueur maîtrisée',
      detail: `${findings.wordCount} mots : votre CV tient en une lecture rapide, conforme aux attentes des recruteurs.`,
    });
    score += 8;
  }

  if (findings.hasEmail && findings.hasPhone) {
    strengths.push({
      title: 'Coordonnées complètes',
      detail: 'Email et téléphone détectés : un recruteur peut vous contacter sans effort, en un coup d’œil.',
    });
    score += 8;
  } else {
    weaknesses.push({
      title: 'Coordonnées incomplètes',
      detail: findings.hasEmail
        ? 'Aucun numéro de téléphone détecté : certains recruteurs privilégient l’appel direct.'
        : 'Aucune adresse email détectée : impossible de vous joindre, le CV risque d’être écarté.',
    });
    recommendations.push({
      title: findings.hasEmail ? 'Ajoutez votre téléphone' : 'Ajoutez votre email',
      detail: findings.hasEmail
        ? 'Placez un numéro de téléphone professionnel en en-tête, sur la même ligne que votre email.'
        : 'Placez une adresse email professionnelle (prenom.nom@…) en en-tête du CV, jamais une adresse fantaisiste.',
    });
    score -= 8;
  }

  if (findings.sectionCount >= 4) {
    strengths.push({
      title: 'Structure claire',
      detail: `${findings.sectionCount} sections attendues détectées : la lecture est fluide et les filtres ATS repèrent l’information sans effort.`,
    });
    score += 10;
  } else if (findings.sectionCount >= 2) {
    score += 4;
  } else {
    weaknesses.push({
      title: 'Structure difficile à repérer',
      detail: 'Les sections classiques (expérience, formation, compétences) sont absentes ou mal identifiables.',
    });
    recommendations.push({
      title: 'Structurez avec des titres de sections',
      detail: 'Utilisez des intitulés explicites et visibles : « Expérience professionnelle », « Formation », « Compétences », « Langues ».',
    });
    formatting.push('Ajoutez des titres de sections en gras et hiérarchisez avec des puces : un CV illisible est écarté, y compris par les filtres ATS.');
    score -= 6;
  }

  if (findings.quantifiedAchievements >= 3) {
    strengths.push({
      title: 'Réalisations chiffrées',
      detail: `${findings.quantifiedAchievements} résultats mesurables détectés (%, montants, volumes) : votre impact est crédible et vérifiable.`,
    });
    score += 12;
  } else {
    weaknesses.push({
      title: 'Impact peu mesurable',
      detail: `Seuls ${findings.quantifiedAchievements} résultat(s) chiffré(s) détecté(s) : la valeur de vos missions reste floue pour un recruteur.`,
    });
    impactAdvice.push('Chiffrez au moins 2-3 réussites : « amélioré les délais de 20 % », « géré un budget de 50 k€ », « encadré une équipe de 6 personnes ».');
    if (recommendations.length < 2) {
      recommendations.push({
        title: 'Chiffrez vos réussites',
        detail: 'Ajoutez des métriques à vos puces (%, montants, volumes, délais) pour prouver votre impact plutôt que de l’affirmer.',
      });
    }
    score -= 6;
  }

  if (findings.actionVerbHits >= 4) {
    strengths.push({
      title: 'Verbes d’action percutants',
      detail: `${findings.actionVerbHits} verbes d’action détectés : vos missions sont décrites de façon dynamique et orientée résultat.`,
    });
    score += 8;
  } else if (findings.actionVerbHits === 0) {
    weaknesses.push({
      title: 'Descriptions passives',
      detail: 'Aucun verbe d’action détecté : les missions semblent subies plutôt que pilotées.',
    });
    verbsAdvice.push('Commencez chaque puce par un verbe d’action au participe passé : « piloté », « conçu », « automatisé », « réduit »…');
    if (recommendations.length < 2) {
      recommendations.push({
        title: 'Dynamisez vos formulations',
        detail: 'Remplacez « responsable de… » par des verbes d’action : « piloté », « conçu », « optimisé », suivi du résultat obtenu.',
      });
    }
    score -= 5;
  } else {
    verbsAdvice.push('Renforcez l’uniformité : chaque puce devrait démarrer par un verbe d’action au participe passé pour un effet constant.');
    score += 3;
  }

  if (findings.hasLinks) {
    strengths.push({
      title: 'Présence en ligne',
      detail: 'Lien professionnel détecté (LinkedIn, GitHub, portfolio) : le recruteur peut approfondir votre profil.',
    });
    score += 4;
  }

  score = Math.max(5, Math.min(95, score));

  const structureScore = Math.max(5, Math.min(100, 40 + findings.sectionCount * 12));
  const contactScore =
    findings.hasEmail && findings.hasPhone ? 100 : findings.hasEmail || findings.hasPhone ? 60 : 20;
  const impactScore =
    findings.quantifiedAchievements >= 3 ? 90 : findings.quantifiedAchievements >= 1 ? 65 : 30;
  const verbsScore =
    findings.actionVerbHits >= 4
      ? 90
      : findings.actionVerbHits >= 2
        ? 65
        : findings.actionVerbHits >= 1
          ? 50
          : 25;
  const densityScore = findings.wordCount < 150 ? 45 : findings.wordCount > 900 ? 50 : 90;

  const scoreBreakdown: ScoreBreakdownItem[] = [
    {
      category: 'Structure & lisibilité',
      score: structureScore,
      comment: `${findings.sectionCount} section(s) repérée(s) · puce la plus longue : ${findings.longestBulletWords} mots.`,
    },
    {
      category: 'Impact chiffré',
      score: impactScore,
      comment: `${findings.quantifiedAchievements} résultat(s) chiffré(s) détecté(s) dans les missions.`,
    },
    {
      category: 'Coordonnées & contact',
      score: contactScore,
      comment:
        findings.hasEmail && findings.hasPhone
          ? 'Email et téléphone présents.'
          : 'Coordonnées incomplètes : un canal de contact manque.',
    },
    {
      category: 'Verbes d’action',
      score: verbsScore,
      comment: `${findings.actionVerbHits} verbe(s) d’action caractéristique(s) trouvé(s).`,
    },
    {
      category: 'Densité & concision',
      score: densityScore,
      comment: `${findings.wordCount} mots : ${
        findings.wordCount < 150
          ? 'contenu à enrichir'
          : findings.wordCount > 900
            ? 'volume à condenser'
            : 'longueur adaptée à une lecture rapide'
      }.`,
    },
  ];

  return {
    score,
    scoreBreakdown,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    recommendations: recommendations.slice(0, 2),
    formattingAdvice:
      formatting.length > 0
        ? formatting.join(' ')
        : 'La mise en page est cohérente : conservez des sections titrées, des puces courtes et une hiérarchie visuelle nette.',
    actionVerbsAdvice:
      verbsAdvice.length > 0
        ? verbsAdvice.join(' ')
        : 'Vos formulations sont dynamiques : maintenez un verbe d’action en tête de chaque puce (« piloté », « conçu », « automatisé »).',
    impactMetricsAdvice:
      impactAdvice.length > 0
        ? impactAdvice.join(' ')
        : 'Vos résultats sont déjà chiffrés : ajoutez la ligne de base (« de X à Y ») pour rendre la progression encore plus lisible.',
  };
}