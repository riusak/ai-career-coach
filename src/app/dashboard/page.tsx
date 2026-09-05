import { cookies } from 'next/headers';
import { getDashboardViewData } from '@/lib/dashboard/load-dashboard';
import { ONBOARDING_COOKIE } from '@/app/dashboard/onboarding-config';
import DashboardView from '@/components/dashboard/DashboardView';

/**
 * Dashboard (server component): the view model is loaded through the shared,
 * memoized loader (same Supabase roundtrip as the layout) and handed to the
 * template-style client root.
 */
export default async function DashboardPage() {
  const [cookieStore, { data }] = await Promise.all([cookies(), getDashboardViewData()]);

  // First-connection onboarding: only when the dashboard is in its empty
  // state AND the per-browser marker cookie has not been set yet.
  const onboardingSeen = cookieStore.get(ONBOARDING_COOKIE)?.value === '1';

  return (
    <DashboardView
      data={data}
      userName={data.user.name}
      showOnboarding={data.isEmptyState && !onboardingSeen}
    />
  );
}