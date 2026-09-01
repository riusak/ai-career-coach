import { NextResponse } from 'next/server';
import { getCurrentUserProfile, getRoadmap, recomputeRoadmap } from '@/lib/supabase/profile-extensions';

export async function GET() {
  const { error: authError } = await getCurrentUserProfile();
  if (authError && authError === 'Not authenticated') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const result = await getRoadmap();
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error ?? 'Not found' }, { status: 400 });
  }
  return NextResponse.json({ roadmap: result.data });
}

export async function POST() {
  const { error: authError } = await getCurrentUserProfile();
  if (authError && authError === 'Not authenticated') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const result = await recomputeRoadmap();
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error ?? 'Recompute failed' }, { status: 400 });
  }
  return NextResponse.json({ roadmap: result.data });
}