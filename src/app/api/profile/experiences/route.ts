import { NextResponse, type NextRequest } from 'next/server';
import {
  createExperience,
  getCurrentUserProfile,
  listExperiences,
} from '@/lib/supabase/profile-extensions';
import type { ProfileExperienceInput } from '@/types/profile';

export async function GET() {
  const result = await listExperiences();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ experiences: result.data ?? [] });
}

export async function POST(request: NextRequest) {
  const { error: authError } = await getCurrentUserProfile();
  if (authError && authError === 'Not authenticated') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<ProfileExperienceInput> | null;
  if (!body || typeof body.company !== 'string' || typeof body.role !== 'string') {
    return NextResponse.json({ error: 'company and role are required' }, { status: 400 });
  }

  const input: ProfileExperienceInput = {
    company: body.company.trim(),
    role: body.role.trim(),
    description: body.description ?? null,
    start_date: body.start_date ?? null,
    end_date: body.end_date ?? null,
    is_current: Boolean(body.is_current),
    display_order: typeof body.display_order === 'number' ? body.display_order : 0,
  };

  const result = await createExperience(input);
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error ?? 'Insert failed' }, { status: 400 });
  }
  return NextResponse.json({ experience: result.data });
}