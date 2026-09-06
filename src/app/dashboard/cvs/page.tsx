import { getTranslations } from 'next-intl/server';
import { buildCvDetails } from '@/lib/dashboard/adapters';
import {
  getLatestCompletedAnalysesByResume,
  getResumeFileSizes,
  getUserResumes,
} from '@/lib/supabase/resumes';
import ErrorState from '@/components/ui/ErrorState';
import CvsManagerView from './CvsManagerView';

export async function generateMetadata() {
  const t = await getTranslations('dashboard');
  return { title: `${t('myResumes')} | ForPro AI` };
}

/**
 * « Mes CVs Professionnels » — the CV library page (template « My CVs » view).
 * Server component: fetches the catalogue, the latest completed analyses and
 * the storage file sizes once, then hands a light serializable model (no raw
 * text in the card payload except the truncated preview) to the client grid.
 * All rendering/mutations live in CvsManagerView (native preview modal, no
 * standalone detail route).
 */
export default async function CvsPage() {
  const [tCommon, resumesResult, analysesResult, fileSizes] = await Promise.all([
    getTranslations('common'),
    getUserResumes(),
    getLatestCompletedAnalysesByResume(),
    getResumeFileSizes(),
  ]);

  if (resumesResult.error) {
    return (
      <div className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ErrorState title={tCommon('errorGeneric')} description={resumesResult.error}>
            <a
              href="/dashboard/cvs"
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
            >
              {tCommon('retry')}
            </a>
          </ErrorState>
        </div>
      </div>
    );
  }

  const cvs = buildCvDetails(resumesResult.data ?? [], analysesResult.data, fileSizes);

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <CvsManagerView cvs={cvs} />
      </div>
    </div>
  );
}