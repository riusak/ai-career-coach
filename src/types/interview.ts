/**
 * Types and interfaces for the Interactive AI Mock Interview Studio (STAR Method).
 * Strict TypeScript compliance: zero `any`.
 */

export type InterviewRole = 'recruiter' | 'candidate';

export type InterviewEmotion =
  | 'neutral'
  | 'curious'
  | 'smiling'
  | 'skeptical'
  | 'impressed'
  | 'thoughtful';

export type InterviewType =
  | 'general'
  | 'technical'
  | 'sales'
  | 'managerial'
  | 'star';

export type InterviewStatus = 'in_progress' | 'completed' | 'abandoned';

export type InterviewLanguage = 'fr' | 'en';

export type InterviewerId = string;

export interface InterviewerSpeaker {
  id: InterviewerId;
  name: string;
  title: string;
  gender: 'female' | 'male';
  role?: string;
  /** Deterministic seed for avatar rendering (0-99) */
  avatarSeed?: number;
}

/** A single conversational turn exchanged between recruiter and candidate. */
export interface InterviewTurn {
  id: string;
  role: InterviewRole;
  content: string;
  emotion?: InterviewEmotion;
  isFollowup?: boolean;
  stage?: number;
  speaker?: InterviewerSpeaker;
  timestamp: string;
}

/** Per-question detailed STAR evaluation breakdown. */
export interface QuestionStarScore {
  question: string;
  candidateAnswer: string;
  situationScore: number;
  taskScore: number;
  actionScore: number;
  resultScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestedImprovement: string;
}

/** English language assessment produced when English proficiency is evaluated. */
export interface EnglishLanguageEvaluation {
  required: boolean;
  detectedRequirement?: string;
  score: number;
  assessedLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'N/A';
  fluencyFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
}

/** Comprehensive final STAR evaluation report produced by Gemini. */
export interface StarEvaluation {
  overallScore: number;
  situationScore: number;
  taskScore: number;
  actionScore: number;
  resultScore: number;
  strengthsSummary: string[];
  weaknessesSummary: string[];
  recruiterVerdict: string;
  keyAdvice: string[];
  questionsFeedback: QuestionStarScore[];
  /** Dedicated English proficiency evaluation if required or tested */
  englishEvaluation?: EnglishLanguageEvaluation | null;
}

/** The full entity representing an interview simulation in Supabase. */
export interface InterviewSession {
  id: string;
  resumeId: string;
  userId: string;
  jobMatchingId: string | null;
  jobTitle: string;
  company: string | null;
  jobDescription: string | null;
  language: InterviewLanguage;
  interviewType: InterviewType;
  status: InterviewStatus;
  score: number | null;
  currentStep: number;
  totalSteps: number;
  transcript: InterviewTurn[];
  /** Dynamically generated jury panel for this session */
  panel: InterviewerSpeaker[] | null;
  starEvaluation: StarEvaluation | null;
  createdAt: string;
  updatedAt: string;
}

/** Compact summary displayed in history lists and cards. */
export interface InterviewSessionSummary {
  id: string;
  resumeId: string;
  jobTitle: string;
  company: string | null;
  language: InterviewLanguage;
  interviewType: InterviewType;
  status: InterviewStatus;
  score: number | null;
  totalQuestions: number;
  createdAt: string;
  hasEvaluation: boolean;
}

/** Input for starting an interview session. */
export interface InitInterviewInput {
  resumeId: string;
  jobMatchingId?: string | null;
  jobTitle: string;
  company?: string | null;
  jobDescription?: string | null;
  language?: InterviewLanguage;
  interviewType?: InterviewType;
}

/** Result returned after submitting a candidate answer turn. */
export interface StepInterviewResponse {
  turnId: string;
  reaction: string;
  emotion: InterviewEmotion;
  nextQuestion: string | null;
  isFollowup: boolean;
  currentStep: number;
  totalSteps: number;
  isCompleted: boolean;
  speaker?: InterviewerSpeaker;
}

