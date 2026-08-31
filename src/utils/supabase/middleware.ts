import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from '@/utils/supabase/url';
import { resolvePostLoginPath } from '@/lib/auth/post-login';

export async function updateSession(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could cause session desync.
  const {
    data: { user },
  } = await supabase.auth.getUser();

      const { pathname } = request.nextUrl;
  const isProtectedPath =
    pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
  const isAuthPath =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/verify' ||
    pathname === '/forgot-password';

  // NOTE: /reset-password is intentionally NOT an auth path — visitors reach
  // it from the recovery email carrying a recovery session that must be able
  // to set a new password before being bounced anywhere.

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAuthPath && user) {
    // Authenticated users hitting /login (etc.) are sent to their home area:
    // admins go straight to the admin console, everyone else to /dashboard.
    // Reads the caller's OWN profile row, always permitted by the
    // "Users can select own profile" RLS policy (migration 005).
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = (profileRow as { role: string } | null)?.role ?? null;

    const url = request.nextUrl.clone();
    url.pathname = resolvePostLoginPath(role);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
