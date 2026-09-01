import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import ProfileForm from './ProfileForm';
import {
  getCurrentUserProfile,
} from '@/lib/supabase/profiles';
import {
  listCertifications,
  listEducations,
  listExperiences,
  listSkills,
} from '@/lib/supabase/profile-extensions';

export default async function ProfilePage() {
  const [t, tNav, profileResult, educationsResult, experiencesResult, skillsResult, certificationsResult] =
    await Promise.all([
      getTranslations('profile'),
      getTranslations('nav'),
      getCurrentUserProfile(),
      listEducations(),
      listExperiences(),
      listSkills(),
      listCertifications(),
    ]);

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy-900">
              {t('title')}
            </h1>
            <p className="mt-1 text-sm text-navy-600">{t('subtitle')}</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-md border border-navy-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-800"
          >
            {tNav('dashboard')}
          </Link>
        </div>

        {profileResult.error && !profileResult.data && (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            {profileResult.error}
          </div>
        )}

        <ProfileForm
          initialProfile={profileResult.data}
          educations={educationsResult.data ?? []}
          experiences={experiencesResult.data ?? []}
          skills={skillsResult.data ?? []}
          certifications={certificationsResult.data ?? []}
        />
      </div>
    </div>
  );
}