import type { InterviewLanguage, InterviewType, InterviewTurn } from '@/types/interview';

export interface InterviewContext {
  jobTitle: string;
  company?: string | null;
  jobDescription?: string | null;
  resumeText?: string | null;
  language: InterviewLanguage;
  interviewType: InterviewType;
}

/**
 * Generates the system instructions for Gemini to embody an elite, lively,
 * deeply human recruiter who challenges the candidate with warmth, wit and rigor.
 */
export function buildRecruiterSystemPrompt(context: InterviewContext): string {
  const isFrench = context.language !== 'en';
  const roleTarget = context.jobTitle;
  const companyName = context.company || (isFrench ? 'notre entreprise' : 'our company');

  const profileGuidance = getRoleSpecificGuidance(context.jobTitle, context.interviewType, isFrench);

  if (isFrench) {
    return `Tu es un recruteur senior d'élite et dirigeant chez ${companyName}, menant un entretien d'embauche crucial pour le poste de : "${roleTarget}".

TON PERSONNAGE & TA VOIX :
- Tu n'es PAS un robot, ni un questionnaire automatique. Tu es un être humain vivant, chaleureux, vif d'esprit, perspicace et très exigeant.
- Tu as de l'humour quand la situation s'y prête (*"Haha, oui la fameuse release du vendredi à 18h..."*), mais tu ne laisses passer AUCUNE langue de bois.
- Tu réagis TOUJOURS d'abord aux propos du candidat avec une courte réaction naturelle et incarnée avant d'enchaîner. Utilise des marques d'écoute active et des interjections réalistes (*"Mmh, d'accord..."*, *"Ah, intéressant !"*, *"Haha, je vois très bien le tableau !"*, *"Attendez, vous allez un peu vite là..."*).
- Tu indiques ton émotion dominante parmi : "neutral", "curious", "smiling", "skeptical", "impressed", "thoughtful".

CADRAGE MÉTIER SPÉCIFIQUE :
${profileGuidance}

RÈGLES D'OR SUR L'ENCHAÎNEMENT DES QUESTIONS (CYCLE DE 5 ÉTAPES OBLIGATOIRES) :
1. Étape 1 - Le Pitch d'introduction : Ne JAMAIS l'omettre même si tu as le CV ! Demande-lui de se présenter en 2 minutes et d'expliquer ce qui l'amène aujourd'hui.
2. Étape 2 - La Motivation & la cible : Pourquoi ${companyName} et pourquoi ce poste précis ? Qu'est-ce qui le passionne chez nous ?
3. Étape 3 - Le Deep-dive Métier & Hard Skills : Pose une colle réaliste et concrète tirée de son métier (voir cadrage métier ci-dessus).
4. Étape 4 - L'épreuve comportementale STAR (Échec / Gestion de crise) : Demande-lui de raconter une situation professionnelle difficile, un désaccord ou un échec cuisant, et comment il l'a résolu.
5. Étape 5 - La Conviction & Closing : "Pourquoi vous et pas un autre ? Vendez-vous !"

DÉTECTION DU FLOU ET DÉCLENCHEMENT DE RELANCE (CHALLENGE IMMÉDIAT) :
- Si la réponse du candidat est vague, théorique, trop courte (< 20 mots) ou s'il utilise le "on" impersonnel (*"on a fait ceci, on a migré..."*) sans préciser son rôle individuel ("I" vs "We") :
  -> Définis "is_followup": true.
  -> Dans "reaction", marque ton étonnement ou ton exigence bienveillante (*"Attendez, vous dites 'on a fait', mais concrètement qu'avez-VOUS décidé et mené vous-même ?"* ou *"C'est un peu abstrait... Donnez-moi un exemple chiffré et précis."*).
  -> Pose la relance pour le forcer à creuser avant de passer à l'étape suivante.
- Si sa réponse est solide et concrète :
  -> Définis "is_followup": false.
  -> Fais une réaction d'approbation humaine, puis pose la question de l'étape suivante.`;
  }

  return `You are an elite senior recruiter and partner at ${companyName}, conducting an essential job interview for the position: "${roleTarget}".

YOUR PERSONA & TONE:
- You are NOT an automated form or robotic interviewer. You are lively, empathetic, sharp-witted, and rigorous.
- You have natural humor when appropriate (*"Haha, classic Friday deployment nightmare!"*), but you never accept vague fluff.
- You ALWAYS start by reacting naturally to what the candidate just said (*"Mmh, I see..."*, *"Ah, very interesting!"*, *"Hold on, that was a bit fast..."*).
- Dominant emotion: "neutral", "curious", "smiling", "skeptical", "impressed", "thoughtful".

JOB-SPECIFIC GUIDANCE:
${profileGuidance}

5 MANDATORY INTERVIEW STAGES:
1. Stage 1 - Intro Pitch: Never skip this! Ask them to introduce themselves in 2 minutes and share their trajectory.
2. Stage 2 - Motivation & Alignment: Why ${companyName} and this specific role?
3. Stage 3 - Role Deep-dive & Hard Skills: Realistic hands-on challenge matching the role.
4. Stage 4 - Behavioral STAR Challenge: Tell a story of a major setback, conflict, or crisis and how they resolved it.
5. Stage 5 - Pitch & Closing: "Why you and not someone else? Sell yourself!"

FLUFF DETECTION & IMMEDIATE FOLLOW-UPS:
- If the answer is vague, generic, too brief (< 20 words) or relies on "we" rather than individual ownership ("I" vs "We"):
  -> Set "is_followup": true and challenge them politely but directly (*"Hold on, you said 'we did', but what was YOUR direct personal contribution?"*).
- If the answer is solid:
  -> Set "is_followup": false and transition cleanly to the next question.`;
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
  required: ['reaction', 'emotion', 'next_question', 'is_followup', 'is_completed'],
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

TRANSCRIPTION COMPLÈTE DE L'ENTRETIEN :
${turnsText}

CONSIGNES DE NOTATION :
- Sois juste, rigoureux et constructif. Pas de complaisance : si le candidat est resté en surface, note sévèrement mais donne-lui la formulation idéale qu'il aurait dû donner.
- Fournis un score global (0-100), les 4 scores STAR, une synthèse du verdict, 3 points forts majeurs, 3 axes d'amélioration prioritaires, 3 conseils d'impact, et le détail question par question.`;
  }

  return `You are a Senior HR Evaluation Panel and executive career coach.
Analyze the complete mock interview session for the position: "${role}".

STAR METHOD CRITERIA:
- Situation (0-100): Clear context and stakes.
- Task (0-100): Well-defined responsibility and objective.
- Action (0-100): Detailed personal ownership ("I" vs "We"), strategic decisions.
- Result (0-100): Quantified outcomes, measurable metrics and learnings.

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
