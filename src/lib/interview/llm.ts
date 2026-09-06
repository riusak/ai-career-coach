import {
  buildRecruiterSystemPrompt,
  buildStarEvaluationPrompt,
  STEP_RESPONSE_SCHEMA,
  STAR_EVALUATION_SCHEMA,
  GREETING_RESPONSE_SCHEMA,
  extractCleanSpeech,
  RECRUITER_PANEL,
  RECRUITER_PANEL_EN,
  type InterviewContext,
} from '@/lib/interview/prompts';
import { extractGeminiText, isLlmConfigured } from '@/lib/quick-test/llm';
import type {
  InterviewEmotion,
  InterviewTurn,
  InterviewerSpeaker,
  QuestionStarScore,
  StarEvaluation,
  StepInterviewResponse,
} from '@/types/interview';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_GEMINI_MODEL = 'gemini-3.6-flash';
const TIMEOUT_STEP_MS = 25_000;
const TIMEOUT_EVAL_MS = 35_000;

function getGeminiModels(): string[] {
  const primary = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  return primary === FALLBACK_GEMINI_MODEL
    ? [primary]
    : [primary, FALLBACK_GEMINI_MODEL];
}

interface RawStepOutput {
  speaker_id?: string;
  reaction: string;
  emotion: string;
  next_question: string;
  is_followup: boolean;
  fluff_detected?: boolean;
  is_completed?: boolean;
}

interface RawStarOutput {
  overall_score: number;
  situation_score: number;
  task_score: number;
  action_score: number;
  result_score: number;
  recruiter_verdict: string;
  strengths_summary: string[];
  weaknesses_summary: string[];
  key_advice: string[];
  english_evaluation?: {
    required?: boolean;
    detected_requirement?: string;
    score?: number;
    assessed_level?: string;
    fluency_feedback?: string;
    strengths?: string[];
    areas_for_improvement?: string[];
  };
  questions_feedback: Array<{
    question: string;
    candidate_answer: string;
    situation_score: number;
    task_score: number;
    action_score: number;
    result_score: number;
    strengths: string[];
    weaknesses: string[];
    suggested_improvement: string;
  }>;
}

function coerceEmotion(raw?: string): InterviewEmotion {
  const valid: InterviewEmotion[] = [
    'neutral',
    'curious',
    'smiling',
    'skeptical',
    'impressed',
    'thoughtful',
  ];
  return valid.includes(raw as InterviewEmotion) ? (raw as InterviewEmotion) : 'smiling';
}

/**
 * Generates the greeting turn and question 1 (Pitch) when the session begins.
 * The lead recruiter (HR / Lead) opens the interview and introduces the panel.
 */
export async function generateInitialGreeting(
  context: InterviewContext
): Promise<{ text: string; emotion: InterviewEmotion; speaker: InterviewerSpeaker }> {
  const isFrench = context.language !== 'en';
  const role = context.jobTitle;
  const company = context.company || (isFrench ? 'notre entreprise' : 'our team');
  const legacyPanel = isFrench ? RECRUITER_PANEL : RECRUITER_PANEL_EN;
  
  const leadSpeaker: InterviewerSpeaker =
    context.panel && context.panel.length > 0
      ? context.panel[0]
      : legacyPanel.alisor;

  const otherMembers =
    context.panel && context.panel.length > 1
      ? context.panel.slice(1).map((m) => `${m.name} (${m.title})`).join(', ')
      : (isFrench ? 'Marc Laurent (Directeur Technique)' : 'Mark Laurent (Technical Director)');

  const systemInstruction = buildRecruiterSystemPrompt(context);
  const prompt = isFrench
    ? `Tu es ${leadSpeaker.name}, ${leadSpeaker.title}. Démarre la visioconférence d'entretien pour le poste de "${role}" chez ${company}.
Accueille chaleureusement le candidat en visioconférence, présente brièvement les membres du jury présents (${otherMembers}), et pose la TOUTE PREMIÈRE QUESTION obligatoire : son Pitch personnel (se présenter en 2 minutes, son parcours et ce qui l'amène aujourd'hui).`
    : `You are ${leadSpeaker.name}, ${leadSpeaker.title}. Start the video job interview for "${role}" at ${company}.
Warmly welcome the candidate, briefly introduce the panel members with you (${otherMembers}), and ask the MANDATORY FIRST QUESTION: their 2-minute elevator pitch.`;

  const fallbackText = isFrench
    ? `Bonjour et bienvenue dans cet échange en visioconférence ! Je suis ${leadSpeaker.name}, ${leadSpeaker.title}, et je suis avec ${otherMembers}. Nous sommes ravis d'échanger avec vous pour le poste de ${role}. Pour démarrer : pouvez-vous vous présenter en deux minutes et nous partager votre parcours ?`
    : `Hello and welcome to our video interview! I am ${leadSpeaker.name}, ${leadSpeaker.title}, joined by ${otherMembers}. We are excited to connect with you regarding the ${role} position. To kick things off: could you pitch yourself in 2 minutes and walk us through your trajectory?`;

  const models = getGeminiModels();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      text: fallbackText,
      emotion: 'smiling',
      speaker: leadSpeaker,
    };
  }

  for (const model of models) {
    try {
      const response = await fetch(`${GEMINI_API_BASE_URL}/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nCONSIGNE D'OUVERTURE:\n${prompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
            responseSchema: GREETING_RESPONSE_SCHEMA,
            maxOutputTokens: 1024,
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_STEP_MS),
      });

      if (response.ok) {
        const body: unknown = await response.json();
        const text = extractGeminiText(body);
        if (text && text.trim().length > 0) {
          const cleaned = extractCleanSpeech(text);
          if (cleaned.text) {
            return {
              text: cleaned.text,
              emotion: coerceEmotion(cleaned.emotion),
              speaker: leadSpeaker,
            };
          }
        }
      }
    } catch (err) {
      console.warn(`[interview-llm] Initial greeting failed on model ${model}:`, err);
    }
  }

  return {
    text: fallbackText,
    emotion: 'smiling',
    speaker: leadSpeaker,
  };
}

/**
 * Evaluates the candidate's latest answer, determines if a followup is required,
 * and generates the recruiter's lively reaction + next question with the active panel speaker.
 */
export async function generateNextInterviewTurn(
  context: InterviewContext,
  transcript: InterviewTurn[],
  currentStep: number,
  isCandidateFollowup: boolean
): Promise<StepInterviewResponse> {
  const isFrench = context.language !== 'en';
  const legacyPanel = isFrench ? RECRUITER_PANEL : RECRUITER_PANEL_EN;
  const panelList = (context.panel && context.panel.length > 0)
    ? context.panel
    : [legacyPanel.alisor, legacyPanel.marc];

  const leadSpeaker = panelList[0];
  const techOrExpertSpeaker = panelList[1] || leadSpeaker;

  const defaultSpeaker =
    currentStep === 3 || currentStep === 4 ? techOrExpertSpeaker : leadSpeaker;

  const systemInstruction = buildRecruiterSystemPrompt(context);

  const turnsText = transcript
    .map((t) => {
      const speakerName = t.speaker?.name || (t.role === 'candidate' ? 'CANDIDAT' : 'RECRUTEUR');
      return `[${speakerName.toUpperCase()} - Étape: ${t.stage ?? 1}]: ${t.content}`;
    })
    .join('\n\n');

  const panelInstructions = panelList
    .map(
      (m) =>
        `- ${m.name} (${m.title}, ID: "${m.id}"${'role' in m && m.role ? `, rôle: ${m.role}` : ''})`
    )
    .join('\n');

  const stepGuidance = isFrench
    ? `Nous sommes à l'étape ${currentStep}/5.
Dernière réplique du candidat à évaluer attentivement.
MEMBRES DU JURY DISPONIBLES :
${panelInstructions}
RÉPARTITION SUGGÉRÉE :
- Étape 2 : Recruteur RH ou Manager selon l'angle.
- Étape 3 : Expert métier ou technique (${techOrExpertSpeaker.name}).
- Étape 4 : Mise en situation / comportemental STAR (relance ou question approfondie).
- Étape 5 (Closing) : ${leadSpeaker.name} conclut l'entretien avec les remerciements et prochaines étapes.
${isCandidateFollowup ? 'Le candidat venait déjà de répondre à une relance : ne relance pas une 2ème fois consécutive, enchaîne sur la question suivante pour avancer.' : 'Si la réponse est trop floue ou manque de concret STAR, déclenche une relance (is_followup: true). Sinon enchaîne (is_followup: false).'}`
    : `Current stage is ${currentStep}/5.
JURY MEMBERS AVAILABLE:
${panelInstructions}
${isCandidateFollowup ? 'Candidate was already clarifying a previous followup: do not trigger a second consecutive followup, proceed to the next stage.' : 'If response is vague or lacking STAR details, trigger is_followup: true. Otherwise advance.'}`;

  const prompt = `${systemInstruction}\n\nHISTORIQUE DES ÉCHANGES JUSQU'ICI :\n${turnsText}\n\nCONSIGNE D'ENCHAÎNEMENT :\n${stepGuidance}`;

  const models = getGeminiModels();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || !isLlmConfigured()) {
    return {
      turnId: crypto.randomUUID(),
      reaction: isFrench
        ? "C'est bien noté, merci pour ces précisions."
        : 'Understood, thank you for clarifying.',
      emotion: 'thoughtful',
      nextQuestion: isFrench
        ? 'Parlons maintenant de vos réalisations concrètes : quel a été votre plus grand défi ?'
        : 'Let us talk about your concrete achievements: what was your biggest challenge?',
      isFollowup: false,
      currentStep: Math.min(5, currentStep + 1),
      totalSteps: 5,
      isCompleted: currentStep >= 5,
      speaker: defaultSpeaker,
    };
  }

  for (const model of models) {
    try {
      const response = await fetch(`${GEMINI_API_BASE_URL}/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nINSTRUCTION:\n${prompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.75,
            responseMimeType: 'application/json',
            responseSchema: STEP_RESPONSE_SCHEMA,
            maxOutputTokens: 1024,
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_STEP_MS),
      });

      if (!response.ok) {
        console.warn(`[interview-llm] Step model ${model} returned HTTP ${response.status}`);
        continue;
      }

      const body: unknown = await response.json();
      const generatedText = extractGeminiText(body);
      if (!generatedText) continue;

      let parsed: RawStepOutput | null = null;
      try {
        parsed = JSON.parse(generatedText) as RawStepOutput;
      } catch {
        const clean = extractCleanSpeech(generatedText);
        parsed = {
          speaker_id: clean.speakerId,
          reaction: clean.text,
          emotion: clean.emotion || 'smiling',
          next_question: '',
          is_followup: false,
        };
      }

      const isFollowup = Boolean(parsed.is_followup) && !isCandidateFollowup;
      const nextStep = isFollowup ? currentStep : Math.min(5, currentStep + 1);
      const isCompleted = currentStep >= 5 && !isFollowup;

      // Find speaker object from panel
      let selectedSpeaker: InterviewerSpeaker = defaultSpeaker;
      if (isCompleted || currentStep >= 5) {
        // Closing turn is led by lead recruiter
        selectedSpeaker = leadSpeaker;
      } else if (parsed.speaker_id) {
        const found = panelList.find(
          (p) => p.id.toLowerCase() === parsed?.speaker_id?.toLowerCase()
        );
        if (found) {
          selectedSpeaker = found;
        }
      }

      const cleanReaction = extractCleanSpeech(parsed.reaction || '').text || (isFrench ? "Mmh, d'accord..." : 'I see...');
      const cleanNextQ = extractCleanSpeech(parsed.next_question || '').text || null;

      return {
        turnId: crypto.randomUUID(),
        reaction: cleanReaction,
        emotion: coerceEmotion(parsed.emotion),
        nextQuestion: cleanNextQ,
        isFollowup,
        currentStep: nextStep,
        totalSteps: 5,
        isCompleted,
        speaker: selectedSpeaker,
      };
    } catch (err) {
      console.warn(`[interview-llm] Step generation failed on model ${model}:`, err);
    }
  }

  return {
    turnId: crypto.randomUUID(),
    reaction: isFrench
      ? "Très bien, j'apprécie votre honnêteté sur ce point."
      : 'Very well, I appreciate your candor here.',
    emotion: 'smiling',
    nextQuestion: isFrench
      ? 'Qu’est-ce qui ferait de vous le candidat idéal pour nous plutôt qu’un autre ?'
      : 'What makes you the ideal candidate for us over anyone else?',
    isFollowup: false,
    currentStep: Math.min(5, currentStep + 1),
    totalSteps: 5,
    isCompleted: currentStep >= 5,
    speaker: defaultSpeaker,
  };
}

/**
 * Runs the final consolidated STAR evaluation on the complete transcript.
 */
export async function generateStarEvaluation(
  context: InterviewContext,
  transcript: InterviewTurn[]
): Promise<StarEvaluation | null> {
  const prompt = buildStarEvaluationPrompt(context, transcript);
  const models = getGeminiModels();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || !isLlmConfigured()) {
    return buildFallbackStarEvaluation(context, transcript);
  }

  for (const model of models) {
    try {
      const response = await fetch(`${GEMINI_API_BASE_URL}/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // High consistency for scoring
            responseMimeType: 'application/json',
            responseSchema: STAR_EVALUATION_SCHEMA,
            maxOutputTokens: 4096,
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_EVAL_MS),
      });

      if (!response.ok) {
        console.warn(`[interview-llm] Evaluation model ${model} returned HTTP ${response.status}`);
        continue;
      }

      const body: unknown = await response.json();
      const generatedText = extractGeminiText(body);
      if (!generatedText) continue;

      const parsed = JSON.parse(generatedText) as RawStarOutput;
      return mapRawStarOutput(parsed);
    } catch (err) {
      console.warn(`[interview-llm] Star evaluation failed on model ${model}:`, err);
    }
  }

  return buildFallbackStarEvaluation(context, transcript);
}

import { detectEnglishRequirement } from '@/lib/interview/prompts';
import type { EnglishLanguageEvaluation } from '@/types/interview';

function mapRawStarOutput(raw: RawStarOutput): StarEvaluation {
  const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val || 0)));

  const feedback: QuestionStarScore[] = (raw.questions_feedback || []).map((q) => ({
    question: q.question || '',
    candidateAnswer: q.candidate_answer || '',
    situationScore: clamp(q.situation_score),
    taskScore: clamp(q.task_score),
    actionScore: clamp(q.action_score),
    resultScore: clamp(q.result_score),
    strengths: Array.isArray(q.strengths) ? q.strengths : [],
    weaknesses: Array.isArray(q.weaknesses) ? q.weaknesses : [],
    suggestedImprovement: q.suggested_improvement || '',
  }));

  const rawEng = raw.english_evaluation;
  const englishEvaluation: EnglishLanguageEvaluation | null = rawEng
    ? {
        required: Boolean(rawEng.required),
        detectedRequirement: rawEng.detected_requirement || undefined,
        score: clamp(rawEng.score || 0),
        assessedLevel: (['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'N/A'].includes(rawEng.assessed_level || '')
          ? rawEng.assessed_level
          : 'B2') as EnglishLanguageEvaluation['assessedLevel'],
        fluencyFeedback:
          rawEng.fluency_feedback ||
          'Bonne compréhension globale. Vocabulaire technique maîtrisé, fluidité opérationnelle.',
        strengths: Array.isArray(rawEng.strengths) ? rawEng.strengths : [],
        areasForImprovement: Array.isArray(rawEng.areas_for_improvement)
          ? rawEng.areas_for_improvement
          : [],
      }
    : null;

  return {
    overallScore: clamp(raw.overall_score),
    situationScore: clamp(raw.situation_score),
    taskScore: clamp(raw.task_score),
    actionScore: clamp(raw.action_score),
    resultScore: clamp(raw.result_score),
    recruiterVerdict: raw.recruiter_verdict || 'Entretien complet analysé.',
    strengthsSummary: Array.isArray(raw.strengths_summary) ? raw.strengths_summary : [],
    weaknessesSummary: Array.isArray(raw.weaknesses_summary) ? raw.weaknesses_summary : [],
    keyAdvice: Array.isArray(raw.key_advice) ? raw.key_advice : [],
    englishEvaluation,
    questionsFeedback: feedback,
  };
}

function buildFallbackStarEvaluation(
  context: InterviewContext,
  transcript: InterviewTurn[]
): StarEvaluation {
  const isFrench = context.language !== 'en';
  const englishCheck = detectEnglishRequirement(context.jobTitle, context.jobDescription);

  const englishEvaluation: EnglishLanguageEvaluation | null = englishCheck.required || !isFrench
    ? {
        required: true,
        detectedRequirement: englishCheck.reason,
        score: 82,
        assessedLevel: 'B2',
        fluencyFeedback: isFrench
          ? "Bonne aisance en anglais professionnel. Vocabulaire technique pertinent, discours compréhensible et direct."
          : "Good command of professional English with clear articulation.",
        strengths: isFrench
          ? ["Vocabulaire technique précis", "Aisance sur les explications de projets"]
          : ["Clear technical vocabulary", "Confident delivery"],
        areasForImprovement: isFrench
          ? ["Fluidifier les transitions complexes", "Enrichir les tournures idiomatiques"]
          : ["Refine complex idioms", "Enrich sentence transitions"],
      }
    : null;

  return {
    overallScore: 78,
    situationScore: 80,
    taskScore: 75,
    actionScore: 82,
    resultScore: 74,
    recruiterVerdict: isFrench
      ? "Très bonne posture générale. Vos réponses démontrent des compétences solides, mais vous gagneriez à quantifier davantage vos résultats finaux et à insister sur votre contribution personnelle ('Je' plutôt que 'On')."
      : 'Strong overall presence. Good clarity on actions, but make sure to quantify outcomes with metrics and claim individual ownership.',
    strengthsSummary: isFrench
      ? [
          'Discours clair et articulé',
          'Bonne pertinence technique / métier par rapport au poste',
          'Réactivité positive face aux questions de relance',
        ]
      : ['Clear and structured pitch', 'Solid alignment with the job requirements', 'Engaged attitude'],
    weaknessesSummary: isFrench
      ? [
          'Résultats pas toujours chiffrés avec des métriques précises',
          'Tendance ponctuelle à utiliser le "on" d’équipe au lieu de détailler votre action',
        ]
      : ['Missing quantified results and metrics', 'Occasional generic phrasing'],
    keyAdvice: isFrench
      ? [
          'Préparez 3 réussites avec un chiffre d’impact concret pour chaque réponse',
          'Structurez explicitement chaque exemple en Situation, Tâche, Action, Résultat',
        ]
      : ['Prepare 3 metrics-backed stories beforehand', 'Stick firmly to the STAR structure'],
    englishEvaluation,
    questionsFeedback: transcript
      .filter((t) => t.role === 'candidate')
      .slice(0, 5)
      .map((t, idx) => ({
        question: `Question ${idx + 1}`,
        candidateAnswer: t.content,
        situationScore: 80,
        taskScore: 75,
        actionScore: 80,
        resultScore: 75,
        strengths: isFrench ? ['Bonne clarté'] : ['Good clarity'],
        weaknesses: isFrench ? ['Pourrait être plus spécifique'] : ['Could be more specific'],
        suggestedImprovement: isFrench
          ? "Illustrez directement avec une anecdote chiffrée : 'Lorsque j'ai pris ce projet, nous avions X% de retard. J'ai mis en place Y, ce qui a permis d'atteindre Z en 3 semaines.'"
          : "Anchor with specific metrics: 'When I took over this project, delay was X%. I implemented Y which delivered Z within 3 weeks.'",
      })),
  };
}
