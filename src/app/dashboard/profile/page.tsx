import Link from 'next/link';
import { getCurrentUserProfile } from '@/lib/supabase/profiles';
import ProfileForm from './ProfileForm';

export default async function ProfilePage() {
  const { data: profile, error } = await getCurrentUserProfile();

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Profile Management
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage your personal and professional career information.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-800"
          >
            Back to Dashboard
          </Link>
        </div>

        {error && !profile && (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <ProfileForm initialProfile={profile} />
        </div>
      </div>
    </div>
  );
}
