import { NextResponse, type NextRequest } from 'next/server';
import {
  deleteExperience,
  getCurrentUserProfile,
  updateExperience,
} from '@/lib/supabase/profile-extensions';
import type { ProfileExperienceInput } from '@/types/profile';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { error: authError } = await getCurrentUserProfile();
  if (authError && authError === 'Not authenticated') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Partial<ProfileExperienceInput> | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const input: Partial<ProfileExperienceInput> = {};
  if (typeof body.company === 'string') input.company = body.company.trim();
  if (typeof body.role === 'string') input.role = body.role.trim();
  if ('description' in body) input.description = body.description ?? null;
  if ('start_date' in body) input.start_date = body.start_date ?? null;
  if ('end_date' in body) input.end_date = body.end_date ?? null;
  if (typeof body.is_current === 'boolean') input.is_current = body.is_current;
  if (typeof body.display_order === 'number') input.display_order = body.display_order;

  const result = await updateExperience(id, input);
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error ?? 'Update failed' }, { status: 400 });
  }
  return NextResponse.json({ experience: result.data });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { error: authError } = await getCurrentUserProfile();
  if (authError && authError === 'Not authenticated') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await context.params;
  const result = await deleteExperience(id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}