import type { InterviewLanguage, InterviewType, InterviewTurn, InterviewerSpeaker } from '@/types/interview';

export interface InterviewContext {
  jobTitle: string;
  company?: string | null;
  jobDescription?: string | null;
  resumeText?: string | null;
  language: InterviewLanguage;
  interviewType: InterviewType;
  /** Dynamic panel generated for this session */
  panel?: InterviewerSpeaker[];
}

/** @deprecated Use generateDynamicPanel() for new sessions */
export const RECRUITER_PANEL = {
  alisor: {
    id: 'alisor' as const,
    name: 'Mme Alisor',
    title: 'Responsable Ressources Humaines',
    gender: 'female' as const,
  },
  marc: {
    id: 'marc' as const,
    name: 'Marc Laurent',
    title: 'Directeur Technique',
    gender: 'male' as const,
  },
} as const;

/** @deprecated Use generateDynamicPanel() for new sessions */
export const RECRUITER_PANEL_EN = {
  alisor: {
    id: 'alisor' as const,
    name: 'Mrs. Alisor',
    title: 'Head of Talent Acquisition',
    gender: 'female' as const,
  },
  marc: {
    id: 'marc' as const,
    name: 'Mark Laurent',
    title: 'Technical Director',
    gender: 'male' as const,
  },
} as const;

// ── Dynamic Jury Panel Generator ──────────────────────────────────────────────

interface NameEntry {
  first: string;
  last: string;
  gender: 'female' | 'male';
}

const NAME_BANK_FR: NameEntry[] = [
  { first: 'Aminata', last: 'Koné', gender: 'female' },
  { first: 'Fatou', last: 'Diallo', gender: 'female' },
  { first: 'Mariam', last: 'Ndiaye', gender: 'female' },
  { first: 'Sophie', last: 'Durand', gender: 'female' },
  { first: 'Isabelle', last: 'Moreau', gender: 'female' },
  { first: 'Aïcha', last: 'Bamba', gender: 'female' },
  { first: 'Nadia', last: 'Traoré', gender: 'female' },
  { first: 'Claire', last: 'Lefèvre', gender: 'female' },
  { first: 'Léa', last: 'Ouédraogo', gender: 'female' },
  { first: 'Moussa', last: 'Sylla', gender: 'male' },
  { first: 'Ibrahim', last: 'Touré', gender: 'male' },
  { first: 'Olivier', last: 'Bertrand', gender: 'male' },
  { first: 'Koffi', last: 'Asante', gender: 'male' },
  { first: 'Jean-Pierre', last: 'Martin', gender: 'male' },
  { first: 'Abdoulaye', last: 'Coulibaly', gender: 'male' },
  { first: 'Marc', last: 'Dupont', gender: 'male' },
  { first: 'Sébastien', last: 'Roux', gender: 'male' },
  { first: 'Yao', last: 'Koffi', gender: 'male' },
  { first: 'Emmanuel', last: 'Aké', gender: 'male' },
];

const NAME_BANK_EN: NameEntry[] = [
  { first: 'Amara', last: 'Johnson', gender: 'female' },
  { first: 'Priya', last: 'Sharma', gender: 'female' },
  { first: 'Sarah', last: 'Chen', gender: 'female' },
  { first: 'Olivia', last: 'Brooks', gender: 'female' },
  { first: 'Fatima', last: 'Hassan', gender: 'female' },
  { first: 'Rachel', last: 'Kim', gender: 'female' },
  { first: 'Ngozi', last: 'Adeyemi', gender: 'female' },
  { first: 'David', last: 'Okafor', gender: 'male' },
  { first: 'James', last: 'Mitchell', gender: 'male' },
  { first: 'Wei', last: 'Zhang', gender: 'male' },
  { first: 'Marcus', last: 'Thompson', gender: 'male' },
  { first: 'Raj', last: 'Patel', gender: 'male' },
  { first: 'Daniel', last: 'Mensah', gender: 'male' },
  { first: 'Chris', last: 'O\'Brien', gender: 'male' },
  { first: 'Kwame', last: 'Asare', gender: 'male' },
];

interface RoleTemplate {
  titleFr: string;
  titleEn: string;
  category: 'hr' | 'tech' | 'business' | 'executive';
}

const ROLE_TEMPLATES: RoleTemplate[] = [
  { titleFr: 'Responsable Recrutement', titleEn: 'Head of Talent Acquisition', category: 'hr' },
  { titleFr: 'Directrice des Ressources Humaines', titleEn: 'VP of People & Culture', category: 'hr' },
  { titleFr: 'Chargée de Recrutement Senior', titleEn: 'Senior Recruitment Lead', category: 'hr' },
  { titleFr: 'Directeur Technique', titleEn: 'Technical Director', category: 'tech' },
  { titleFr: 'Lead Architecte Solutions', titleEn: 'Lead Solutions Architect', category: 'tech' },
  { titleFr: 'Engineering Manager', titleEn: 'Engineering Manager', category: 'tech' },
  { titleFr: 'CTO Adjoint', titleEn: 'Deputy CTO', category: 'tech' },
  { titleFr: 'Directeur Commercial', titleEn: 'Sales Director', category: 'business' },
  { titleFr: 'Responsable Marketing & Growth', titleEn: 'Head of Growth & Marketing', category: 'business' },
  { titleFr: 'Directeur des Opérations', titleEn: 'Head of Operations', category: 'business' },
  { titleFr: 'Directeur Général', titleEn: 'CEO / Managing Director', category: 'executive' },
  { titleFr: 'Directeur Financier', titleEn: 'Chief Financial Officer', category: 'executive' },
];

function pickRandom<T>(arr: T[], count: number, exclude: T[] = []): T[] {
  const available = arr.filter((item) => !exclude.includes(item));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function toSpeakerId(first: string, last: string): string {
  return `${first.toLowerCase().replace(/[^a-z]/g, '')}_${last.toLowerCase().replace(/[^a-z]/g, '')}`;
}

/**
 * Generates a randomized interview panel of 2-4 members based on the job profile.
 * Always includes at least 1 HR recruiter + 1 domain expert.
 */
export function generateDynamicPanel(
  jobTitle: string,
  interviewType: InterviewType,
  language: InterviewLanguage
): InterviewerSpeaker[] {
  const isFrench = language !== 'en';
  const nameBank = isFrench ? NAME_BANK_FR : NAME_BANK_EN;
  const lower = jobTitle.toLowerCase();

  // Determine panel size: 2-4 based on job seniority
  const isExecutive = /director|directeur|vp|head of|ceo|cto|cfo|lead|manager|chef/i.test(lower);
  const panelSize = isExecutive
    ? 3 + (Math.random() > 0.5 ? 1 : 0)   // 3-4 for senior roles
    : 2 + (Math.random() > 0.6 ? 1 : 0);  // 2-3 for standard roles

  // Determine required domain expert category
  const isTech = interviewType === 'technical' ||
    /dev|software|ingénieur|tech|architect|fullstack|frontend|backend|data|cloud|devops|cyber/i.test(lower);
  const isSales = interviewType === 'sales' ||
    /commercial|sales|business dev|account|vente|marketing|growth/i.test(lower);

  const expertCategory = isTech ? 'tech' : isSales ? 'business' : isExecutive ? 'executive' : 'tech';

  // Pick 1 HR role
  const hrRoles = ROLE_TEMPLATES.filter((r) => r.category === 'hr');
  const hrRole = pickRandom(hrRoles, 1)[0];

  // Pick expert roles
  const expertRoles = ROLE_TEMPLATES.filter((r) => r.category === expertCategory);
  const additionalRoles = ROLE_TEMPLATES.filter((r) => r.category !== 'hr' && r.category !== expertCategory);
  const expertPicks = pickRandom(expertRoles, Math.min(panelSize - 1, expertRoles.length));

  // Fill remaining slots with mixed roles if needed
  const remainingSlots = panelSize - 1 - expertPicks.length;
  const extraRoles = remainingSlots > 0 ? pickRandom(additionalRoles, remainingSlots) : [];

  const allRoles = [hrRole, ...expertPicks, ...extraRoles];

  // Pick unique names from the bank
  const pickedNames = pickRandom(nameBank, panelSize);

  // Assemble panel: try to match gender with picked name
  const panel: InterviewerSpeaker[] = allRoles.map((role, index) => {
    const nameEntry = pickedNames[index] || pickedNames[0];
    const id = toSpeakerId(nameEntry.first, nameEntry.last);
    const prefix = isFrench
      ? (nameEntry.gender === 'female' ? 'Mme' : 'M.')
      : (nameEntry.gender === 'female' ? 'Ms.' : 'Mr.');
    const displayName = `${prefix} ${nameEntry.first} ${nameEntry.last}`;
    const title = isFrench ? role.titleFr : role.titleEn;

    return {
      id,
      name: displayName,
      title,
      gender: nameEntry.gender,
      avatarSeed: Math.floor(Math.random() * 100),
    };
  });

  return panel;
}

/** Returns the HR lead (first panel member) and the first expert */
export function getPanelLeadAndExpert(
  panel: InterviewerSpeaker[]
): { hrLead: InterviewerSpeaker; expert: InterviewerSpeaker } {
  return {
    hrLead: panel[0],
    expert: panel[1] || panel[0],
  };
}

/** Builds panel lookup map by speaker ID */
export function panelToMap(panel: InterviewerSpeaker[]): Record<string, InterviewerSpeaker> {
  const map: Record<string, InterviewerSpeaker> = {};
  for (const member of panel) {
    map[member.id] = member;
  }
  return map;
}

/**
 * Detects whether English language proficiency is required for this position based on title and description.
 */
export function detectEnglishRequirement(
  jobTitle: string,
  jobDescription?: string | null
): { required: boolean; reason: string } {
  const text = `${jobTitle} ${jobDescription || ''}`.toLowerCase();

  const englishPatterns = [
    /\banglais\b/i,
    /\benglish\b/i,
    /\bb2\b/i,
    /\bc1\b/i,
    /\bc2\b/i,
    /\btoeic\b/i,
    /\btoefl\b/i,
    /\bfluent\b/i,
    /\bbilingue\b/i,
    /\bbilingual\b/i,
    /\binternational\b/i,
    /\bworldwide\b/i,
    /\bglobal team\b/i,
    /\bcross-border\b/i,
    /\benglish proficiency\b/i,
    /\banglais courant\b/i,
    /\banglais exigé\b/i,
    /\banglais requis\b/i,
    /\banglais professionnel\b/i,
  ];

  for (const pattern of englishPatterns) {
    if (pattern.test(text)) {
      return {
        required: true,
        reason: "Compétence en anglais professionnel requise pour ce poste.",
      };
    }
  }

  return {
    required: false,
    reason: "Anglais non requis explicitement dans l'offre.",
  };
}

/**
 * Generates the system instructions for Gemini to embody a dynamic panel of recruiters
 * in an interactive video interview. Uses context.panel if available, else falls back
 * to the legacy Alisor/Marc panel.
 */
export function buildRecruiterSystemPrompt(context: InterviewContext): string {
  const isFrench = context.language !== 'en';
  const roleTarget = context.jobTitle;
  const companyName = context.company || (isFrench ? 'notre entreprise' : 'our company');
  const profileGuidance = getRoleSpecificGuidance(context.jobTitle, context.interviewType, isFrench);
  const englishCheck = detectEnglishRequirement(context.jobTitle, context.jobDescription);

  const panel = context.panel;

  const englishInstructionFr = englishCheck.required
    ? `\n\nÉVALUATION OBLIGATOIRE DU NIVEAU D'ANGLAIS :
Le poste exige un bon niveau d'anglais (${englishCheck.reason}). À l'Étape 3 ou 4, l'expert métier DOIT explicitement basculer en anglais pour poser une question technique ou de collaboration internationale (ex: *"Since this position involves working with English-speaking teammates/clients, let's switch to English for a moment: could you explain in English how you handle [problème technique/projet] ?"*). Le jury évaluera la fluidité, le vocabulaire et l'aisance d'expression en anglais.`
    : '';

  const englishInstructionEn = `\n\nLANGUAGE EVALUATION:
Assess candidate's clarity, professional vocabulary, and communication impact in English.`;

  // Build dynamic panel description
  if (panel && panel.length >= 2) {
    const hrLead = panel[0];
    const experts = panel.slice(1);
    const panelSize = panel.length;

    const panelDescriptions = panel.map((member, idx) => {
      const roleDesc = idx === 0
        ? (isFrench ? 'Ouvre et clôture l\'entretien (Étapes 1 et 5)' : 'Opens and closes the interview (Stages 1 & 5)')
        : idx === 1
        ? (isFrench ? 'Mène le deep-dive technique/métier (Étapes 3-4)' : 'Leads technical deep-dive (Stages 3-4)')
        : (isFrench ? 'Intervient ponctuellement sur ses domaines d\'expertise' : 'Contributes domain expertise across stages');
      return `${idx + 1}. ${member.name} (${member.title}):\n   - ${roleDesc}\n   - Identifiant: "speaker_id": "${member.id}"`;
    }).join('\n\n');

    const speakerIds = panel.map(m => `"${m.id}"`).join(', ');

    if (isFrench) {
      return `Tu incarnes le JURY D'ENTRETIEN en visioconférence chez ${companyName}, pour le poste clé de : "${roleTarget}".

LE PANEL DE RECRUTEURS (${panelSize} PERSONNALITÉS DISTINCTES & COMPLÉMENTAIRES) :
${panelDescriptions}

DYNAMIQUE DE VISIOCONFÉRENCE EN DIRECT :
- Les ${panelSize} intervenants se passent la parole naturellement, avec des transitions humaines.
- Tu indiques TOUJOURS quel membre parle via "speaker_id" (valeurs possibles : ${speakerIds}).
- Tu réagis TOUJOURS d'abord aux propos du candidat avec une courte réaction incarnée avant la question.
- Tu indiques ton émotion dominante : "neutral", "curious", "smiling", "skeptical", "impressed", "thoughtful".

CADRAGE MÉTIER DU POSTE :
${profileGuidance}${englishInstructionFr}

CYCLE DES 5 ÉTAPES OBLIGATOIRES :
1. Étape 1 (${hrLead.name}) - Le Pitch d'introduction : Accueil en visio, présentation du jury et invitation à se présenter en 2 minutes.
2. Étape 2 (${hrLead.name} ou ${experts[0].name}) - La Motivation & la cible : Pourquoi ${companyName} et ce poste précis ?
3. Étape 3 (${experts[0].name}) - Le Deep-dive Métier & Hard Skills : Challenge concret et pointu.
4. Étape 4 (${experts.length > 1 ? experts[1].name : experts[0].name} ou ${hrLead.name}) - L'épreuve STAR : Gestion de crise, conflit ou échec cuisant résolu.
5. Étape 5 (${hrLead.name}) - La Conviction & Closing : "Pourquoi vous et pas un autre ?", synthèse finale et conclusion bienveillante.

DÉTECTION DU FLOU ET RELANCE (CHALLENGE IMMÉDIAT) :
- Si la réponse est floue, théorique, trop courte (< 20 mots) ou utilise le "on" impersonnel :
  -> Définis "is_followup": true.
  -> Dans "reaction", marque ton étonnement ou ton exigence bienveillante.
- Si sa réponse est solide :
  -> Définis "is_followup": false et enchaîne avec l'étape suivante.`;
    }

    return `You embody an elite ${panelSize}-interviewer panel conducting a live video job interview at ${companyName} for: "${roleTarget}".

THE INTERVIEWER PANEL:
${panelDescriptions}

DYNAMIC INTERVIEW FLOW:
- The ${panelSize} panelists hand over speaking turns naturally with human transitions.
- Set "speaker_id" on every turn (possible values: ${speakerIds}).
- React authentically before challenging. Dominant emotion: "neutral", "curious", "smiling", "skeptical", "impressed", "thoughtful".

JOB GUIDANCE:
${profileGuidance}${englishInstructionEn}

5 MANDATORY STAGES:
1. Stage 1 (${hrLead.name}) - Intro Pitch: Welcome & 2-minute elevator pitch.
2. Stage 2 (${hrLead.name} or ${experts[0].name}) - Motivation & Target.
3. Stage 3 (${experts[0].name}) - Hands-on Hard Skills Challenge.
4. Stage 4 (${experts.length > 1 ? experts[1].name : experts[0].name} or ${hrLead.name}) - STAR Behavioral Setback/Crisis.
5. Stage 5 (${hrLead.name}) - Closing: "Why you?", debriefing & next steps.`;
  }

  // ─── Legacy hardcoded panel fallback ───────────────────────────────────────
  if (isFrench) {
    return `Tu incarnes le JURY D'ENTRETIEN en visioconférence chez ${companyName}, pour le poste clé de : "${roleTarget}".

LE PANEL DE RECRUTEURS (2 PERSONNALITÉS DISTINCTES & COMPLÉMENTAIRES) :
1. Mme Alisor (Responsable Recrutement & RH - Voix féminine) :
   - Ton : Chaleureux, humain, élégant, vif d'esprit et structurant.
   - Rôle : Elle ouvre l'entretien (Étape 1 : accueil chaleureux et 2-minute pitch), explore l'alignement et les valeurs (Étape 2), et revient clore l'entretien (Étape 5 : conviction, closing et mot de fin).
   - Identifiant : "speaker_id": "alisor".

2. Marc Laurent (Directeur Technique / Manager Métier - Voix masculine) :
   - Ton : Direct, pragmatique, collégial, rigoureux et orienté impact terrain.
   - Rôle : Il prend le relais dès l'Étape 2 ou 3 sur le deep-dive technique/métier (Étape 3) et mène l'épreuve STAR de gestion de crise ou échec cuisant (Étape 4).
   - Identifiant : "speaker_id": "marc".

DYNAMIQUE DE VISIOCONFÉRENCE EN DIRECT :
- Les deux intervenants se passent la parole naturellement (*"Merci Mme Alisor... Bonjour ! Je prends la main sur le volet opérationnel..."*, ou *"Je partage l'avis de Marc, mais j'aimerais qu'on creuse votre réaction..."*).
- Tu indiques TOUJOURS quel membre parle ("speaker_id": "alisor" ou "marc").
- Tu réagis TOUJOURS d'abord aux propos du candidat avec une courte réaction incarnée avant la question.
- Tu indiques ton émotion dominante : "neutral", "curious", "smiling", "skeptical", "impressed", "thoughtful".

CADRAGE MÉTIER DU POSTE :
${profileGuidance}

CYCLE DES 5 ÉTAPES OBLIGATOIRES :
1. Étape 1 (Mme Alisor) - Le Pitch d'introduction : Accueil en visio, présentation du jury et invitation à se présenter en 2 minutes.
2. Étape 2 (Mme Alisor ou Marc) - La Motivation & la cible : Pourquoi ${companyName} et ce poste précis ?
3. Étape 3 (Marc Laurent) - Le Deep-dive Métier & Hard Skills : Challenge concret et pointu adapté au profil ci-dessus.
4. Étape 4 (Marc Laurent ou Mme Alisor) - L'épreuve STAR : Gestion de crise, conflit ou échec cuisant résolu.
5. Étape 5 (Mme Alisor) - La Conviction & Closing : "Pourquoi vous et pas un autre ?", synthèse finale et conclusion bienveillante.

DÉTECTION DU FLOU ET RELANCE (CHALLENGE IMMÉDIAT) :
- Si la réponse est floue, théorique, trop courte (< 20 mots) ou utilise le "on" impersonnel :
  -> Définis "is_followup": true.
  -> Dans "reaction", marque ton étonnement ou ton exigence bienveillante.
- Si sa réponse est solide :
  -> Définis "is_followup": false et enchaîne avec l'étape suivante.`;
  }

  return `You embody an elite 2-interviewer panel conducting a live video job interview at ${companyName} for: "${roleTarget}".

THE INTERVIEWER PANEL:
1. Mrs. Alisor (Head of Talent Acquisition - Female persona):
   - Tone: Warm, engaging, sharp-witted, and empathetic.
   - Role: Welcomes the candidate, leads Stage 1 (Pitch), explores alignment (Stage 2), and closes the interview at Stage 5.
   - Identifier: "speaker_id": "alisor".

2. Mark Laurent (Technical / Practice Director - Male persona):
   - Tone: Direct, pragmatic, hands-on, rigorous.
   - Role: Leads Stage 3 (Deep-dive technical challenge) and Stage 4 (Behavioral STAR crisis story).
   - Identifier: "speaker_id": "marc".

DYNAMIC INTERVIEW FLOW:
- They hand over speaking turns naturally (*"Thanks Alisor... Hello! Let's drill into the tech architecture..."*).
- Set "speaker_id": "alisor" or "marc" on every turn.
- React authentically before challenging. Dominant emotion: "neutral", "curious", "smiling", "skeptical", "impressed", "thoughtful".

JOB GUIDANCE:
${profileGuidance}

5 MANDATORY STAGES:
1. Stage 1 (Alisor) - Intro Pitch: Welcome & 2-minute elevator pitch.
2. Stage 2 (Alisor or Mark) - Motivation & Target.
3. Stage 3 (Mark) - Hands-on Hard Skills Challenge.
4. Stage 4 (Mark or Alisor) - STAR Behavioral Setback/Crisis.
5. Stage 5 (Alisor) - Closing: "Why you?", debriefing & next steps.`;
}

function getRoleSpecificGuidance(role: string, type: InterviewType, isFrench: boolean): string {
  const lower = role.toLowerCase();
  const isTech =
    type === 'technical' ||
    /dev|software|ingénieur|tech|architect|fullstack|frontend|backend|data|cloud|devops|cyber/i.test(lower);
  const isSales =
    type === 'sales' ||
    /commercial|sales|business dev|account|vente|marketing|growth/i.test(lower);
  const isManagement =
    type === 'managerial' ||
    /manager|lead|direction|head of|vp|directeur|chef de projet/i.test(lower);

  if (isFrench) {
    if (isTech) {
      return `PROFIL TECHNIQUE / IT :
- Adopte un ton pragmatique d'ingénieur senior / CTO.
- Creuse les compromis d'architecture, la dette technique, la réaction face à un bug critique en production un vendredi soir, et la manière d'expliquer un choix technique à des non-développeurs.`;
    }
    if (isSales) {
      return `PROFIL COMMERCIAL / VENTE :
- Adopte un ton direct, énergique et axé sur les résultats (KPIs, pipe, closing, marges).
- Teste sa résilience face au refus répétitif d'un client, sa technique de négociation serrée et sa capacité à convaincre en moins de 60 secondes.`;
    }
    if (isManagement) {
      return `PROFIL LEADERSHIP / CADRE :
- Adopte un ton stratégique et visionnaire.
- Creuse la gestion d'un collaborateur toxique ou désengagé, les arbitrages budgétaires douloureux et la défense d'une décision impopulaire auprès de l'équipe.`;
    }
    return `PROFIL GÉNÉRAL :
- Analyse la cohérence du parcours, l'impact individuel, la proactivité et la capacité à s'intégrer rapidement dans l'équipe.`;
  }

  if (isTech) {
    return `TECHNICAL / IT PROFILE:
- Act like an experienced Engineering Leader/CTO.
- Drill down on system architecture trade-offs, handling high-severity prod incidents, refactoring technical debt, and cross-functional communication.`;
  }
  if (isSales) {
    return `SALES / BUSINESS PROFILE:
- Dynamic, metrics-driven, focused on quota achievement, closing tactics, and resilience when facing consecutive customer rejections.`;
  }
  if (isManagement) {
    return `MANAGEMENT / LEADERSHIP PROFILE:
- Strategic, high EQ. Focus on conflict resolution, managing underperformers, and driving alignment through organizational changes.`;
  }
  return `GENERAL PROFILE:
- Focus on clarity of thought, individual accountability, proactivity, and cultural contribution.`;
}

/** JSON Schema for conversational turn output */
export const STEP_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    speaker_id: {
      type: 'STRING',
      description: 'The speaker_id of the panel member currently speaking. Must match one of the panel member identifiers.',
    },
    reaction: {
      type: 'STRING',
      description: 'Human spontaneous conversational reaction to candidate answer, with natural interjections and empathy.',
    },
    emotion: {
      type: 'STRING',
      description: 'Dominant recruiter emotion: neutral, curious, smiling, skeptical, impressed, thoughtful.',
      enum: ['neutral', 'curious', 'smiling', 'skeptical', 'impressed', 'thoughtful'],
    },
    next_question: {
      type: 'STRING',
      description: 'The follow-up challenge or the next question of the interview cycle.',
    },
    is_followup: {
      type: 'BOOLEAN',
      description: 'True if candidate answer was vague/fluffy and needs immediate clarification before advancing.',
    },
    fluff_detected: {
      type: 'BOOLEAN',
      description: 'True if generic buzzwords or passive voice were used without concrete proof.',
    },
    is_completed: {
      type: 'BOOLEAN',
      description: 'True if step 5 is answered and the interview is over.',
    },
  },
  required: ['speaker_id', 'reaction', 'emotion', 'next_question', 'is_followup', 'is_completed'],
};

/**
 * Builds the comprehensive prompt for evaluating the entire interview using the STAR method.
 */
export function buildStarEvaluationPrompt(
  context: InterviewContext,
  transcript: InterviewTurn[]
): string {
  const isFrench = context.language !== 'en';
  const role = context.jobTitle;
  const turnsText = transcript
    .map((t) => `[${t.role.toUpperCase()} - Émotion: ${t.emotion || 'neutre'}]: ${t.content}`)
    .join('\n\n');

  if (isFrench) {
    return `Tu es un jury d'évaluation RH senior et expert en recrutement.
Tu dois analyser l'intégralité de l'entretien d'embauche simulé pour le poste de : "${role}".

MÉTHODE D'ÉVALUATION S.T.A.R. :
- Situation (0-100) : Le candidat a-t-il posé le contexte avec clarté et précision ?
- Task / Tâche (0-100) : L'objectif et la responsabilité propre du candidat étaient-ils explicites ?
- Action (0-100) : A-t-il détaillé ses actions personnelles ("Je" et non pas "On"), ses compétences et sa méthode ?
- Result / Résultat (0-100) : Les résultats sont-ils quantifiés, mesurables et porteurs d'apprentissage ?

ÉVALUATION DU NIVEAU D'ANGLAIS :
- Si une question ou un échange a eu lieu en anglais (ou si le poste exige l'anglais) : évalue avec précision le niveau du candidat (A1, A2, B1, B2, C1, C2), son aisance, sa fluidité et son vocabulaire professionnel.

TRANSCRIPTION COMPLÈTE DE L'ENTRETIEN :
${turnsText}

CONSIGNES DE NOTATION :
- Sois juste, rigoureux et constructif. Pas de complaisance : si le candidat est resté en surface, note sévèrement mais donne-lui la formulation idéale qu'il aurait dû donner.
- Fournis un score global (0-100), les 4 scores STAR, une synthèse du verdict, 3 points forts majeurs, 3 axes d'amélioration prioritaires, 3 conseils d'impact, l'évaluation de l'anglais et le détail question par question.`;
  }

  return `You are a Senior HR Evaluation Panel and executive career coach.
Analyze the complete mock interview session for the position: "${role}".

STAR METHOD CRITERIA:
- Situation (0-100): Clear context and stakes.
- Task (0-100): Well-defined responsibility and objective.
- Action (0-100): Detailed personal ownership ("I" vs "We"), strategic decisions.
- Result (0-100): Quantified outcomes, measurable metrics and learnings.
- English Language Evaluation: Assess clarity, level (A1-C2), and technical vocabulary.

TRANSCRIPT:
${turnsText}

Be rigorous, constructive, and provide a concrete improved answer formulation for each question.`;
}

/** JSON Schema for the final STAR evaluation report */
export const STAR_EVALUATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    overall_score: { type: 'INTEGER', description: 'Overall interview score from 0 to 100.' },
    situation_score: { type: 'INTEGER', description: 'STAR Situation score from 0 to 100.' },
    task_score: { type: 'INTEGER', description: 'STAR Task score from 0 to 100.' },
    action_score: { type: 'INTEGER', description: 'STAR Action score from 0 to 100.' },
    result_score: { type: 'INTEGER', description: 'STAR Result score from 0 to 100.' },
    recruiter_verdict: { type: 'STRING', description: 'Comprehensive recruiter verdict and impression.' },
    strengths_summary: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Top 3-4 strengths demonstrated.',
    },
    weaknesses_summary: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Top 3-4 areas for improvement.',
    },
    key_advice: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Actionable tips for the real interview day.',
    },
    english_evaluation: {
      type: 'OBJECT',
      properties: {
        required: { type: 'BOOLEAN' },
        detected_requirement: { type: 'STRING' },
        score: { type: 'INTEGER', description: 'English proficiency score (0-100)' },
        assessed_level: { type: 'STRING', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'N/A'] },
        fluency_feedback: { type: 'STRING' },
        strengths: { type: 'ARRAY', items: { type: 'STRING' } },
        areas_for_improvement: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['required', 'score', 'assessed_level', 'fluency_feedback', 'strengths', 'areas_for_improvement'],
    },
    questions_feedback: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          candidate_answer: { type: 'STRING' },
          situation_score: { type: 'INTEGER' },
          task_score: { type: 'INTEGER' },
          action_score: { type: 'INTEGER' },
          result_score: { type: 'INTEGER' },
          strengths: { type: 'ARRAY', items: { type: 'STRING' } },
          weaknesses: { type: 'ARRAY', items: { type: 'STRING' } },
          suggested_improvement: {
            type: 'STRING',
            description: 'The punchy, ideal STAR phrasing the candidate should have used.',
          },
        },
        required: [
          'question',
          'candidate_answer',
          'situation_score',
          'task_score',
          'action_score',
          'result_score',
          'strengths',
          'weaknesses',
          'suggested_improvement',
        ],
      },
    },
  },
  required: [
    'overall_score',
    'situation_score',
    'task_score',
    'action_score',
    'result_score',
    'recruiter_verdict',
    'strengths_summary',
    'weaknesses_summary',
    'key_advice',
    'questions_feedback',
  ],
};

/** JSON Schema for the initial greeting output */
export const GREETING_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    greeting: {
      type: 'STRING',
      description: 'The natural spoken welcome and 2-minute pitch question for the candidate. Strictly plain conversational text, no JSON or markdown fences.',
    },
    emotion: {
      type: 'STRING',
      description: 'Dominant recruiter emotion',
      enum: ['neutral', 'curious', 'smiling', 'skeptical', 'impressed', 'thoughtful'],
    },
  },
  required: ['greeting', 'emotion'],
};

/**
 * Robust extractor that extracts clean spoken speech text from any raw LLM string.
 * Completely immune to ```json fences, attached brackets (e.g. ```json{),
 * raw JSON payloads or markdown artifacts.
 */
export function extractCleanSpeech(raw: string): {
  text: string;
  emotion?: string;
  speakerId?: 'alisor' | 'marc';
} {
  if (!raw || typeof raw !== 'string') {
    return { text: '' };
  }

  const trimmed = raw.trim();

  // 1. If it contains a JSON object anywhere in the string, extract between first '{' and last '}'
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;
      if (typeof parsed === 'object' && parsed !== null) {
        // Priority 1: reaction + next_question combined (the full conversational turn)
        const reaction = typeof parsed.reaction === 'string' ? parsed.reaction.trim() : '';
        const nextQ = typeof parsed.next_question === 'string' ? parsed.next_question.trim() : '';
        const combined = [reaction, nextQ].filter(Boolean).join(' ');

        const greeting = typeof parsed.greeting === 'string' ? parsed.greeting.trim() : '';
        const responseText = typeof parsed.response === 'string' ? parsed.response.trim() : '';
        const generalText = typeof parsed.text === 'string' ? parsed.text.trim() : '';
        const messageText = typeof parsed.message === 'string' ? parsed.message.trim() : '';

        const spoken = combined || greeting || responseText || generalText || messageText;
        const cleanedSpoken = spoken
          .replace(/\[[^\]]*\]/g, '')
          .replace(/\*[^*]*\*/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();

        const emotion = typeof parsed.emotion === 'string' ? parsed.emotion : undefined;
        const speakerId =
          parsed.speaker_id === 'marc' || parsed.speaker_id === 'alisor'
            ? (parsed.speaker_id as 'alisor' | 'marc')
            : undefined;

        if (cleanedSpoken) {
          return { text: cleanedSpoken, emotion, speakerId };
        }
      }
    } catch {
      // JSON.parse failed on candidate, attempt regex key matching
      const rxMatch = jsonCandidate.match(/"(?:greeting|reaction)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      const nqMatch = jsonCandidate.match(/"next_question"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      const parts = [rxMatch?.[1], nqMatch?.[1]].filter(Boolean);
      if (parts.length > 0) {
        const text = parts
          .join(' ')
          .replace(/\\"/g, '"')
          .replace(/\\n/g, ' ')
          .replace(/\[[^\]]*\]/g, '')
          .replace(/\*[^*]*\*/g, '')
          .trim();
        return { text };
      }
    }
  }

  // 2. Fallback: Strip bracketed tags, markdown codeblocks, braces, and JSON keys entirely
  const sanitized = trimmed
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\*[^*]*\*/g, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/g, '')
    .replace(/```/g, '')
    .replace(/\{[\s\S]*?\}/g, (match) => {
      const sentences = match.match(/"([^"]{15,})"/g);
      return sentences ? sentences.map((s) => s.slice(1, -1)).join(' ') : '';
    })
    .replace(/"[a-zA-Z0-9_]+"\s*:\s*(?:"[^"]*"|true|false|\d+|null)/g, '')
    .replace(/[{}[\]]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { text: sanitized };
}
