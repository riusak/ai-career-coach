import { NextResponse, type NextRequest } from 'next/server';
import {
  deleteProfileBanner,
  getCurrentUserProfile,
  uploadProfileBanner,
} from '@/lib/supabase/profile-extensions';

const MAX_BANNER_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export async function POST(request: NextRequest) {
  const { error: authError } = await getCurrentUserProfile();
  if (authError && authError === 'Not authenticated') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported image type. Use PNG, JPG, or WebP.' },
      { status: 415 }
    );
  }
  if (file.size > MAX_BANNER_BYTES) {
    return NextResponse.json(
      { error: 'File too large. Maximum size: 5 MB.' },
      { status: 413 }
    );
  }

  const result = await uploadProfileBanner(file);
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error ?? 'Upload failed' }, { status: 400 });
  }
  return NextResponse.json({ banner_url: result.data.banner_url });
}

export async function DELETE() {
  const result = await deleteProfileBanner();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}