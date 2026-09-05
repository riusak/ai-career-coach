import React from 'react';
import {
  Sparkles,
  ArrowRight,
  X,
  Compass,
  LayoutDashboard
} from 'lucide-react';
import { UserProfile } from '../types';

interface FirstLoginWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
  user?: UserProfile;
  userName?: string;
  lang: 'en' | 'fr';
  onNavigateTab?: (tab: string) => void;
}

export const FirstLoginWelcomeModal: React.FC<FirstLoginWelcomeModalProps> = ({
  isOpen,
  onClose,
  onStartTour,
  user,
  userName,
  lang,
}) => {
  if (!isOpen) return null;

  const isFrench = lang === 'fr';
  const resolvedName = user?.name || userName || 'Marius Akolly';
  const firstName = resolvedName.split(' ')[0] || 'Marius';

  return (
    <div
      id="first-login-welcome-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Top Accent Header */}
        <div className="relative bg-linear-to-br from-[#0B1528] via-[#101E35] to-[#1A2A44] text-white p-7 sm:p-8 overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#FF7A00]/20 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title={isFrench ? 'Fermer' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Welcome Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#FFA040] text-xs font-bold mb-4 tracking-wide">
            <Sparkles className="w-3.5 h-3.5 fill-[#FFA040]" />
            <span>{isFrench ? 'Première Connexion' : 'First Login'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isFrench ? `Bienvenue, ${firstName} !` : `Welcome, ${firstName}!`}
          </h2>

          <p className="text-sm text-slate-300 mt-2.5 leading-relaxed">
            {isFrench
              ? 'Ravi de vous compter parmi nous. Votre espace professionnel ForPro AI est configuré et prêt à l’emploi.'
              : 'Delighted to have you with us. Your ForPro AI professional workspace is all set and ready to use.'}
          </p>
        </div>

        {/* Clean, Non-overloaded Explanatory Body */}
        <div className="p-7 sm:p-8 space-y-6">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#FFF9F3] border border-orange-200/70">
            <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center shrink-0 mt-0.5">
              <Compass className="w-5 h-5 text-[#FF7A00]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">
                {isFrench ? 'Visite guidée de votre workspace' : 'Guided workspace tour'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isFrench
                  ? 'Nous allons parcourir ensemble les menus de votre barre latérale pour vous expliquer comment votre espace est constitué et ce que chaque outil vous permet d’accomplir.'
                  : 'We will walk you through the sidebar menus to show you how your workspace is structured and how each tool supports your career progression.'}
              </p>
            </div>
          </div>

          {/* Micro Tour Highlights */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] font-bold text-slate-900">7 Menus</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{isFrench ? 'Expliqués en direct' : 'Explained live'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] font-bold text-slate-900">&lt; 1 min</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{isFrench ? 'Visite express' : 'Quick walkthrough'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] font-bold text-slate-900">Pas à pas</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{isFrench ? 'Sans quitter la page' : 'No page switch'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer text-center"
            >
              {isFrench ? 'Explorer librement' : 'Explore on my own'}
            </button>

            <button
              type="button"
              id="start-tour-from-welcome-btn"
              onClick={onStartTour}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B1528] hover:bg-[#FF7A00] text-white font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer group"
            >
              <span>{isFrench ? 'Commencer la visite' : 'Start Workspace Tour'}</span>
              <ArrowRight className="w-4 h-4 text-orange-300 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
