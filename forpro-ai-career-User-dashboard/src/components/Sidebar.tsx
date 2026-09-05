import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Video,
  TrendingUp,
  Activity,
  Settings,
  Crown,
  ArrowRight,
  User,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../types';
import { ForProLogo } from './ForProLogo';

interface SidebarProps {
  user: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onUpgradeClick: () => void;
  onProfileClick: () => void;
  onToggleState: () => void;
  onStartTourSimulation?: () => void;
  lang?: 'en' | 'fr';
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onUpgradeClick,
  onProfileClick,
  onToggleState,
  onStartTourSimulation,
  lang = 'fr',
}) => {
  const isFrench = lang === 'fr';
  const navItems = [
    { id: 'dashboard', label: isFrench ? 'Tableau de bord' : 'Dashboard', icon: LayoutDashboard },
    { id: 'cvs', label: isFrench ? 'Mes CVs' : 'My CVs', icon: FileText },
    { id: 'matching', label: 'Job Matching', icon: Users },
    { id: 'mock', label: isFrench ? 'Simulations' : 'Mock Interviews', icon: Video },
    { id: 'timeline', label: isFrench ? 'Roadmap Carrière' : 'Career Roadmap', icon: TrendingUp },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'settings', label: isFrench ? 'Paramètres' : 'Settings', icon: Settings },
  ];

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
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#FF7A00] text-white font-bold shadow-sm shadow-orange-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}

          {/* Discrete Demo State Switcher Toggle & 1st Login Simulation */}
          <div className="pt-2 px-1 border-t border-slate-800/60 mt-2 space-y-1.5">
            <button
              id="sidebar-state-toggle-btn"
              onClick={onToggleState}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors border border-dashed border-slate-800 cursor-pointer"
              title="Toggle between Active Profile and Empty State"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className={`w-1.5 h-1.5 rounded-full ${user.isEmptyState ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className="truncate">{user.isEmptyState ? 'Empty State' : 'Active Profile'}</span>
              </span>
              {user.isEmptyState ? (
                <ToggleLeft className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              ) : (
                <ToggleRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </button>

            {onStartTourSimulation && (
              <button
                id="sidebar-tour-sim-btn"
                onClick={onStartTourSimulation}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-amber-300 hover:text-amber-100 hover:bg-amber-950/40 transition-all border border-dashed border-amber-500/40 bg-amber-500/10 cursor-pointer group"
                title="Simuler l'expérience d'une première connexion avec Product Tour"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFA040] fill-[#FFA040] group-hover:scale-110 transition-transform shrink-0" />
                  <span className="truncate">Simuler 1ère Connexion</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 font-bold uppercase tracking-wider shrink-0">
                  Tour
                </span>
              </button>
            )}
          </div>
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
            <h4 className="text-xs font-bold text-white tracking-wide">Upgrade to Pro</h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
            Unlock advanced AI insights, more CVs, and premium features.
          </p>
          <button
            id="upgrade-now-btn"
            onClick={onUpgradeClick}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98] mt-2.5 cursor-pointer"
          >
            <span>Upgrade Now</span>
            <ArrowRight className="w-3 h-3 text-white" />
          </button>
        </div>

        {/* User Profile Pill */}
        <div
          id="user-profile-pill"
          onClick={onProfileClick}
          className="flex items-center justify-between p-2 rounded-xl bg-[#0B1728] border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover ring-1.5 ring-[#FF7A00]/50"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <User className="w-4 h-4" />
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                {user?.name || 'Marius Akolly'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.plan || 'Free Plan'}
              </p>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform" />
        </div>
      </div>
    </aside>
  );
};
