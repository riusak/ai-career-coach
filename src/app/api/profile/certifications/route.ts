import { NextResponse, type NextRequest } from 'next/server';
import {
  createCertification,
  getCurrentUserProfile,
  listCertifications,
} from '@/lib/supabase/profile-extensions';
import type { ProfileCertificationInput } from '@/types/profile';

export async function GET() {
  const result = await listCertifications();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ certifications: result.data ?? [] });
}

export async function POST(request: NextRequest) {
  const { error: authError } = await getCurrentUserProfile();
  if (authError && authError === 'Not authenticated') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<ProfileCertificationInput> | null;
  if (!body || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const input: ProfileCertificationInput = {
    name: body.name.trim(),
    issuer: body.issuer ?? null,
    issue_date: body.issue_date ?? null,
    expiry_date: body.expiry_date ?? null,
    credential_url: body.credential_url ?? null,
    display_order: typeof body.display_order === 'number' ? body.display_order : 0,
  };

  const result = await createCertification(input);
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error ?? 'Insert failed' }, { status: 400 });
  }
  return NextResponse.json({ certification: result.data });
}