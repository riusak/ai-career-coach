import { getTranslations } from 'next-intl/server';
import { getUserResumes } from '@/lib/supabase/resumes';
import { getUserMatchings } from '@/lib/supabase/matchings';
import { parseJobMatchingDetails } from '@/lib/analysis/matching-output';
import type { JobMatchingSummary } from '@/types/matching';
import type { CvSummaryData } from '@/types/dashboard';
import MatchingDashboardView from './MatchingDashboardView';

export async function generateMetadata() {
  const t = await getTranslations('dashboard');
  return { title: `${t('matchingTitle')} | ForPro AI` };
}

/** Light history model — keeps the RSC payload lean (no offer text). */
function buildSummaries(rows: Awaited<ReturnType<typeof getUserMatchings>>['data']): JobMatchingSummary[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    resumeId: row.resume_id,
    jobTitle: row.job_title,
    company: row.company,
    location: row.location,
    matchScore: row.match_score,
    createdAt: row.created_at,
    hasDetails: parseJobMatchingDetails(row.matching_details) !== null,
  }));
}

/** Same shape as the CVs grid cards (no raw text in the payload). */
function buildCvSummaries(
  rows: Awaited<ReturnType<typeof getUserResumes>>['data']
): CvSummaryData[] {
  return (rows ?? []).map((resume) => ({
    id: resume.id,
    name: resume.file_name,
    label: resume.label,
    isPrimary: resume.is_primary,
    createdAt: resume.created_at,
    score: null,
    hasAnalysis: Boolean(resume.parsed_content),
  }));
}

/**
 * Dedicated Job-Matching dashboard page (Phase 5.2 — Step A). Server
 * component: fetches the user's resumes + matching history once and hands a
 * light serializable model to the client studio. The heavy LLM work never
 * happens here — it is queued by a client action and executed by the
 * /api/resume/match worker.
 */
export default async function MatchingPage({
  searchParams,
}: {
  searchParams: Promise<{ queued?: string }>;
}) {
  const [resumesResult, matchingsResult, params] = await Promise.all([
    getUserResumes(),
    getUserMatchings(),
    searchParams,
  ]);

  const cvs = buildCvSummaries(resumesResult.data ?? []);
  const matchings = buildSummaries(matchingsResult.data);
  const queuedMatchingId =
    typeof params.queued === 'string' && params.queued.length > 0 ? params.queued : null;

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <MatchingDashboardView
          cvs={cvs}
          matchings={matchings}
          primaryCvId={cvs.find((cv) => cv.isPrimary)?.id ?? cvs[0]?.id ?? null}
          queuedMatchingId={queuedMatchingId}
        />
      </div>
    </div>
  );
}