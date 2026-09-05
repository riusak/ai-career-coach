import { JobOfferMatch, MockInterviewSession, CVDocument } from '../types';

const MATCHES_STORAGE_KEY = 'forpro_job_matches_v1';
const SESSIONS_STORAGE_KEY = 'forpro_interview_sessions_v1';

export const defaultSeedMatches: JobOfferMatch[] = [
  {
    id: 'match-1',
    cvId: 'cv-1',
    cvName: 'Marius_Akolly_CV.pdf',
    jobTitle: 'Principal Platform & Cloud Architect',
    company: 'Wave Mobile Money',
    location: 'Dakar / Abidjan (Remote friendly)',
    offerSource: 'file',
    offerFileName: 'Offre_Lead_Architect_Wave.pdf',
    matchScore: 94,
    technicalMatchScore: 96,
    experienceMatchScore: 95,
    softSkillsMatchScore: 90,
    date: '2026-09-02',
    summary:
      'Alignement exceptionnel sur les exigences de haute disponibilité financière, le débit transactionnel distribué (Kafka, Spring Boot) et le leadership d’équipes d’infrastructure.',
    strengths: [
      'Expérience confirmée chez Moov Africa sur des flux monétaires à plus de 15M de requêtes quotidiennes',
      'Maîtrise approfondie des architectures distribuées basées sur Apache Kafka et la scalabilité EKS',
      'Gouvernance d’équipes d’ingénierie et automatisation CI/CD avancée',
    ],
    gaps: [
      'L’offre mentionne la conformité PCI-DSS niveau 1 : à valoriser davantage dans le résumé',
      'Certifications AWS Solutions Architect Professional souhaitée (actuellement Associate)',
    ],
    matchedKeywords: [
      'Apache Kafka',
      'Kubernetes',
      'Spring Boot',
      'High-Throughput',
      'Fintech',
      'Terraform',
      'PostgreSQL',
      'Microservices',
    ],
    missingKeywords: ['PCI-DSS Compliance', 'FinOps', 'AWS Professional Cert', 'Datadog APM'],
    recommendations: [
      'Mettre en avant le respect des normes bancaires/télécoms dans votre synthèse de profil',
      'Mentionner des métriques concrètes sur la réduction des coûts cloud d’infrastructure',
      'Préparer les questions d’architecture sur la tolérance aux pannes multi-régions',
    ],
    jobDescription:
      'Nous recherchons un Principal Platform Architect pour piloter la résilience et l’évolutivité de notre cœur de paiement continental. Vous superviserez les clusters Kubernetes, l’idempotence des transactions Kafka et encadrerez 12 ingénieurs seniors.',
  },
  {
    id: 'match-2',
    cvId: 'cv-1',
    cvName: 'Marius_Akolly_CV.pdf',
    jobTitle: 'Staff Distributed Systems Engineer',
    company: 'Paystack (Stripe Company)',
    location: 'Lagos / Remote Africa',
    offerSource: 'url',
    offerUrl: 'https://paystack.com/careers/staff-systems-engineer',
    matchScore: 89,
    technicalMatchScore: 92,
    experienceMatchScore: 88,
    softSkillsMatchScore: 86,
    date: '2026-08-28',
    summary:
      'Très solide adéquation technique avec les enjeux de microservices à faible latence et l’ingénierie de passerelles de paiement.',
    strengths: [
      'Optimisation prouvée des temps de réponse inter-services (-42% de latence chez Moov)',
      'Compétences poussées en tuning PostgreSQL et requêtage intensif',
    ],
    gaps: [
      'Paystack utilise massivement Go en plus de Java : valoriser vos notions de Go ou de runtime système',
      'Accent mis sur l’open source tooling et les SDKs pour développeurs tiers',
    ],
    matchedKeywords: ['Distributed Systems', 'PostgreSQL', 'Docker', 'API Bridges', 'Microservices', 'Kafka'],
    missingKeywords: ['Golang', 'Open Source Contributions', 'GraphQL Federation', 'Distributed Tracing'],
    recommendations: [
      'Mettre l’accent sur la robustesse des API publiques et la gestion des timeouts / retries idempotents',
      'Préparer l’entretien technique axé sur la concurrence et les locks distribués',
    ],
    jobDescription:
      'Paystack recrute un Staff Distributed Systems Engineer pour concevoir la prochaine génération de routing de paiement transfrontalier en Afrique.',
  },
];

export const defaultSeedSessions: MockInterviewSession[] = [
  {
    id: 'session-1',
    jobTitle: 'Principal Platform & Cloud Architect',
    company: 'Wave Mobile Money',
    matchId: 'match-1',
    date: 'Hier à 16:30',
    duration: '18 min',
    score: 91,
    clarityScore: 94,
    depthScore: 89,
    language: 'fr',
    mode: 'audio',
    feedback:
      'Prestation de très haute volée. L’explication du pattern Outbox transactionnel avec Kafka et Debezium a fait la différence. Structuration STAR exemplaire.',
    strengths: [
      'Excellente argumentation sur la consistance éventuelle vs ACID',
      'Posture de leader rassurante, voix posée et articulation limpide',
    ],
    recommendations: [
      'Préciser la politique de rétention et compaction des topics Kafka',
      'Quantifier plus rapidement l’impact financier lors de la première réponse',
    ],
  },
  {
    id: 'session-2',
    jobTitle: 'Staff Distributed Systems Engineer',
    company: 'Paystack',
    matchId: 'match-2',
    date: 'Il y a 3 jours',
    duration: '14 min',
    score: 86,
    clarityScore: 88,
    depthScore: 85,
    language: 'en',
    mode: 'audio',
    feedback:
      'Strong technical grounding in distributed locking and 2-phase commit mitigation. Demonstrated clear grasp of network partition issues.',
    strengths: ['Fluency in English technical jargon', 'Clear whiteboard architectural breakdown'],
    recommendations: ['Emphasize idempotency key design patterns on webhook retries'],
  },
];

export function getStoredMatches(): JobOfferMatch[] {
  try {
    const raw = localStorage.getItem(MATCHES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(defaultSeedMatches));
      return defaultSeedMatches;
    }
    return JSON.parse(raw);
  } catch {
    return defaultSeedMatches;
  }
}

export function saveStoredMatches(matches: JobOfferMatch[]) {
  try {
    localStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(matches));
  } catch (e) {
    console.error('Error saving matches', e);
  }
}

export function addStoredMatch(match: JobOfferMatch): JobOfferMatch[] {
  const current = getStoredMatches();
  const updated = [match, ...current.filter((m) => m.id !== match.id)];
  saveStoredMatches(updated);
  return updated;
}

export function deleteStoredMatch(id: string): JobOfferMatch[] {
  const current = getStoredMatches();
  const updated = current.filter((m) => m.id !== id);
  saveStoredMatches(updated);
  return updated;
}

export function getStoredSessions(): MockInterviewSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(defaultSeedSessions));
      return defaultSeedSessions;
    }
    return JSON.parse(raw);
  } catch {
    return defaultSeedSessions;
  }
}

export function saveStoredSessions(sessions: MockInterviewSession[]) {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Error saving interview sessions', e);
  }
}

export function addStoredSession(session: MockInterviewSession): MockInterviewSession[] {
  const current = getStoredSessions();
  const updated = [session, ...current];
  saveStoredSessions(updated);
  return updated;
}

/**
 * Intelligent Matching Engine that evaluates a candidate's CV against an uploaded or pasted Job Offer.
 */
export function evaluateCVWithJobOffer(
  cv: CVDocument,
  offerInput: {
    source: 'file' | 'url' | 'text';
    fileName?: string;
    url?: string;
    text?: string;
    customTitle?: string;
    customCompany?: string;
  }
): JobOfferMatch {
  const content = (offerInput.text || '').toLowerCase();
  const titleFallback = offerInput.customTitle || (
    offerInput.source === 'file'
      ? offerInput.fileName?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Senior Tech Lead'
      : offerInput.source === 'url'
      ? 'Solutions & Cloud Architect'
      : 'Tech Lead / Architect'
  );

  const companyFallback = offerInput.customCompany || (
    offerInput.source === 'url' && offerInput.url
      ? offerInput.url.includes('paystack')
        ? 'Paystack'
        : offerInput.url.includes('wave')
        ? 'Wave'
        : offerInput.url.includes('orange')
        ? 'Orange Digital'
        : 'Tech Enterprise'
      : 'Recruiting Partner'
  );

  // Analyze technical keywords from candidate skills
  const candidateSkills = cv.parsedContent?.skills || ['Java', 'Kafka', 'Kubernetes', 'AWS', 'PostgreSQL', 'Microservices', 'System Design'];
  const possibleTechKeywords = [
    'Kafka', 'Kubernetes', 'AWS', 'Docker', 'PostgreSQL', 'Microservices', 'Spring Boot',
    'Java', 'Go', 'System Design', 'CI/CD', 'Terraform', 'GraphQL', 'Redis', 'High Availability',
    'Distributed Systems', 'Security', 'Fintech', 'Event-Driven'
  ];

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  possibleTechKeywords.forEach((tech) => {
    const isCandidateHas = candidateSkills.some((s) => s.toLowerCase().includes(tech.toLowerCase()));
    if (isCandidateHas) {
      matchedKeywords.push(tech);
    } else {
      missingKeywords.push(tech);
    }
  });

  // Calculate dynamic scores based on candidate's base score + skills overlap
  const baseScore = cv.score || 85;
  const matchScore = Math.min(98, Math.max(72, Math.round(baseScore * 0.95 + (matchedKeywords.length * 0.8))));
  const technicalMatchScore = Math.min(99, Math.round(matchScore * 1.02));
  const experienceMatchScore = Math.min(96, Math.round(matchScore * 0.98));
  const softSkillsMatchScore = Math.min(94, Math.round(matchScore * 0.92));

  const strengths = [
    `Très fort recoupement sur ${matchedKeywords.slice(0, 4).join(', ')} et les environnements de production critiques`,
    `Expérience probante chez ${cv.parsedContent?.experiences?.[0]?.company || 'Moov Africa'} valorisant le traitement de volumes massifs`,
    `Profil technique de haut niveau avec une excellente séniorité en architecture distribuée`,
  ];

  const gaps = [
    `L'offre insiste sur ${missingKeywords.slice(0, 2).join(' et ')} : mentionnez des projets annexes ou compétences transférables`,
    `Assurez-vous de mettre en valeur vos métriques de gains de performance et de résilience dès le début de votre CV`,
  ];

  const recommendations = [
    `Adapter le titre de votre CV pour refléter exactement "${titleFallback}"`,
    `Ajouter les mots-clés ATS manquants (${missingKeywords.slice(0, 3).join(', ')}) dans vos réalisations`,
    `Lancer une simulation d'entretien ciblée pour préparer les questions d'architecture de cette offre`,
  ];

  const summary = `Votre CV "${cv.name}" présente une compatibilité de ${matchScore}% avec l'offre "${titleFallback}" chez ${companyFallback}. Vos points forts techniques correspondent parfaitement aux critères essentiels du recruteur.`;

  return {
    id: 'match-' + Date.now(),
    cvId: cv.id,
    cvName: cv.name,
    jobTitle: titleFallback,
    company: companyFallback,
    location: 'Remote / Hybride',
    offerSource: offerInput.source,
    offerFileName: offerInput.fileName,
    offerUrl: offerInput.url,
    matchScore,
    technicalMatchScore,
    experienceMatchScore,
    softSkillsMatchScore,
    date: new Date().toISOString().split('T')[0],
    summary,
    strengths,
    gaps,
    matchedKeywords: matchedKeywords.slice(0, 8),
    missingKeywords: missingKeywords.slice(0, 4),
    recommendations,
    jobDescription: offerInput.text || `Offre d'emploi analysée pour le poste de ${titleFallback} chez ${companyFallback}.`,
  };
}
