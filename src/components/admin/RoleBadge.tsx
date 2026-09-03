import type { UserRole } from '@/types/admin';

interface RoleBadgeProps {
  role: UserRole;
  /** Localized label — defaults to the raw role value when omitted. */
  label?: string;
  size?: 'sm' | 'default';
}

/**
 * Badge indicating a user's authorization role, in "Light & Gold".
 * Admin → gold, regular user → slate.
 */
export default function RoleBadge({ role, label, size = 'default' }: RoleBadgeProps) {
  const isAdmin = role === 'admin';
  const base =
    'inline-flex items-center rounded-full font-semibold ring-1 capitalize';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';
  const style = isAdmin
    ? `${base} ${sizeClass} bg-orange-100 text-orange-800 ring-orange-200`
    : `${base} ${sizeClass} bg-navy-100 text-navy-700 ring-slate-200`;

  return <span className={style}>{label ?? role}</span>;
}
