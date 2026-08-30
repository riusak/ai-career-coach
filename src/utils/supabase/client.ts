import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. Environment variables are inlined by Next.js
 * at build time (NEXT_PUBLIC_*), so a missing value means they were absent
 * when the app was built — fail loudly instead of silently hitting a bogus
 * endpoint (see #debug).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
        'must be set in .env.local before starting the app.'
    );
  }

  return createBrowserClient(url, anonKey);
}
