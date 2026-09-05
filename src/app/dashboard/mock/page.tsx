import MockInterviewsView from '@/components/dashboard/MockInterviewsView';

/**
 * « Simulations » page — template-styled mock interviews view. Accepts the
 * quick-access context from the dashboard modal (?role=&cv=).
 */
export default async function MockPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; cv?: string }>;
}) {
  const params = await searchParams;
  const rawRole = typeof params.role === 'string' ? params.role.trim() : '';
  const targetRole = rawRole.length > 0 ? rawRole.slice(0, 120) : null;

  return <MockInterviewsView targetRole={targetRole} />;
}