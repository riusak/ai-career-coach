import { NextResponse, type NextRequest } from 'next/server';
import {
  createSkill,
  getCurrentUserProfile,
  listSkills,
} from '@/lib/supabase/profile-extensions';
import type { ProfileSkillInput, SkillLevel } from '@/types/profile';

const VALID_LEVELS: readonly SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

export async function GET() {
  const result = await listSkills();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ skills: result.data ?? [] });
}

export async function POST(request: NextRequest) {
  const { error: authError } = await getCurrentUserProfile();
  if (authError && authError === 'Not authenticated') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<ProfileSkillInput> | null;
  if (!body || typeof body.skill_name !== 'string' || body.skill_name.trim().length === 0) {
    return NextResponse.json({ error: 'skill_name is required' }, { status: 400 });
  }
  const level: SkillLevel =
    typeof body.level === 'string' && (VALID_LEVELS as readonly string[]).includes(body.level)
      ? (body.level as SkillLevel)
      : 'intermediate';

  const input: ProfileSkillInput = {
    skill_name: body.skill_name.trim(),
    level,
    category: body.category ?? null,
    display_order: typeof body.display_order === 'number' ? body.display_order : 0,
  };

  const result = await createSkill(input);
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error ?? 'Insert failed' }, { status: 400 });
  }
  return NextResponse.json({ skill: result.data });
}