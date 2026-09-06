import { NextResponse } from 'next/server';
import { generateInitialGreeting } from '@/lib/interview/llm';
import { generateDynamicPanel } from '@/lib/interview/prompts';
import {
  createInterviewSession,
  appendInterviewTurns,
} from '@/lib/supabase/interviews';
import { checkRateLimit, getClientIp, sanitizeText } from '@/lib/security/rate-limit';
import type { InitInterviewInput, InterviewTurn } from '@/types/interview';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // 0. Flood protection: 20 simulation inits per hour per IP
    const ip = getClientIp(new Headers(request.headers));
    const rateCheck = checkRateLimit(`interview_init:${ip}`, 20, 3600_000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de simulations initiées récemment. Veuillez patienter un instant.' },
        { status: 429 }
      );
    }

    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Payload invalide.' }, { status: 400 });
    }

    const rawInput = body as InitInterviewInput;

    if (!rawInput.resumeId || !rawInput.jobTitle) {
      return NextResponse.json(
        { error: 'resumeId et jobTitle sont obligatoires.' },
        { status: 400 }
      );
    }

    const input: InitInterviewInput = {
      ...rawInput,
      jobTitle: sanitizeText(rawInput.jobTitle, 200),
      company: rawInput.company ? sanitizeText(rawInput.company, 200) : undefined,
      jobDescription: rawInput.jobDescription ? sanitizeText(rawInput.jobDescription, 10000) : undefined,
    };

    // 1. Generate dynamic jury panel tailored to the job title and type
    const dynamicPanel = generateDynamicPanel(
      input.jobTitle,
      input.interviewType ?? 'general',
      input.language ?? 'fr'
    );

    // 2. Create session row with panel
    const createResult = await createInterviewSession(input, [], dynamicPanel);
    if (createResult.error || !createResult.data) {
      return NextResponse.json(
        { error: createResult.error ?? 'Échec de création de la session.' },
        { status: 500 }
      );
    }

    const session = createResult.data;

    // 3. Generate initial greeting and Pitch question using the dynamic panel
    const greeting = await generateInitialGreeting({
      jobTitle: session.jobTitle,
      company: session.company,
      jobDescription: session.jobDescription,
      language: session.language,
      interviewType: session.interviewType,
      panel: session.panel ?? dynamicPanel,
    });

    const initialTurn: InterviewTurn = {
      id: crypto.randomUUID(),
      role: 'recruiter',
      content: greeting.text,
      emotion: greeting.emotion,
      speaker: greeting.speaker,
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
