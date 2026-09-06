import { getDashboardViewData } from '@/lib/dashboard/load-dashboard';
import DashboardView from '@/components/dashboard/DashboardView';

/**
 * Dashboard (server component): the view model is loaded through the shared,
 * memoized loader (same Supabase roundtrip as the layout) and handed to the
 * template-style client root.
 */
export default async function DashboardPage() {
  const view = await getDashboardViewData();
  const { data, profile } = view;

  // Durable source of truth: the DB flag survives re-logins and reconnections.
  // When a new account is created, onboarding_completed_at is null, so onboarding loads reliably.
  const onboardingCompletedDurably = Boolean(profile?.onboarding_completed_at);

  // Full-screen onboarding modal: triggered for users who have not yet completed onboarding.
  const showOnboarding = !onboardingCompletedDurably;

  // Persistent minimal helper widget — shown until the user durably completes the onboarding.
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