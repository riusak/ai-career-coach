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
