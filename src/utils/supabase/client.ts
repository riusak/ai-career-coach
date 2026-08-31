import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from '@/utils/supabase/url';

/**
 * Browser-side Supabase client. Environment variables are inlined by Next.js
 * at build time (NEXT_PUBLIC_*), so a missing value means they were absent
 * when the app was built — fail loudly instead of silently hitting a bogus
 * endpoint (see #debug). The project URL is normalized (service sub-paths and
 * trailing slashes stripped) so a misconfigured NEXT_PUBLIC_SUPABASE_URL can
 * never produce PostgREST "Invalid path specified in request URL" errors.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createBrowserClient(url, anonKey);
}
