import { NextResponse } from 'next/server';
import { getInterviewSessionById } from '@/lib/supabase/interviews';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Identifiant de session manquant.' }, { status: 400 });
    }

    const result = await getInterviewSessionById(id);
    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error ?? 'Session introuvable.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session: result.data });
  } catch (err) {
    console.error('[api/interview/session] GET error:', err);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la session.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Payload invalide.' }, { status: 400 });
    }

    const { sessionId, action, message } = body as {
      sessionId?: string;
      action?: 'abandon';
      message?: string;
    };

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId est requis.' }, { status: 400 });
    }

    if (action === 'abandon') {
      const { abandonInterviewSession } = await import('@/lib/supabase/interviews');
      const result = await abandonInterviewSession(sessionId, message);
      if (result.error || !result.data) {
        return NextResponse.json(
          { error: result.error ?? 'Erreur lors de l’interruption de la session.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, session: result.data });
    }

    return NextResponse.json({ error: 'Action non supportée.' }, { status: 400 });
  } catch (err) {
    console.error('[api/interview/session] PATCH error:', err);
    return NextResponse.json(
      { error: 'Erreur interne lors de la mise à jour.' },
      { status: 500 }
    );
  }
}
