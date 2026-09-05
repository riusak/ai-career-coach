import { DashboardHomeSkeleton } from '@/components/ui/dashboard-skeletons';

/**
 * Chart 4 — instant loading state for the dashboard home segment: shown by
 * the App Router while the (dynamic) view model streams in, on first paint
 * and on every client-side navigation to /dashboard.
 */
export default function Loading() {
  return <DashboardHomeSkeleton />;
}
