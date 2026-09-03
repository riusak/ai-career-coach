'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ComponentType, ReactNode } from 'react';

const OverviewIcon = (): ReactNode => (
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
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

const UsersIcon = (): ReactNode => (
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
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const AuditIcon = (): ReactNode => (
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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

type NavEntry = {
  href: string;
  key: string;
  Icon: ComponentType;
};

/** Nav labels are resolved through next-intl (admin.nav.*). */
const NAV_ENTRIES: ReadonlyArray<NavEntry> = [
  { href: '/admin', key: 'overview', Icon: OverviewIcon },
  { href: '/admin/users', key: 'users', Icon: UsersIcon },
  { href: '/admin/audit', key: 'audit', Icon: AuditIcon },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/admin'
    ? pathname === '/admin'
    : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Admin section navigation — two responsive variants:
 *  - `sidebar`: vertical rail for the fixed left sidebar (desktop);
 *  - `mobile`: horizontal scrollable pills under the mobile top bar.
 * Active state is computed on the client with `usePathname`.
 */
export default function AdminNav({ variant }: { variant: 'sidebar' | 'mobile' }) {
  const pathname = usePathname();
  const t = useTranslations('admin.nav');
  const links = NAV_ENTRIES.map(({ href, key, Icon }) => ({
    href,
    label: t(key),
    icon: <Icon />,
  }));

  if (variant === 'mobile') {
    return (
      <nav aria-label="Navigation admin" className="flex items-center gap-2 overflow-x-auto px-4 pb-3">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-orange text-white shadow-md shadow-orange-500/25'
                  : 'bg-white/10 text-navy-200 hover:bg-white/15 hover:text-white'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Navigation admin" className="flex-1 space-y-1 px-3 py-4">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-white/10 text-white'
                : 'text-navy-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            {/* Active orange indicator */}
            <span
              aria-hidden="true"
              className={`absolute left-0 h-5 w-1 rounded-r-full bg-orange transition-opacity ${
                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
              }`}
            />
            <span className={active ? 'text-orange-400' : ''}>{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
