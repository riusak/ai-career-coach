import { NextResponse } from 'next/server';
import { generateNextInterviewTurn } from '@/lib/interview/llm';
import {
  appendInterviewTurns,
  getInterviewSessionById,
} from '@/lib/supabase/interviews';
import { checkRateLimit, getClientIp, sanitizeText } from '@/lib/security/rate-limit';
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
    // 0. DoS and Quota abuse protection: 30 steps/min per IP
    const ip = getClientIp(new Headers(request.headers));
    const rateCheck = checkRateLimit(`interview_step:${ip}`, 30, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes d’entretien. Veuillez patienter un instant.' },
        { status: 429 }
      );
    }

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

    if (candidateAnswer.length > 5000) {
      return NextResponse.json(
        { error: 'Votre réponse est trop volumineuse (maximum 5000 caractères).' },
        { status: 413 }
      );
    }

    // 1. Fetch current session
    const sessionResult = await getInterviewSessionById(sessionId);
    if (sessionResult.error || !sessionResult.data) {
      const isAuth = sessionResult.error?.toLowerCase().includes('authentifié');
      return NextResponse.json(
        { error: sessionResult.error ?? 'Session introuvable.' },
        { status: isAuth ? 401 : 404 }
      );
    }

    const session = sessionResult.data;

    // 2. Build candidate turn
    const candidateTurn: InterviewTurn = {
      id: crypto.randomUUID(),
      role: 'candidate',
      content: sanitizeText(candidateAnswer, 5000),
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
        panel: session.panel ?? undefined,
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
      speaker: stepResult.speaker,
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
