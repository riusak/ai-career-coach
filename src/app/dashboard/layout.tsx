import Link from 'next/link';
import { redirect } from 'next/navigation';
import SignOutButton from '@/components/ui/SignOutButton';
import { getCurrentUserProfile } from '@/lib/supabase/profiles';

/** Builds up-to-two-letter initials from the user's full name. */
function getInitials(fullName: string | null): string {
  if (!fullName) {
    return 'AC';
  }

  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials.length > 0 ? initials : 'AC';
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: profile, error: profileError } = await getCurrentUserProfile();

  // The admin console is a fully separate journey: administrators never see
  // the standard user dashboard. Non-admins keep the regular experience, and
  // /admin itself enforces a strict role check with a 403 for non-admins
  // (see src/app/admin/layout.tsx and src/lib/admin/guard.ts).
  if (!profileError && profile?.role === 'admin') {
    redirect('/admin');
  }

  const displayName = profileError ? 'Account' : (profile?.full_name ?? 'Account');

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-slate-950 shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <Link href="/dashboard" className="text-lg font-bold tracking-tight text-slate-900">
              AI Career Coach
            </Link>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/resume"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              My Resume
            </Link>
            <Link
              href="/dashboard/profile"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Profile
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-100 text-xs font-semibold text-gold-800">
                {getInitials(profile?.full_name ?? null)}
              </span>
              <span className="max-w-[10rem] truncate text-sm font-medium text-slate-700">
                {displayName}
              </span>
            </div>
            <SignOutButton className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-800 disabled:cursor-not-allowed disabled:opacity-50" />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}