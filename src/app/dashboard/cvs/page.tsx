import { getTranslations } from 'next-intl/server';
import { buildCvSummaries } from '@/lib/dashboard/adapters';
import { getLatestCompletedAnalysesByResume, getUserResumes } from '@/lib/supabase/resumes';
import CvsManagerView from './CvsManagerView';

export async function generateMetadata() {
  const t = await getTranslations('dashboard');
  return { title: `${t('myResumes')} | ForPro AI` };
}

/**
 * Dedicated CVs management page (template « My CVs » view). Server component:
 * fetches the catalogue + latest completed analyses once and hands a light
 * serializable model to the client grid (no raw text in the payload).
 */
export default async function CvsPage() {
  const [resumesResult, analysesResult] = await Promise.all([
    getUserResumes(),
    getLatestCompletedAnalysesByResume(),
  ]);

  const cvs = buildCvSummaries(resumesResult.data ?? [], analysesResult.data);

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <CvsManagerView cvs={cvs} />
      </div>
    </div>
  );
}