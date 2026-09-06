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
  const [cookieStore, view] = await Promise.all([cookies(), getDashboardViewData()]);
  const { data, profile } = view;

  // Durable source of truth: the DB flag survives re-logins and reconnections.
  const onboardingCompletedDurably = Boolean(profile?.onboarding_completed_at);
  // Cheap per-browser fast path (set by the completion server action).
  const onboardingSeenCookie = cookieStore.get(ONBOARDING_COOKIE)?.value === '1';

  // Full-screen onboarding wizard: triggered STRICTLY ONCE for brand-new
  // users — when the user has never completed or dismissed the wizard
  // (neither the DB flag nor the cookie is set).
  const showOnboarding =
    !onboardingCompletedDurably && !onboardingSeenCookie;

  // Persistent minimal helper widget — the non-intrusive replacement for the
  // full-screen flow. Shown until the user durably completes the onboarding.
  const showOnboardingAssistant = !onboardingCompletedDurably;

  return (
    <DashboardView
      data={data}
      userName={data.user.name}
      showOnboarding={showOnboarding}
      showOnboardingAssistant={showOnboardingAssistant}
      hasCv={data.cvs.length > 0}
      hasAnalysis={data.cvs.some((cv) => cv.score !== null)}
      profileComplete={!data.isEmptyState}
    />
  );
}