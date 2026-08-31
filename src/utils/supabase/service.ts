import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from '@/utils/supabase/url';

/**
 * Server-side Supabase client authenticated with the service-role key.
 *
 * Security contract:
 *  - The service-role key BYPASSES row-level security. It therefore MUST never
 *    be imported from a client component or shipped to the browser. This module
 *    only exists for the admin server actions / server-side admin data layer.
 *  - Every function that uses it must have already verified that the caller is
 *    an administrator (see src/lib/admin/guard.ts) — this client is a powerful
 *    tool, not a shortcut around authorization.
 *  - The extra `typeof window` guard fails loudly (instead of leaking the key)
 *    if a future refactor ever pulls this file into a client bundle.
 *
 * Environment: `SUPABASE_SERVICE_ROLE_KEY` (project API keys, NOT the
 * `NEXT_PUBLIC_` anon key). The URL is normalized with the same logic as the
 * browser/server clients so a misconfigured `NEXT_PUBLIC_SUPABASE_URL` can
 * never produce PostgREST PGRST125 errors.
 */
export function createServiceClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createServiceClient() may only be called on the server.');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Admin server-side operations require SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local (Supabase Dashboard → Settings → API).'
    );
  }

  return createSupabaseClient(normalizeSupabaseUrl(url), serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}