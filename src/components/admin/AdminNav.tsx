'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/audit', label: 'Audit log' },
];

/**
 * Admin section navigation. Active state is computed on the client with
 * `usePathname` (the only client necessity), everything else is static.
 */
export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {LINKS.map((link) => {
          const isActive =
            link.href === '/admin'
              ? pathname === '/' || pathname === '/admin' || pathname.startsWith('/admin?')
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          const base =
            'flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap';
          const className = isActive
            ? `${base} border-gold-500 text-gold-800`
            : `${base} border-transparent text-slate-600 hover:border-gold-300 hover:text-gold-800`;

          return (
            <Link key={link.href} href={link.href} className={className}>
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

