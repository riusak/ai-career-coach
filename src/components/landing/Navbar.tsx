'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';

/**
 * Floating glassmorphism navbar (BkIt UI / Kokonut UI-inspired): a detached
 * rounded pill that gains depth + blur once the user scrolls, with animated
 * underline links, an orange primary CTA, an animated mobile dropdown, and
 * an inline language switcher (fr / en / de).
 */

const NAV_KEYS = [
  { href: '#accueil', key: 'home' },
  { href: '#services', key: 'services' },
  { href: '#billing', key: 'billing' },
  { href: '#a-propos', key: 'about' },
] as const;

interface NavbarProps {
  isAuthenticated: boolean;
}

export default function Navbar({ isAuthenticated }: NavbarProps) {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const pillTone =
    scrolled || menuOpen
      ? 'border-navy-100/80 bg-white/85 shadow-lg shadow-navy-900/5 backdrop-blur-xl'
      : 'border-white/40 bg-white/55 backdrop-blur-md';

  const ctaClasses =
    'inline-flex items-center gap-1.5 rounded-xl bg-orange px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30';

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <div
        className={`mx-auto max-w-7xl 2xl:max-w-screen-2xl rounded-2xl border transition-all duration-300 ${pillTone}`}
      >
        <div className="flex items-center justify-between px-4 py-2.5 sm:px-5">
          {/* Brand */}
          <Link href="/" className="group flex items-center gap-2.5">
            <Image
              src="/branding/logo-contracted-light.png"
              alt={`${tCommon('appName')} logo`}
              width={36}
              height={36}
              priority
              className="h-9 w-auto rounded-lg object-contain"
            />
            <span className="text-lg font-bold tracking-tight text-navy-900 transition-colors group-hover:text-navy-700">
              {tCommon('appName')}
            </span>
          </Link>

          {/* Desktop links */}
          <nav
            aria-label={t('home')}
            className="hidden items-center gap-8 md:flex"
          >
            {NAV_KEYS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative text-sm font-medium text-navy-600 transition-colors hover:text-navy-900"
              >
                {t(link.key)}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-orange transition-transform duration-300 group-hover:scale-x-100"
                />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LocaleSwitcher />

            {isAuthenticated ? (
              <Link href="/dashboard" className={ctaClasses}>
                {t('dashboard')}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-sm font-medium text-navy-600 transition-colors hover:text-navy-900 sm:block"
                >
                  {t('signIn')}
                </Link>
                <Link href="/signup" className={ctaClasses}>
                  {t('getStarted')}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </>
            )}

            {/* Mobile burger */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-navy-700 transition-colors hover:bg-navy-50 md:hidden"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-5 w-5"
              >
                {menuOpen ? (
                  <path d="M18 6 6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <nav
            aria-label={t('home')}
            className="animate-fade-up border-t border-navy-100/70 px-4 pb-4 pt-2 md:hidden"
          >
            {NAV_KEYS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50 hover:text-navy-900"
              >
                {t(link.key)}
              </Link>
            ))}
            {!isAuthenticated && (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50 hover:text-navy-900"
              >
                {t('signIn')}
              </Link>
            )}
            <p className="mt-2 px-3 text-[10px] uppercase tracking-wide text-navy-400">
              {t('language')} · {locale.toUpperCase()}
            </p>
          </nav>
        )}
      </div>
    </header>
  );
}