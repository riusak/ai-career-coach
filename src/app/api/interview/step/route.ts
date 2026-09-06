import { NextResponse } from 'next/server';
import { generateNextInterviewTurn } from '@/lib/interview/llm';
import {
  appendInterviewTurns,
  getInterviewSessionById,
} from '@/lib/supabase/interviews';
import type { InterviewTurn } from '@/types/interview';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface StepRequestBody {
  sessionId: string;
  candidateAnswer: string;
  isCandidateFollowup?: boolean;
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Payload invalide.' }, { status: 400 });
    }

    const { sessionId, candidateAnswer, isCandidateFollowup } = body as StepRequestBody;

    if (!sessionId || typeof candidateAnswer !== 'string' || !candidateAnswer.trim()) {
      return NextResponse.json(
        { error: 'sessionId et candidateAnswer sont requis.' },
        { status: 400 }
      );
    }

    // 1. Fetch current session
    const sessionResult = await getInterviewSessionById(sessionId);
    if (sessionResult.error || !sessionResult.data) {
      return NextResponse.json(
        { error: sessionResult.error ?? 'Session introuvable.' },
        { status: 404 }
      );
    }

    const session = sessionResult.data;

    // 2. Build candidate turn
    const candidateTurn: InterviewTurn = {
      id: crypto.randomUUID(),
      role: 'candidate',
      content: candidateAnswer.trim(),
      isFollowup: Boolean(isCandidateFollowup),
      stage: session.currentStep,
      timestamp: new Date().toISOString(),
    };

    const updatedTranscript = [...session.transcript, candidateTurn];

    // 3. Generate lively reaction and next question from Gemini
    const stepResult = await generateNextInterviewTurn(
      {
        jobTitle: session.jobTitle,
        company: session.company,
        jobDescription: session.jobDescription,
        language: session.language,
        interviewType: session.interviewType,
      },
      updatedTranscript,
      session.currentStep,
      Boolean(isCandidateFollowup)
    );

    const recruiterFullContent = [stepResult.reaction, stepResult.nextQuestion]
      .filter(Boolean)
      .join(' ');

    const recruiterTurn: InterviewTurn = {
      id: stepResult.turnId,
      role: 'recruiter',
      content: recruiterFullContent,
      emotion: stepResult.emotion,
      isFollowup: stepResult.isFollowup,
      stage: stepResult.currentStep,
      timestamp: new Date().toISOString(),
    };

    // 4. Save both turns in Supabase
    await appendInterviewTurns(
      session.id,
      [candidateTurn, recruiterTurn],
      stepResult.currentStep
    );

    return NextResponse.json({
      ...stepResult,
      recruiterTurn,
    });
  } catch (err) {
    console.error('[api/interview/step] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la réponse du candidat.' },
      { status: 500 }
    );
  }
}
