/**
 * Shared post-login routing decision.
 *
 * Administrators bypass the standard user dashboard entirely: upon successful
 * sign-in they land directly on the admin console (`/admin`), where the strict
 * `profiles.role = 'admin'` guard applies (see src/lib/admin/guard.ts and
 * src/app/admin/layout.tsx). Everyone else goes to the regular `/dashboard`.
 *
 * Kept as a pure function so both the client login page and the
 * proxy/middleware share the exact same behavior, and so it is unit-testable.
 */

export type PostLoginDestination = '/admin' | '/dashboard';

/** True only for an explicit 'admin' role (anything else falls back to user). */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin';
}

/** Resolves the destination an authenticated user should be sent to after login. */
export function resolvePostLoginPath(role: string | null | undefined): PostLoginDestination {
  return isAdminRole(role) ? '/admin' : '/dashboard';
}
