/**
 * Supabase URL normalization.
 *
 * `NEXT_PUBLIC_SUPABASE_URL` must be the *API root* of the Supabase project,
 * e.g. `https://<project-ref>.supabase.co`. supabase-js appends the service
 * sub-paths itself (`/auth/v1/...`, `/rest/v1/...`, `/storage/v1/...`).
 *
 * A very common misconfiguration is pasting the REST URL returned by
 * `supabase status` (which prints the API URL and the REST URL side by side),
 * or a value carrying a trailing slash. Both produce **doubled / malformed
 * paths** such as `/rest/v1/rest/v1/profiles` or `/rest/v1/auth/v1/token`,
 * which the PostgREST backend rejects with `PGRST125` — *"Invalid path
 * specified in request URL"* — on every database AND auth call
 * (`signUp`, `signInWithPassword`, ...).
 *
 * This module sanitizes the variable once, so the app keeps working no
 * matter how the value was pasted.
 */

/** Service roots that must NOT be part of the project API root URL. */
const SERVICE_ROOT_SEGMENTS = new Set([
  'rest',
  'auth',
  'storage',
  'functions',
  'realtime',
  'graphql',
  'pg',
]);

/**
 * Returns a clean Supabase API root URL (no service sub-path, no trailing
 * slash). Throws when the value is not a valid absolute URL so the app fails
 * loudly instead of silently hitting a bogus endpoint.
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(
      `Invalid NEXT_PUBLIC_SUPABASE_URL: "${trimmed}". Expected an absolute URL such as https://<project-ref>.supabase.co.`
    );
  }

  const segments = url.pathname.split('/').filter(Boolean);

  // No path at all (or just "/"): the URL is already a clean API root.
  if (segments.length === 0) {
    return url.origin;
  }

  // Drop known service sub-paths, including an accidentally doubled or mixed
  // sequence (e.g. /rest/v1/auth/v1, /rest/v1/rest/v1).
  let index = 0;
  while (index < segments.length) {
    const segment = segments[index];
    const next = segments[index + 1];
    if (SERVICE_ROOT_SEGMENTS.has(segment)) {
      index += next === 'v1' ? 2 : 1;
      continue;
    }
    break;
  }

  const leftover = segments.slice(index).join('/');

  url.search = '';
  url.hash = '';
  url.pathname = leftover.length === 0 ? '/' : `/${leftover}`;

  const normalized = url.toString().replace(/\/+$/, '');

  if (index > 0) {
    console.warn(
      `[supabase] NEXT_PUBLIC_SUPABASE_URL contained a service sub-path ("${trimmed}"); normalized to "${normalized}" so auth/PostgREST paths are not doubled.`
    );
  } else if (leftover.length > 0) {
    console.warn(
      `[supabase] NEXT_PUBLIC_SUPABASE_URL has an unexpected path ("${trimmed}"); keeping it as-is.`
    );
  }

  return normalized;
}

/**
 * Shared loading of the Supabase env pair, with the URL sanitized so that a
 * misconfigured `NEXT_PUBLIC_SUPABASE_URL` (service sub-path, trailing slash,
 * whitespace) can never produce PostgREST PGRST125 « Invalid path specified
 * in request URL » errors.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local.'
    );
  }

  return { url: normalizeSupabaseUrl(url), anonKey };
}