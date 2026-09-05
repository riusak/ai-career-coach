'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeft,
  Bell,
  Crown,
  Globe,
  Palette,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { DashboardUser } from '@/types/dashboard';
import { useLocaleSwitcher } from '@/i18n/provider';
import SignOutButton from '@/components/ui/SignOutButton';
import ForProLogo from '@/components/dashboard/ForProLogo';

interface SettingsViewProps {
  user: DashboardUser;
}

/**
 * « Paramètres » — template-styled settings page: profile card, language
 * toggle, notifications & display placeholders, the Upgrade to Pro section
 * (#upgrade anchor used by the sidebar CTA) and sign out.
 */
export default function SettingsView({ user }: SettingsViewProps) {
  const locale = useLocale();
  const router = useRouter();
  const { setLocale } = useLocaleSwitcher();
  const isFrench = locale !== 'en';

  return (
    <div className="flex-1 flex flex-col gap-6 sm:gap-7 pb-16">
      {/* Top Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            id="back-to-dashboard-btn"
            onClick={() => router.push('/dashboard')}
            className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors shadow-2xs flex items-center gap-2 text-xs sm:text-sm font-bold cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
            <span>{isFrench ? 'Retour au Dashboard' : 'Back to Dashboard'}</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-900/5 text-slate-600 border border-slate-200">
              {isFrench ? 'Compte & Préférences' : 'Account & Preferences'}
            </span>
          </div>
        </div>
      </div>

      {/* Page title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {isFrench ? 'Paramètres' : 'Settings'}
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {isFrench
            ? 'Gérez votre compte, votre langue et votre abonnement.'
            : 'Manage your account, language and subscription.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            {isFrench ? 'Profil' : 'Profile'}
          </h3>
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-[#FF7A00]/30"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <User className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">
                {user.title || user.plan}
              </p>
            </div>
            <Link
              href="/dashboard/profile"
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            >
              {isFrench ? 'Modifier' : 'Edit'}
            </Link>
          </div>
        </div>

        {/* Language card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#FF7A00]" />
            {isFrench ? 'Langue' : 'Language'}
          </h3>
          <div className="flex gap-2">
            {(['fr', 'en'] as const).map((code) => (
              <button
                key={code}
                onClick={() => setLocale(code)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  locale === code
                    ? 'bg-[#FF7A00] text-white shadow-sm shadow-orange-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {code === 'fr' ? 'Français' : 'English'}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications & display (placeholders, template structure) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#FF7A00]" />
            {isFrench ? 'Notifications' : 'Notifications'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isFrench
              ? 'Les alertes e-mail et le résumé hebdomadaire arrivent prochainement.'
              : 'Email alerts and the weekly digest are coming soon.'}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#FF7A00]" />
            {isFrench ? 'Apparence' : 'Appearance'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isFrench
              ? 'Le thème clair « Navy & Orange » est appliqué à toute l’application.'
              : 'The light « Navy & Orange » theme is applied across the app.'}
          </p>
        </div>

        {/* Upgrade to Pro (#upgrade anchor) */}
        <div
          id="upgrade"
          className="rounded-3xl bg-[#0B1528] p-6 sm:p-7 border border-slate-800 shadow-md relative overflow-hidden lg:col-span-2"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[#FF7A00]/10 blur-3xl" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#132238] flex items-center justify-center shrink-0">
                <Crown className="w-6 h-6 text-[#FF7A00]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  {isFrench ? 'Passez à ForPro AI Pro' : 'Upgrade to ForPro AI Pro'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-md mt-1">
                  {isFrench
                    ? 'Débloquez des analyses IA avancées, plus de CV, des simulations illimitées et des fonctionnalités premium.'
                    : 'Unlock advanced AI insights, more CVs, unlimited simulations and premium features.'}
                </p>
              </div>
            </div>
            {/* Payments not integrated yet — intentionally inert placeholder. */}
            <div className="shrink-0 flex flex-col items-stretch gap-1.5">
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={isFrench ? 'Le paiement arrive bientôt' : 'Payments coming soon'}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF7A00] text-white font-bold text-sm shadow-sm cursor-not-allowed opacity-80"
              >
                <span>{isFrench ? 'Passer Pro' : 'Upgrade Now'}</span>
              </button>
              <span className="text-center text-[10px] font-bold uppercase tracking-wide text-[#FF9D3F]">
                {isFrench ? 'Bientôt disponible' : 'Coming soon'}
              </span>
            </div>
          </div>
        </div>

        {/* Security & sign out */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 lg:col-span-2">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#FF7A00]" />
            {isFrench ? 'Sécurité & Session' : 'Security & Session'}
          </h3>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {isFrench
                ? 'Déconnectez-vous de votre session ForPro AI sur cet appareil.'
                : 'Sign out of your ForPro AI session on this device.'}
            </p>
            <SignOutButton className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50" />
          </div>
        </div>
      </div>

      {/* Brand footer */}
      <div className="flex items-center justify-center pt-2 opacity-60">
        <ForProLogo variant="contracted" theme="light" size="sm" showText={false} />
      </div>
    </div>
  );
}