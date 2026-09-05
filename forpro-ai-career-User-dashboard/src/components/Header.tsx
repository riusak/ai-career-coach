import React from 'react';
import {
  Bell,
  Crown,
  ArrowRight,
  Globe,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile;
  lang: 'en' | 'fr';
  setLang: (lang: 'en' | 'fr') => void;
  onToggleState: () => void;
  onUpgradeClick: () => void;
  onAddExperienceClick: () => void;
  onNotificationClick: () => void;
  onStartTourSimulation?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  lang,
  setLang,
  onUpgradeClick,
  onAddExperienceClick,
  onNotificationClick,
  onStartTourSimulation,
}) => {
  const isFrench = lang === 'fr';
  const firstName = user.name ? user.name.split(' ')[0] : 'Marius';
  const score = user.isEmptyState ? 0 : (user.profileStrength || 65);

  return (
    <header
      id="dashboard-header"
      className="w-full bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 transition-all"
    >
      <div className="max-w-[1600px] w-full mx-auto">
        {/* Desktop & Tablet Layout (>= sm) */}
        <div className="hidden sm:flex sm:items-center sm:justify-between gap-4">
          {/* Left Welcome Area */}
          <div>
            <h1 className="text-2xl sm:text-[26px] lg:text-[28px] font-black tracking-tight text-slate-900 flex items-center gap-2">
              {user.isEmptyState ? (
                <span>{isFrench ? 'Bienvenue sur ForPro AI' : 'Welcome to ForPro AI'}</span>
              ) : (
                <span>
                  {isFrench
                    ? `Bienvenue, ${firstName} !`
                    : `Welcome back, ${firstName}!`}
                </span>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1 max-w-2xl leading-normal">
              {isFrench
                ? "Construisons votre meilleur avenir professionnel avec l'IA."
                : "Let's build your best career future with AI."}
            </p>
          </div>

          {/* Right Controls (Desktop & Tablet) */}
          <div className="flex items-center gap-3 sm:gap-4 md:gap-5 shrink-0">
            {/* Language Toggle */}
            <button
              id="lang-toggle-btn"
              onClick={() => setLang(isFrench ? 'en' : 'fr')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-all cursor-pointer"
              title="Toggle Language (EN / FR)"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isFrench ? 'FR' : 'EN'}</span>
            </button>

            {/* Tour Guide Simulation Button */}
            {onStartTourSimulation && (
              <button
                id="header-tour-btn"
                onClick={onStartTourSimulation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/90 text-amber-800 font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Lancer le Product Tour & Accueil 1ère connexion"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF7A00] fill-[#FF7A00]" />
                <span className="hidden md:inline">{isFrench ? 'Visite guidée' : 'Product Tour'}</span>
                <span className="md:hidden">{isFrench ? 'Tour' : 'Tour'}</span>
              </button>
            )}

            {/* Upgrade Button */}
            <button
              id="header-upgrade-btn"
              onClick={onUpgradeClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B1528] hover:bg-[#132238] text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Crown className="w-4 h-4 text-[#FF7A00] fill-[#FF7A00]" />
              <span>{isFrench ? 'Passer Pro' : 'Upgrade'}</span>
            </button>

            {/* Notifications Bell */}
            <button
              id="notifications-btn"
              onClick={onNotificationClick}
              className="p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 rounded-full transition-colors relative cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 stroke-[1.8]" />
            </button>

            {/* Profile Strength Widget */}
            <div
              id="profile-strength-widget"
              className="flex items-center gap-3 pl-1"
            >
              {/* Circular Gauge */}
              <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                <svg className="w-11 h-11 -rotate-90">
                  <circle
                    cx="22"
                    cy="22"
                    r="17"
                    stroke="#E2E8F0"
                    strokeWidth="3.5"
                    fill="none"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r="17"
                    stroke={user.isEmptyState ? '#CBD5E1' : '#FF7A00'}
                    strokeWidth="3.5"
                    strokeDasharray={2 * Math.PI * 17}
                    strokeDashoffset={
                      2 * Math.PI * 17 * (1 - score / 100)
                    }
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-700"
                  />
                </svg>
                <span className="absolute text-[11px] font-bold text-slate-800">
                  {score}%
                </span>
              </div>

              <div className="text-left">
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug whitespace-nowrap">
                  {isFrench ? 'Force du profil' : 'Profile Strength'}
                </p>
                <button
                  onClick={onAddExperienceClick}
                  className="text-[11px] sm:text-xs text-slate-500 hover:text-[#FF7A00] font-normal flex items-center gap-1 mt-0.5 group whitespace-nowrap cursor-pointer transition-colors"
                >
                  <span>{isFrench ? 'Compléter votre profil' : 'Complete your profile'}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-slate-400 group-hover:text-[#FF7A00]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout (< sm) */}
        <div className="sm:hidden flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900 truncate">
              {user.isEmptyState ? (
                <span>{isFrench ? 'Bienvenue' : 'Welcome'}</span>
              ) : (
                <span>
                  {isFrench ? `Bienvenue, ${firstName} !` : `Welcome back, ${firstName}!`}
                </span>
              )}
            </h1>

            <div className="flex items-center gap-1 shrink-0">
              {onStartTourSimulation && (
                <button
                  id="mobile-tour-btn"
                  onClick={onStartTourSimulation}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                  title="Product Tour"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FF7A00] fill-[#FF7A00]" />
                  <span>Tour</span>
                </button>
              )}

              <button
                id="mobile-lang-toggle-btn"
                onClick={() => setLang(isFrench ? 'en' : 'fr')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 active:bg-slate-200 transition-colors cursor-pointer"
                title="Toggle Language"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isFrench ? 'FR' : 'EN'}</span>
              </button>

              <button
                id="mobile-notifications-btn"
                onClick={onNotificationClick}
                className="p-1.5 text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-normal leading-relaxed">
            {isFrench
              ? "Construisons votre meilleur avenir professionnel avec l'IA."
              : "Let's build your best career future with AI."}
          </p>

          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-200/70 mt-0.5">
            <div
              onClick={onAddExperienceClick}
              className="flex items-center gap-2 cursor-pointer group min-w-0"
            >
              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <svg className="w-9 h-9 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    stroke="#E2E8F0"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    stroke={user.isEmptyState ? '#CBD5E1' : '#FF7A00'}
                    strokeWidth="3"
                    strokeDasharray={2 * Math.PI * 14}
                    strokeDashoffset={
                      2 * Math.PI * 14 * (1 - score / 100)
                    }
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-700"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-slate-800">
                  {score}%
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {isFrench ? 'Force du profil' : 'Profile Strength'}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddExperienceClick();
                  }}
                  className="text-[10px] text-slate-500 group-hover:text-[#FF7A00] font-medium flex items-center gap-0.5 mt-0.5 transition-colors cursor-pointer"
                >
                  <span className="truncate">{isFrench ? 'Compléter profil' : 'Complete profile'}</span>
                  <ArrowRight className="w-2.5 h-2.5 shrink-0 text-slate-400 group-hover:text-[#FF7A00]" />
                </button>
              </div>
            </div>

            <button
              id="mobile-header-upgrade-btn"
              onClick={onUpgradeClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B1528] active:bg-[#132238] text-white font-bold text-xs shadow-xs shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-[#FF7A00] fill-[#FF7A00]" />
              <span>{isFrench ? 'Passer Pro' : 'Upgrade'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
