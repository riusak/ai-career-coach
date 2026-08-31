'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface SignOutButtonProps {
  className?: string;
}

/**
 * Client-side sign-out control shared by the user dashboard and the admin
 * console.
 *
 * 1. Executes `supabase.auth.signOut()` — revokes the session on the Auth
 *    backend and clears the auth cookies.
 * 2. Performs a HARD navigation to the public landing page (`/`) via
 *    `window.location.href`, which fully discards the Next.js client router
 *    cache and any cached server-rendered session state (a server-action
 *    `redirect()` could not guarantee that).
 */
export default function SignOutButton({ className }: SignOutButtonProps) {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // The Auth backend may be unreachable — still send the user to the
      // public landing page; the auth proxy will treat them as signed out
      // once the cookies are cleared.
    } finally {
      // Hard navigation is intentional here: it fully discards the Next.js
      // client router cache and any cached server-rendered session state,
      // which a client-side router.push() could leave behind.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/';
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      className={className}
    >
      {signingOut ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
