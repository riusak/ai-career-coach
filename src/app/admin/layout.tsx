import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import SignOutButton from '@/components/ui/SignOutButton';
import { getCurrentAdmin } from '@/lib/admin/guard';

export const metadata: Metadata = {
  title: 'Admin Dashboard | ForPro AI',
  description: 'Administration console for ForPro AI.',
};

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

/**
 * Server-side authorization boundary for the /admin section.
 *
 * The proxy/middleware already bounces unauthenticated visitors to /login;
 * this layout performs the strict `profiles.role = 'admin'` check. Renders a
 * fixed vertical sidebar (desktop) / navy top bar with pills (mobile) and lets
 * the content fill the remaining width up to 2xl.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await getCurrentAdmin();

  if (!admin.ok) {
    if (admin.reason === 'unauthenticated') {
      redirect('/login');
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <div className="mb-4 flex justify-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-red-900">
              403 - Access denied
            </h1>
            <p className="mt-2 text-navy-600">
              You are authenticated but do not have administrator privileges. The
              requested area is restricted to platform administrators.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block text-sm font-medium text-orange-700 hover:text-orange-800"
            >
              &larr; Return to my dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-navy-900">
      {/* Mobile: navy top bar + horizontal scrollable nav pills */}
      <div className="sticky top-0 z-50 bg-navy-900 shadow-lg shadow-navy-950/20 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image
              src="/branding/logo-contracted-light.png"
              alt="Logo ForPro AI"
              width={28}
              height={28}
              priority
              className="h-7 w-auto rounded-md object-contain"
            />
            <span className="text-sm font-bold text-white">ForPro AI</span>
            <span className="rounded bg-orange px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Admin
            </span>
          </div>
          <SignOutButton className="rounded-lg border border-white/20 px-2.5 py-1 text-xs font-medium text-navy-200 transition-colors hover:border-orange-400 hover:text-orange-300" />
        </div>
        <AdminNav variant="mobile" />
      </div>

      <div className="md:flex">
        {/* Desktop: fixed vertical sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-navy-900 md:flex">
          <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
            <Image
              src="/branding/logo-contracted-light.png"
              alt="Logo ForPro AI"
              width={32}
              height={32}
              priority
              className="h-8 w-auto rounded-lg object-contain"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">ForPro AI</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-400">
                Admin Console
              </p>
            </div>
          </div>

          <AdminNav variant="sidebar" />

          {/* Admin identity + sign-out pinned to the bottom */}
          <div className="mt-auto border-t border-white/10 p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-xs font-semibold text-orange-300">
                {getInitials(admin.fullName)}
              </span>
              <span className="min-w-0 truncate text-xs font-medium text-white">
                {admin.fullName ?? 'Administrator'}
              </span>
            </div>
            <SignOutButton className="mt-3 w-full rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-navy-200 transition-colors hover:border-orange-400 hover:text-orange-300" />
          </div>
        </aside>

        {/* Scrollable content — fills the remaining width up to 2xl */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
