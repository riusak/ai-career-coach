'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Activity,
  ArrowRight,
  ChevronDown,
  Crown,
  FileText,
  LayoutDashboard,
  Settings,
  TrendingUp,
  User,
  Users,
  Video,
} from 'lucide-react';
import type { DashboardUser } from '@/types/dashboard';
import ForProLogo from '@/components/dashboard/ForProLogo';
import SignOutButton from '@/components/ui/SignOutButton';

interface SidebarProps {
  user: DashboardUser;
}

/**
 * « Tableau de bord » shell sidebar — exact port of the template's Sidebar.tsx
 * (bg #0B1528, w-60, full nav, Upgrade to Pro card, user profile pill).
 * The demo-only state toggle / first-login simulator are intentionally removed
 * (the empty/active states are driven by real Supabase data instead).
 */
export default function Sidebar({ user }: SidebarProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const isFrench = locale !== 'en';

  const navItems = [
    { id: 'dashboard', href: '/dashboard', label: isFrench ? 'Tableau de bord' : 'Dashboard', icon: LayoutDashboard },
    { id: 'cvs', href: '/dashboard/cvs', label: isFrench ? 'Mes CVs' : 'My CVs', icon: FileText },
    {
      id: 'matching',
      href: '/dashboard/matching',
      label: isFrench ? "Matching d'offres d'emploi" : 'Job Matching',
      icon: Users,
    },
    { id: 'mock', href: '/dashboard/mock', label: isFrench ? 'Simulations' : 'Mock Interviews', icon: Video },
    { id: 'timeline', href: '/dashboard/timeline', label: isFrench ? 'Roadmap Carrière' : 'Career Roadmap', icon: TrendingUp },
    { id: 'analytics', href: '/dashboard/analytics', label: isFrench ? 'Analyses et Statistiques' : 'Analytics', icon: Activity },
    { id: 'settings', href: '/dashboard/settings', label: isFrench ? 'Paramètres' : 'Settings', icon: Settings },
  ];

  const isActive = (href: string): boolean =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      id="main-sidebar"
      className="w-60 h-screen bg-[#0B1528] text-slate-300 flex flex-col justify-between border-r border-slate-800/80 select-none overflow-hidden"
    >
      {/* Brand Logo Header & Nav */}
      <div className="flex flex-col min-h-0">
        {/* Brand Logo Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-center border-b border-slate-800/60">
          <ForProLogo variant="primary" theme="dark" size="sm" />
        </div>

        {/* Navigation List */}
        <nav className="px-3 py-3 space-y-1 overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                id={`nav-${item.id}`}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-[#FF7A00] text-white font-bold shadow-sm shadow-orange-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
{/* Footer Section: Pro Upgrade Banner + Profile */}
      <div className="p-3.5 space-y-2.5 border-t border-slate-800/80 bg-[#071120]">
        {/* Upgrade Card */}
        <div
          id="upgrade-card"
          className="rounded-2xl bg-[#132238] p-3.5 border border-slate-800/80 shadow-md"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Crown className="w-4 h-4 text-[#FF7A00]" />
            <h4 className="text-xs font-bold text-white tracking-wide">
              {isFrench ? 'Passer Pro' : 'Upgrade to Pro'}
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
            {isFrench
              ? 'Débloquez des analyses IA avancées, plus de CV et des fonctionnalités premium.'
              : 'Unlock advanced AI insights, more CVs, and premium features.'}
          </p>
          {/* Upgrade button redirects to pricing */}
          <Link
            href="/dashboard/pricing"
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#FF7A00] text-white font-bold text-xs shadow-xs mt-2.5 cursor-pointer"
          >
            <span>{isFrench ? 'Passer Pro' : 'Upgrade Now'}</span>
            <ArrowRight className="w-3 h-3 text-white" />
          </Link>
        </div>

        {/* User Profile Pill */}
        <Link
          id="user-profile-pill"
          href="/dashboard/profile"
          className="flex items-center justify-between p-2 rounded-xl bg-[#0B1728] border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-[#FF7A00]/50"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <User className="w-4 h-4" />
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                {user?.name || 'ForPro User'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.plan || (isFrench ? 'Plan gratuit' : 'Free Plan')}
              </p>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform shrink-0" />
        </Link>

        {/* Sign out (functional necessity; template shell is demo-only). */}
        <SignOutButton className="w-full rounded-xl border border-slate-800/80 bg-[#0B1728] px-3 py-2 text-[11px] font-semibold text-slate-400 transition-colors hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50" />
      </div>
    </aside>
  );
}