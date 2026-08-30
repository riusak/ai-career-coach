import Link from 'next/link';
import { getCurrentUserProfile } from '@/lib/supabase/profiles';
import { getUserResumes } from '@/lib/supabase/resumes';
import type { Resume } from '@/types/resume';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function StatCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 text-sm text-slate-900">{children}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const [profileResult, resumesResult] = await Promise.all([
    getCurrentUserProfile(),
    getUserResumes(),
  ]);

  const { data: profile } = profileResult;
  const { data: resumes, error: resumesError } = resumesResult;
  const resumeList: Resume[] = resumes ?? [];
  const primaryResume = resumeList.find((resume) => resume.is_primary) ?? null;
  const latestResume = resumeList[0] ?? null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Welcome to AI Career Coach
            </p>
          </div>
          <Link
            href="/dashboard/resume"
            className="rounded-md bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600 hover:shadow-md"
          >
            Upload Resume
          </Link>
        </div>

        {resumesError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {resumesError}
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="CVs in catalogue">
            <p className="text-2xl font-bold text-slate-900">{resumeList.length}</p>
            <Link
              href="/dashboard/resume"
              className="mt-1 inline-block text-xs font-medium text-gold-700 transition-colors hover:text-gold-800"
            >
              Manage catalogue &rarr;
            </Link>
          </StatCard>

          <StatCard label="Primary CV (⭐)">
            {primaryResume ? (
              <>
                <p className="truncate font-semibold text-slate-900">
                  {primaryResume.label ?? primaryResume.file_name}
                </p>
                <Link
                  href={`/dashboard/resume/${primaryResume.id}`}
                  className="mt-1 inline-block text-xs font-medium text-gold-700 transition-colors hover:text-gold-800"
                >
                  Open preview &rarr;
                </Link>
              </>
            ) : (
              <p className="text-slate-500">
                None defined yet. Upload a CV or pick one in your catalogue.
              </p>
            )}
          </StatCard>

          <StatCard label="Last upload">
            {latestResume ? (
              <>
                <p className="truncate font-semibold text-slate-900">{latestResume.file_name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(latestResume.created_at)}
                </p>
              </>
            ) : (
              <p className="text-slate-500">No resume uploaded yet.</p>
            )}
          </StatCard>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard/resume"
              className="rounded-md bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600 hover:shadow-md"
            >
              Upload a new CV
            </Link>
            <Link
              href={primaryResume ? `/dashboard/resume/${primaryResume.id}` : '/dashboard/resume'}
              className="rounded-md bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600 hover:shadow-md"
            >
              Analyze my primary CV
            </Link>
            <button
              type="button"
              disabled
              title="Available in an upcoming sprint"
              className="cursor-not-allowed rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 opacity-60"
            >
              Compare with a job offer
            </button>
            <button
              type="button"
              disabled
              title="Available in an upcoming sprint"
              className="cursor-not-allowed rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 opacity-60"
            >
              Prepare an interview
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Job matching and interview simulations arrive in the next sprint.
          </p>
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
          {resumeList.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {resumeList.slice(0, 5).map((resume) => (
                <li key={resume.id}>
                  <Link
                    href={`/dashboard/resume/${resume.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-gold-300 hover:bg-gold-50/50"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-slate-900">
                      {resume.is_primary && '⭐ '}
                      {resume.file_name}
                    </span>
                    <span className="ml-4 shrink-0 text-xs text-slate-500">
                      Uploaded {formatDateTime(resume.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No activity yet — upload your first CV to get started.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Profile Overview
            </h2>
            <Link
              href="/dashboard/profile"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-800"
            >
              Edit Profile
            </Link>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <span className="font-medium text-slate-500">
                Full Name:{' '}
              </span>
              <span className="text-slate-900">
                {profile?.full_name || 'Not set'}
              </span>
            </div>
            <div>
              <span className="font-medium text-slate-500">Headline: </span>
              <span className="text-slate-900">
                {profile?.headline || 'Not set'}
              </span>
            </div>
            <div>
              <span className="font-medium text-slate-500">Bio: </span>
              <p className="mt-1 whitespace-pre-wrap text-slate-700">
                {profile?.bio || 'No bio provided yet.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

