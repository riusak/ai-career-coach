import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

/**
 * Landing page navigation header — "Light & Gold" aesthetic.
 * Server component: reads the Supabase session to switch authentication
 * actions (Sign In / Get Started) for a Dashboard link when authenticated.
 */

const NAV_LINKS = [
  { href: '#accueil', label: 'Accueil' },
  { href: '#services', label: 'Services' },
  { href: '#billing', label: 'Billing' },
  { href: '#a-propos', label: 'À propos' },
] as const;

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-gold-100 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand */}
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
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
            AI Career Coach
          </Link>
        </div>

        {/* Desktop links */}
        <nav aria-label="Navigation principale" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-gold-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 px-3.5 py-1.5 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600 hover:shadow-md"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 px-3.5 py-1.5 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600 hover:shadow-md"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile links */}
      <nav
        aria-label="Navigation mobile"
        className="flex items-center justify-center gap-5 border-t border-gold-100 px-4 py-2 md:hidden"
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-xs font-medium text-slate-600 transition-colors hover:text-gold-700"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}