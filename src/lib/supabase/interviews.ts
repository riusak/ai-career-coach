import { createClient } from '@/utils/supabase/server';
import type {
  InitInterviewInput,
  InterviewSession,
  InterviewSessionSummary,
  InterviewTurn,
  StarEvaluation,
} from '@/types/interview';

export interface InterviewResponse<T> {
  data: T | null;
  error: string | null;
}

const INTERVIEW_SELECT =
  'id, resume_id, user_id, job_matching_id, job_title, company, job_description, ' +
  'language, interview_type, status, score, current_step, total_steps, ' +
  'transcript, star_evaluation, created_at, updated_at';

interface DbInterviewRow {
  id: string;
  resume_id: string;
  user_id: string;
  job_matching_id: string | null;
  job_title: string;
  company: string | null;
  job_description: string | null;
  language: string;
  interview_type: string;
  status: string;
  score: number | null;
  current_step: number;
  total_steps: number;
  transcript: unknown;
  star_evaluation: unknown;
  created_at: string;
  updated_at: string;
}

function mapDbRowToSession(row: DbInterviewRow): InterviewSession {
  return {
    id: row.id,
    resumeId: row.resume_id,
    userId: row.user_id,
    jobMatchingId: row.job_matching_id,
    jobTitle: row.job_title,
    company: row.company,
    jobDescription: row.job_description,
    language: (row.language === 'en' ? 'en' : 'fr'),
    interviewType: (['general', 'technical', 'sales', 'managerial', 'star'].includes(row.interview_type)
      ? row.interview_type
      : 'general') as InterviewSession['interviewType'],
    status: (['in_progress', 'completed', 'abandoned'].includes(row.status)
      ? row.status
      : 'in_progress') as InterviewSession['status'],
    score: row.score,
    currentStep: row.current_step,
    totalSteps: row.total_steps,
    transcript: Array.isArray(row.transcript) ? (row.transcript as InterviewTurn[]) : [],
    starEvaluation: (row.star_evaluation as StarEvaluation) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Creates and initializes an in-progress interview simulation session.
 */
export async function createInterviewSession(
  input: InitInterviewInput,
  initialTurns: InterviewTurn[] = []
): Promise<InterviewResponse<InterviewSession>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? 'Non authentifié.' };
    }

    const { data, error } = await supabase
      .from('interview_simulations')
      .insert({
        resume_id: input.resumeId,
        user_id: user.id,
        job_matching_id: input.jobMatchingId ?? null,
        job_title: input.jobTitle.trim().slice(0, 200),
        company: input.company ? input.company.trim().slice(0, 200) : null,
        job_description: input.jobDescription ? input.jobDescription.trim() : null,
        language: input.language ?? 'fr',
        interview_type: input.interviewType ?? 'general',
        status: 'in_progress',
        current_step: 1,
        total_steps: 5,
        transcript: initialTurns,
      })
      .select(INTERVIEW_SELECT)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapDbRowToSession(data as unknown as DbInterviewRow), error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur lors de la création de la session.';
    return { data: null, error: message };
  }
}

/**
 * Appends new conversational turns and optionally updates the current stage step.
 */
export async function appendInterviewTurns(
  sessionId: string,
  newTurns: InterviewTurn[],
  currentStep?: number
): Promise<InterviewResponse<InterviewSession>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? 'Non authentifié.' };
    }

    // Fetch existing transcript to append safely
    const { data: existing, error: fetchError } = await supabase
      .from('interview_simulations')
      .select('transcript, current_step')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return { data: null, error: fetchError?.message ?? 'Session introuvable.' };
    }

    const currentTranscript = Array.isArray(existing.transcript)
      ? (existing.transcript as InterviewTurn[])
      : [];
    const updatedTranscript = [...currentTranscript, ...newTurns];

    const updates: Record<string, unknown> = {
      transcript: updatedTranscript,
      updated_at: new Date().toISOString(),
    };

    if (typeof currentStep === 'number') {
      updates.current_step = currentStep;
    }

    const { data, error } = await supabase
      .from('interview_simulations')
      .update(updates)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select(INTERVIEW_SELECT)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapDbRowToSession(data as unknown as DbInterviewRow), error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la session.';
    return { data: null, error: message };
  }
}

/**
 * Completes an interview session with its final STAR evaluation and overall score.
 */
export async function completeInterviewSession(
  sessionId: string,
  score: number,
  starEvaluation: StarEvaluation
): Promise<InterviewResponse<InterviewSession>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? 'Non authentifié.' };
    }

    const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

    const { data, error } = await supabase
      .from('interview_simulations')
      .update({
        score: clampedScore,
        star_evaluation: starEvaluation,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select(INTERVIEW_SELECT)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapDbRowToSession(data as unknown as DbInterviewRow), error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur lors de la clôture de la session.';
    return { data: null, error: message };
  }
}

/**
 * Retrieves a single session by its unique ID.
 */
export async function getInterviewSessionById(
  sessionId: string
): Promise<InterviewResponse<InterviewSession>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? 'Non authentifié.' };
    }

    const { data, error } = await supabase
      .from('interview_simulations')
      .select(INTERVIEW_SELECT)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapDbRowToSession(data as unknown as DbInterviewRow), error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur lors de la récupération de la session.';
    return { data: null, error: message };
  }
}

/**
 * Retrieves recent interview sessions for the authenticated user (newest first).
 */
export async function getUserInterviewSessions(
  limit: number = 20
): Promise<InterviewResponse<InterviewSessionSummary[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? 'Non authentifié.' };
    }

    const { data, error } = await supabase
      .from('interview_simulations')
      .select(
        'id, resume_id, job_title, company, language, interview_type, status, score, current_step, star_evaluation, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    const summaries: InterviewSessionSummary[] = ((data as unknown as Array<{
      id: string;
      resume_id: string;
      job_title: string;
      company: string | null;
      language: string;
      interview_type: string;
      status: string;
      score: number | null;
      current_step: number;
      star_evaluation: unknown;
      created_at: string;
    }>) ?? []).map((row) => ({
      id: row.id,
      resumeId: row.resume_id,
      jobTitle: row.job_title,
      company: row.company,
      language: (row.language === 'en' ? 'en' : 'fr'),
      interviewType: (['general', 'technical', 'sales', 'managerial', 'star'].includes(row.interview_type)
        ? row.interview_type
        : 'general') as InterviewSessionSummary['interviewType'],
      status: (['in_progress', 'completed', 'abandoned'].includes(row.status)
        ? row.status
        : 'in_progress') as InterviewSessionSummary['status'],
      score: row.score,
      totalQuestions: row.current_step,
      createdAt: row.created_at,
      hasEvaluation: row.star_evaluation !== null,
    }));

    return { data: summaries, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur lors de la récupération des simulations.';
    return { data: null, error: message };
  }
}

/**
 * Marks an in-progress session as abandoned with a professional and friendly note.
 */
export async function abandonInterviewSession(
  sessionId: string,
  userMessage?: string
): Promise<InterviewResponse<InterviewSession>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? 'Non authentifié.' };
    }

    const verdict =
      userMessage ||
      'Entretien interrompu par le candidat. Vous pouvez vous réentraîner à tout moment pour compléter les 5 étapes et décrocher votre bilan STAR complet !';

    const { data, error } = await supabase
      .from('interview_simulations')
      .update({
        status: 'abandoned',
        star_evaluation: {
          recruiterVerdict: verdict,
          overallScore: 0,
          situationScore: 0,
          taskScore: 0,
          actionScore: 0,
          resultScore: 0,
          strengthsSummary: ['Prise d’initiative pour s’entraîner à l’oral'],
          weaknessesSummary: ['Session suspendue avant les étapes de clôture'],
          keyAdvice: [
            'Prévoyez 5 à 10 minutes d’affilée pour franchir les 5 questions clés du recruteur.',
          ],
          questionsFeedback: [],
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select(INTERVIEW_SELECT)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapDbRowToSession(data as unknown as DbInterviewRow), error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur lors de l’interruption de la session.';
    return { data: null, error: message };
  }
}
