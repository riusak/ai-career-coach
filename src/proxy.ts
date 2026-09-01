import type { NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { LOCALE_COOKIE, routing, type AppLocale } from '@/i18n/routing';

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Negotiate the active UI locale for a first visit (no `NEXT_LOCALE` cookie
 * yet) without rewriting the URL.
 *
 * Resolution mirrors `src/i18n/request.ts` (cookie > Accept-Language >
 * default) so the cookie set here is always the one the server later reads:
 *   1. `NEXT_LOCALE` cookie already present & supported → nothing to sync.
 *   2. `Accept-Language` header → first supported tag (region subtag
 *      collapsed, e.g. `en-US` → `en`).
 *   3. Otherwise the default locale handles it server-side.
 *
 * Returns the locale to persist, or `null` when no write is required.
 */
function negotiateLocale(request: NextRequest): AppLocale | null {
  const stored = request.cookies.get(LOCALE_COOKIE)?.value;
  if (stored && (routing.locales as readonly string[]).includes(stored)) {
    return null; // cookie already authoritative
  }

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const candidates = acceptLanguage
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => {
        const [tag, ...params] = entry.split(';');
        const qParam = params.find((p) => p.trim().startsWith('q='));
        const q = qParam ? Number(qParam.trim().split('=')[1]) : 1;
        return { tag, q };
      })
      .sort((a, b) => b.q - a.q);

    const supported = routing.locales as readonly string[];
    for (const { tag } of candidates) {
      const lang = tag.toLowerCase();
      if (supported.includes(lang)) {
        return lang as AppLocale;
      }
      const base = lang.split('-')[0];
      if (base && supported.includes(base)) {
        return base as AppLocale;
      }
    }
  }

  return null;
}

/**
 * ForPro AI proxy (Next.js 16): composes the existing Supabase
 * session/redirect logic with a cookie-only locale handshake.
 *
 *   1. `updateSession` keeps the Supabase cookie jar in sync with the
 *      incoming request and applies the auth-based redirects
 *      (see src/utils/supabase/middleware.ts).
 *   2. A locale cookie is negotiated (cookie > Accept-Language > default)
 *      and attached to the response WITHOUT rewriting the URL.
 *
 *   ⚠️ The path-rewriting `createIntlMiddleware` from next-intl is intentionally
 *   NOT used here: with `localePrefix: 'never'` the App Router routes are
 *   prefix-less (`/`, `/login`, …), but next-intl v4's middleware rewrites
 *   those paths to `/<locale>/<path>` (e.g. `/fr/signup`). The rewritten path
 *   matches no route, so every request returned 404. The locale now lives
 *   purely in the `NEXT_LOCALE` cookie, as routing.ts intends.
 */
export async function proxy(request: NextRequest) {
  // Pass-through 1: Supabase session + auth redirects (preserves the existing
  // behaviour unchanged for /dashboard, /admin, /login, …).
  const supabaseResponse = await updateSession(request);
  if (supabaseResponse.headers.get('location') || supabaseResponse.status >= 300) {
    return supabaseResponse;
  }

  // Pass-through 2: locale cookie sync (no URL rewriting).
  const locale = negotiateLocale(request);
  if (locale) {
    supabaseResponse.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match every request except Next internals, static files, Supabase auth
    // callbacks and any path containing a dot (assets, favicons…).
    '/((?!api|_next/static|_next/image|auth/callback|favicon.ico|.*\\..*).*)',
  ],
};