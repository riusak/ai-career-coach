import { NextResponse } from 'next/server';
import { generateInitialGreeting } from '@/lib/interview/llm';
import {
  createInterviewSession,
  appendInterviewTurns,
} from '@/lib/supabase/interviews';
import type { InitInterviewInput, InterviewTurn } from '@/types/interview';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Payload invalide.' }, { status: 400 });
    }

    const input = body as InitInterviewInput;

    if (!input.resumeId || !input.jobTitle) {
      return NextResponse.json(
        { error: 'resumeId et jobTitle sont obligatoires.' },
        { status: 400 }
      );
    }

    // 1. Create session row
    const createResult = await createInterviewSession(input);
    if (createResult.error || !createResult.data) {
      return NextResponse.json(
        { error: createResult.error ?? 'Échec de création de la session.' },
        { status: 500 }
      );
    }

    const session = createResult.data;

    // 2. Generate initial greeting and Pitch question
    const greeting = await generateInitialGreeting({
      jobTitle: session.jobTitle,
      company: session.company,
      jobDescription: session.jobDescription,
      language: session.language,
      interviewType: session.interviewType,
    });

    const initialTurn: InterviewTurn = {
      id: crypto.randomUUID(),
      role: 'recruiter',
      content: greeting.text,
      emotion: greeting.emotion,
      isFollowup: false,
      stage: 1,
      timestamp: new Date().toISOString(),
    };

    // 3. Persist initial turn
    const appendResult = await appendInterviewTurns(session.id, [initialTurn], 1);
    const finalSession = appendResult.data ?? session;

    return NextResponse.json({
      session: finalSession,
      initialTurn,
    });
  } catch (err) {
    console.error('[api/interview/init] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Erreur interne du serveur lors de l’initialisation.' },
      { status: 500 }
    );
  }
}
