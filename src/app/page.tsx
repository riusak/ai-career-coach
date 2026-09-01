import Landing from '@/components/landing/Landing';
import { createClient } from '@/utils/supabase/server';

/**
 * Landing page server shell: resolves the visitor's auth state and delegates
 * the full render (hero, quick-test funnel, services, pricing, about, footer)
 * to the client-side `<Landing>`, which streams every string through the
 * reactive `LocaleProvider` — switching the language translates the whole
 * page instantly, without a reload (docs/product/mvp.md §2).
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <Landing isAuthenticated={Boolean(user)} />;
}
