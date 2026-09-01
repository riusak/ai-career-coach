import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import SignOutButton from '@/components/ui/SignOutButton';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';
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
  const [tNav, tCommon, profileResult] = await Promise.all([
    getTranslations('nav'),
    getTranslations('common'),
    getCurrentUserProfile(),
  ]);

  const { data: profile, error: profileError } = await profileResult;

  if (!profileError && profile?.role === 'admin') {
    redirect('/admin');
  }

  const displayName = profileError ? tCommon('appName') : (profile?.full_name ?? tCommon('appName'));
  const avatarUrl = profileError ? null : profile?.avatar_url ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg text-navy-900">
      <header className="sticky top-0 z-50 border-b border-navy-100/70 bg-white/75 shadow-sm shadow-navy-900/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Image
              src="/branding/logo-contracted-light.png"
              alt={`${tCommon('appName')} logo`}
              width={32}
              height={32}
              priority
              className="h-8 w-auto rounded-lg object-contain"
            />
            <Link href="/dashboard" className="text-lg font-bold tracking-tight text-navy-900">
              {tCommon('appName')}
            </Link>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-navy-600 transition-colors hover:text-navy-900"
            >
              {tNav('dashboard')}
            </Link>
            <Link
              href="/dashboard/resume"
              className="text-sm font-medium text-navy-600 transition-colors hover:text-navy-900"
            >
              {tNav('myResumes')}
            </Link>
            <Link
              href="/dashboard/profile"
              className="text-sm font-medium text-navy-600 transition-colors hover:text-navy-900"
            >
              {tNav('profile')}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <div className="hidden items-center gap-2 sm:flex">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full border border-navy-100 object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-800">
                  {getInitials(profile?.full_name ?? null)}
                </span>
              )}
              <span className="max-w-[10rem] truncate text-sm font-medium text-navy-700">
                {displayName}
              </span>
            </div>
            <SignOutButton className="rounded-md border border-navy-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-50" />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}