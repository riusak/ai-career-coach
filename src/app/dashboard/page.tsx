import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getCurrentUserProfile } from '@/lib/supabase/profiles';
import { getUserResumes } from '@/lib/supabase/resumes';
import { getRoadmap } from '@/lib/supabase/profile-extensions';
import ProfileHeader from '@/components/dashboard/ProfileHeader';
import CareerRoadmap from '@/components/dashboard/CareerRoadmap';
import ActivityStats, { HistoryLog } from '@/components/dashboard/ActivityStats';

export default async function DashboardPage() {
  const [locale, t, tNav, profileResult, resumesResult, roadmapResult] = await Promise.all([
    getLocale(),
    getTranslations('dashboard'),
    getTranslations('nav'),
    getCurrentUserProfile(),
    getUserResumes(),
    getRoadmap(),
  ]);

  const { data: profile } = profileResult;
  const resumes = resumesResult.data ?? [];
  const resumeList = resumes;
  const primaryResume = resumeList.find((resume) => resume.is_primary) ?? null;
  const latestResume = resumeList[0] ?? null;
  const roadmap = roadmapResult.data;
  const fullName = profile?.full_name?.trim() || tNav('dashboard');

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <ProfileHeader
          fullName={fullName}
          headline={profile?.headline ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          bannerUrl={profile?.banner_url ?? null}
        />

        {roadmap && (
          <CareerRoadmap stage={roadmap.stage} progressPercent={roadmap.progress_percent} />
        )}

        <ActivityStats resumes={resumeList} />

        <div className="grid gap-6 lg:grid-cols-2">
          <HistoryLog resumes={resumeList} locale={locale} />

          <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                {t('quickActions')}
              </p>
              <Link
                href="/dashboard/profile"
                className="rounded-md border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-800"
              >
                {t('editProfile')}
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard/resume"
                className="rounded-md bg-orange px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 hover:shadow-md"
              >
                {t('quickUpload')}
              </Link>
              <Link
                href={primaryResume ? `/dashboard/resume/${primaryResume.id}` : '/dashboard/resume'}
                className="rounded-md bg-orange px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 hover:shadow-md"
              >
                {t('quickAnalyze')}
              </Link>
              <button
                type="button"
                disabled
                title={t('quickComingSoon')}
                className="cursor-not-allowed rounded-md border border-navy-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-600 opacity-60"
              >
                {t('quickMatch')}
              </button>
              <button
                type="button"
                disabled
                title={t('quickComingSoon')}
                className="cursor-not-allowed rounded-md border border-navy-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-600 opacity-60"
              >
                {t('quickInterview')}
              </button>
            </div>
            <p className="mt-3 text-xs text-navy-500">{t('quickComingSoon')}</p>
            {latestResume && (
              <p className="mt-4 text-xs text-navy-500">
                {t('statsLast')}: <span className="font-medium text-navy-700">{latestResume.file_name}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}