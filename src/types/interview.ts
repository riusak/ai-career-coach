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

export type InterviewerId = 'alisor' | 'marc';

export interface InterviewerSpeaker {
  id: InterviewerId;
  name: string;
  title: string;
  gender: 'female' | 'male';
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

