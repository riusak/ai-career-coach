import { NextResponse, type NextRequest } from 'next/server';
import {
  createEducation,
  getCurrentUserProfile,
  listEducations,
} from '@/lib/supabase/profile-extensions';
import type { ProfileEducationInput } from '@/types/profile';

export async function GET() {
  const result = await listEducations();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ educations: result.data ?? [] });
}

export async function POST(request: NextRequest) {
  const { error: authError } = await getCurrentUserProfile();
  if (authError && authError === 'Not authenticated') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<ProfileEducationInput> | null;
  if (!body || typeof body.institution !== 'string' || body.institution.trim().length === 0) {
    return NextResponse.json({ error: 'institution is required' }, { status: 400 });
  }

  const input: ProfileEducationInput = {
    institution: body.institution.trim(),
    degree: body.degree ?? null,
    field_of_study: body.field_of_study ?? null,
    start_date: body.start_date ?? null,
    end_date: body.end_date ?? null,
    is_current: Boolean(body.is_current),
    description: body.description ?? null,
    display_order: typeof body.display_order === 'number' ? body.display_order : 0,
  };

  const result = await createEducation(input);
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error ?? 'Insert failed' }, { status: 400 });
  }
  return NextResponse.json({ education: result.data });
}