import { NextResponse } from 'next/server';
import { generateStarEvaluation } from '@/lib/interview/llm';
import {
  completeInterviewSession,
  getInterviewSessionById,
} from '@/lib/supabase/interviews';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface EvaluateRequestBody {
  sessionId: string;
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Payload invalide.' }, { status: 400 });
    }

    const { sessionId } = body as EvaluateRequestBody;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId est requis.' }, { status: 400 });
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

    // 2. Generate consolidated STAR evaluation
    const starEvaluation = await generateStarEvaluation(
      {
        jobTitle: session.jobTitle,
        company: session.company,
        jobDescription: session.jobDescription,
        language: session.language,
        interviewType: session.interviewType,
      },
      session.transcript
    );

    if (!starEvaluation) {
      return NextResponse.json(
        { error: 'Impossible de générer l’évaluation STAR.' },
        { status: 502 }
      );
    }

    // 3. Mark session completed and persist score & structured evaluation
    const completeResult = await completeInterviewSession(
      session.id,
      starEvaluation.overallScore,
      starEvaluation
    );

    if (completeResult.error || !completeResult.data) {
      return NextResponse.json(
        { error: completeResult.error ?? 'Erreur lors de la clôture de la session.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      score: starEvaluation.overallScore,
      starEvaluation,
      session: completeResult.data,
    });
  } catch (err) {
    console.error('[api/interview/evaluate] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Erreur interne lors de l’évaluation STAR.' },
      { status: 500 }
    );
  }
}
