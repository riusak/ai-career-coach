import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import SignOutButton from '@/components/ui/SignOutButton';
import { getCurrentAdmin } from '@/lib/admin/guard';

export const metadata: Metadata = {
  title: 'Admin Dashboard | AI Career Coach',
  description: 'Administration console for AI Career Coach.',
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
 * this layout performs the strict `profiles.role = 'admin'` check. Authenticated
 * but non-admin users are shown a clear 403 (not silently redirected), so an
 * admin typo or role misconfiguration is immediately visible.
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
      <main className="min-h-screen bg-[#FAFAFA] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
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
              403 — Access denied
            </h1>
            <p className="mt-2 text-slate-600">
              You are authenticated but do not have administrator privileges.{' '}
              The requested area is restricted to platform administrators.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block text-sm font-medium text-gold-700 hover:text-gold-800"
            >
              ← Return to my dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
                <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" />
              </svg>
            </div>
            <Link href="/admin" className="text-lg font-bold tracking-tight text-slate-900">
              Admin Console
            </Link>
          </div>

          <AdminNav />

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-100 text-xs font-semibold text-gold-800">
                {getInitials(admin.fullName)}
              </span>
              <span className="max-w-[10rem] truncate text-sm font-medium text-slate-700">
                {admin.fullName ?? 'Administrator'}
              </span>
            </span>
            <SignOutButton className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-800 disabled:cursor-not-allowed disabled:opacity-50" />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
