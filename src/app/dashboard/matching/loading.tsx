import { CardGridPageSkeleton } from '@/components/ui/dashboard-skeletons';

/** Chart 4 — instant loading state for the Job Matching segment. */
export default function Loading() {
  return <CardGridPageSkeleton cards={3} />;
}
