import Link from 'next/link';
import { getCurrentUserProfile } from '@/lib/supabase/profiles';
import ProfileForm from './ProfileForm';

export default async function ProfilePage() {
  const { data: profile, error } = await getCurrentUserProfile();

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8 dark:bg-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Profile Management
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Manage your personal and professional career information.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            Back to Dashboard
          </Link>
        </div>

        {error && !profile && (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300"
          >
            {error}
          </div>
        )}

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
          <ProfileForm initialProfile={profile} />
        </div>
      </div>
    </div>
  );
}
