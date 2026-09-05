import { ResumeDetailSkeleton } from '@/components/ui/dashboard-skeletons';

/**
 * Chart 4 — instant loading state for the resume detail segment. The skeleton
 * reserves the exact 600px height of the real PDF preview so the swap never
 * shifts the layout.
 */
export default function Loading() {
  return <ResumeDetailSkeleton />;
}
