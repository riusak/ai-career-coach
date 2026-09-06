import { getTranslations } from 'next-intl/server';
import MockInterviewsView from '@/components/dashboard/MockInterviewsView';
import { parseJobMatchingDetails } from '@/lib/analysis/matching-output';
import { getUserInterviewSessions } from '@/lib/supabase/interviews';
import { getUserMatchings } from '@/lib/supabase/matchings';
import { getUserResumes } from '@/lib/supabase/resumes';
import type { JobMatchingSummary } from '@/types/matching';

export async function generateMetadata() {
  const t = await getTranslations('dashboard');
  return { title: `${t('mockInterviews')} | ForPro AI` };
}

/**
 * Light history model — only COMPLETED matchings (match_score set) are
 * « ready for audio interview targeting » in the mock-interview hub. The
 * last 6 evaluated offers keep the hub's section compact (chronological).
 */
function buildCompletedSummaries(
  rows: Awaited<ReturnType<typeof getUserMatchings>>['data']
): JobMatchingSummary[] {
  return (rows ?? [])
    .filter((row) => row.match_score !== null)
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      resumeId: row.resume_id,
      jobTitle: row.job_title,
      company: row.company,
      location: row.location,
      sourceType: row.source_type,
      matchScore: row.match_score,
      createdAt: row.created_at,
      hasDetails: parseJobMatchingDetails(row.matching_details) !== null,
    }));
}

/**
 * « Simulations d'Entretiens IA » page — Chart 9 template-accurate mock
 * interview hub. Server component: fetches the recently evaluated matchings
 * once and hands a light serializable model to the client studio.
 */
export default async function MockPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; cv?: string; company?: string }>;
}) {
  const [params, matchingsResult, interviewsResult, resumesResult] = await Promise.all([
    searchParams,
    getUserMatchings(),
    getUserInterviewSessions(20),
    getUserResumes(),
  ]);

  const rawRole = typeof params.role === 'string' ? params.role.trim() : '';
  const targetRole = rawRole.length > 0 ? rawRole.slice(0, 120) : null;
  const rawCompany = typeof params.company === 'string' ? params.company.trim() : '';
  const targetCompany = rawCompany.length > 0 ? rawCompany.slice(0, 300) : null;
  const targetCv = typeof params.cv === 'string' ? params.cv.trim() : null;

  const matchings = buildCompletedSummaries(matchingsResult.data);
  const pastInterviews = interviewsResult.data ?? [];
  const cvs = (resumesResult.data ?? []).map((r) => ({
    id: r.id,
    name: r.file_name,
    isPrimary: r.is_primary,
  }));

  const primaryCvId = targetCv || cvs.find((c) => c.isPrimary)?.id || cvs[0]?.id || null;

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <MockInterviewsView
          targetRole={targetRole}
          targetCompany={targetCompany}
          targetCvId={primaryCvId}
          cvs={cvs}
          matchings={matchings}
          pastInterviews={pastInterviews}
        />
      </div>
    </div>
  );
}