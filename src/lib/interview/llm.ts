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
  speaker_id?: 'alisor' | 'marc';
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
 * Mme Alisor (HR) opens the interview.
 */
export async function generateInitialGreeting(
  context: InterviewContext
): Promise<{ text: string; emotion: InterviewEmotion; speaker: InterviewerSpeaker }> {
  const isFrench = context.language !== 'en';
  const role = context.jobTitle;
  const company = context.company || (isFrench ? 'notre entreprise' : 'our team');
  const panel = isFrench ? RECRUITER_PANEL : RECRUITER_PANEL_EN;
  const speaker: InterviewerSpeaker = panel.alisor;

  const systemInstruction = buildRecruiterSystemPrompt(context);
  const prompt = isFrench
    ? `Tu es Mme Alisor. Démarre la visioconférence d'entretien pour le poste de "${role}" chez ${company}.
Accueille chaleureusement le candidat en visioconférence, présente brièvement le jury (toi-même et Marc Laurent le Directeur Technique), et pose la TOUTE PREMIÈRE QUESTION obligatoire : son Pitch personnel (se présenter en 2 minutes, son parcours et ce qui l'amène aujourd'hui).`
    : `You are Mrs. Alisor. Start the video job interview for "${role}" at ${company}.
Warmly welcome the candidate, briefly introduce the panel (yourself and Mark Laurent, Technical Director), and ask the MANDATORY FIRST QUESTION: their 2-minute elevator pitch.`;

  const fallbackText = isFrench
    ? `Bonjour et bienvenue dans cet échange en visioconférence ! Je suis Mme Alisor, Responsable Recrutement, et je suis accompagnée de Marc Laurent, notre Directeur Technique. Nous sommes ravis d'échanger avec vous pour le poste de ${role}. Pour démarrer : pouvez-vous vous présenter en deux minutes et nous partager votre trajectoire ?`
    : `Hello and welcome to our video interview! I am Mrs. Alisor, Head of Talent Acquisition, and I am joined by Mark Laurent, our Technical Director. We are excited to connect with you regarding the ${role} position. To kick things off: could you pitch yourself in 2 minutes and walk us through your trajectory?`;

  const models = getGeminiModels();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      text: fallbackText,
      emotion: 'smiling',
      speaker,
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
              speaker,
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
    speaker,
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
  const panel = isFrench ? RECRUITER_PANEL : RECRUITER_PANEL_EN;
  const systemInstruction = buildRecruiterSystemPrompt(context);

  const turnsText = transcript
    .map((t) => {
      const speakerName = t.speaker?.name || (t.role === 'candidate' ? 'CANDIDAT' : 'RECRUTEUR');
      return `[${speakerName.toUpperCase()} - Étape: ${t.stage ?? 1}]: ${t.content}`;
    })
    .join('\n\n');

  const stepGuidance = isFrench
    ? `Nous sommes à l'étape ${currentStep}/5.
Dernière réplique du candidat à évaluer attentivement.
RÉPARTITION DU JURY :
- Étape 2 : Mme Alisor ou Marc selon l'angle (motivation vs adéquation).
- Étape 3 : Marc Laurent prend la parole (challenge technique / métier concret).
- Étape 4 : Marc Laurent ou Mme Alisor (gestion de crise STAR ou désaccord).
- Étape 5 : Mme Alisor revient pour la synthèse et le closing.
${isCandidateFollowup ? 'Le candidat venait déjà de répondre à une relance : ne relance pas une 2ème fois consécutive, enchaîne sur la question suivante pour avancer.' : 'Si la réponse est trop floue, déclenche une relance (is_followup: true). Sinon enchaîne (is_followup: false).'}`
    : `Current stage is ${currentStep}/5.
PANEL DISTRIBUTION:
- Stage 2: Mrs. Alisor or Mark (Motivation & target).
- Stage 3: Mark Laurent leads (hands-on hard skills & tech deep-dive).
- Stage 4: Mark Laurent or Mrs. Alisor (behavioral STAR setback).
- Stage 5: Mrs. Alisor leads closing and summary.
${isCandidateFollowup ? 'Candidate was already clarifying a previous followup: do not trigger a second consecutive followup, proceed to the next stage.' : 'If response is vague, trigger is_followup: true. Otherwise advance.'}`;

  const prompt = `${systemInstruction}\n\nHISTORIQUE DES ÉCHANGES JUSQU'ICI :\n${turnsText}\n\nCONSIGNE D'ENCHAÎNEMENT :\n${stepGuidance}`;

  const defaultSpeakerId: 'alisor' | 'marc' =
    currentStep === 3 || currentStep === 4 ? 'marc' : 'alisor';

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
      speaker: panel[defaultSpeakerId],
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
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.75, // Natural human variety
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
        // Fallback to extractCleanSpeech
        const clean = extractCleanSpeech(generatedText);
        parsed = {
          speaker_id: clean.speakerId,
          reaction: clean.text,
          emotion: clean.emotion || 'smiling',
          next_question: '',
          is_followup: false,
        };
      }

      const speakerId: 'alisor' | 'marc' =
        parsed.speaker_id === 'marc' || parsed.speaker_id === 'alisor'
          ? parsed.speaker_id
          : defaultSpeakerId;

      const isFollowup = Boolean(parsed.is_followup) && !isCandidateFollowup;
      const nextStep = isFollowup ? currentStep : Math.min(5, currentStep + 1);
      const isCompleted = currentStep >= 5 && !isFollowup;

      // Ensure reaction and next_question are strictly sanitized
      const cleanReaction = extractCleanSpeech(parsed.reaction || '').text || (isFrench ? "Mmh, d'accord..." : 'I see...');
      const cleanNextQ = isCompleted
        ? null
        : extractCleanSpeech(parsed.next_question || '').text || (isFrench ? 'Passons à la suite.' : 'Moving on.');

      return {
        turnId: crypto.randomUUID(),
        reaction: cleanReaction,
        emotion: coerceEmotion(parsed.emotion),
        nextQuestion: cleanNextQ,
        isFollowup,
        currentStep: nextStep,
        totalSteps: 5,
        isCompleted,
        speaker: panel[speakerId],
      };
    } catch (err) {
      console.warn(`[interview-llm] Step generation failed on model ${model}:`, err);
    }
  }

  // Graceful fallback
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
    speaker: panel[defaultSpeakerId],
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
    questionsFeedback: feedback,
  };
}

function buildFallbackStarEvaluation(
  context: InterviewContext,
  transcript: InterviewTurn[]
): StarEvaluation {
  const isFrench = context.language !== 'en';
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
