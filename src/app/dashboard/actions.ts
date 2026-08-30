'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

/**
 * Signs the user out of Supabase Auth (clearing the session cookies) and
 * redirects to the login page.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}