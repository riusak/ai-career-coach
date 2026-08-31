import { createClient } from '@/utils/supabase/server';

/**
 * Central server-side administrator check for the /admin section.
 *
 * Mirrors the SQL `public.is_admin()` helper (migrations 005/006) — i.e. the
 * caller must be authenticated AND own a `profiles` row whose `role` equals
 * 'admin'. The check reads the caller's OWN profile row, which is always
 * visible to them under the "Users can select own profile" RLS policy, so it
 * works even before any admin-read policy is consulted.
 *
 * Every admin server action and every admin data-layer function re-runs this
 * guard (defense in depth): a route that is only "hidden" in the UI is no
 * protection.
 */

export type AdminGuardResult =
  | {
      ok: true;
      userId: string;
      fullName: string | null;
    }
  | { ok: false; reason: 'unauthenticated' | 'forbidden' };

export async function getCurrentAdmin(): Promise<AdminGuardResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, reason: 'unauthenticated' };
    }

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .maybeSingle();

    const profile = data as { id: string; full_name: string | null; role: string } | null;

    if (profileError || !profile || profile.role !== 'admin') {
      return { ok: false, reason: 'forbidden' };
    }

    return { ok: true, userId: user.id, fullName: profile.full_name };
  } catch (err) {
    console.error('[admin] getCurrentAdmin() failed:', (err as Error)?.message);
    return { ok: false, reason: 'forbidden' };
  }
}