import Link from 'next/link';
import { getCurrentUserProfile } from '@/lib/supabase/profiles';

export default async function DashboardPage() {
  const { data: profile } = await getCurrentUserProfile();

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8 dark:bg-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Welcome to AI Career Coach
            </p>
          </div>
          <Link
            href="/dashboard/profile"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Edit Profile
          </Link>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Profile Overview
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <span className="font-medium text-neutral-500 dark:text-neutral-400">
                Full Name:{' '}
              </span>
              <span className="text-neutral-900 dark:text-neutral-100">
                {profile?.full_name || 'Not set'}
              </span>
            </div>
            <div>
              <span className="font-medium text-neutral-500 dark:text-neutral-400">Headline: </span>
              <span className="text-neutral-900 dark:text-neutral-100">
                {profile?.headline || 'Not set'}
              </span>
            </div>
            <div>
              <span className="font-medium text-neutral-500 dark:text-neutral-400">Bio: </span>
              <p className="mt-1 whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">
                {profile?.bio || 'No bio provided yet.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
