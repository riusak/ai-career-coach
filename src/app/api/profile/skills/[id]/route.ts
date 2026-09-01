import { NextResponse, type NextRequest } from 'next/server';
import { deleteSkill, getCurrentUserProfile } from '@/lib/supabase/profile-extensions';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { error: authError } = await getCurrentUserProfile();
  if (authError && authError === 'Not authenticated') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await context.params;
  const result = await deleteSkill(id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}