import React from 'react';
import { X, Sparkles, Upload, GitBranch, Target, ArrowRight } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
  lang: 'en' | 'fr';
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  isOpen,
  onClose,
  onGetStarted,
  lang,
}) => {
  const isFrench = lang === 'fr';

  if (!isOpen) return null;

  const steps = [
    {
      step: '01',
      title: isFrench ? 'Renseignez votre parcours' : 'Map Your Experiences',
      desc: isFrench
        ? 'Téléversez votre CV existant ou ajoutez vos expériences pour générer instantanément votre roadmap ascendante.'
        : 'Upload your current resume or manually add your milestone roles to generate your ascending career path.',
      icon: Upload,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      step: '02',
      title: isFrench ? 'Diagnostic IA & Comblement de Gap' : 'AI Diagnostic & Gap Analysis',
      desc: isFrench
        ? "Nos modèles analysent vos compétences face aux standards Lead & Staff Architect pour identifier les compétences manquantes."
        : 'Our career AI compares your stack against Lead & Staff Architect expectations to highlight high-leverage growth areas.',
      icon: GitBranch,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    {
      step: '03',
      title: isFrench ? 'Matching & Entraînement Technique' : 'Smart Matching & Drill Simulations',
      desc: isFrench
        ? "Entraînez-vous sur des entretiens système interactifs et connectez-vous avec les opportunités les plus prestigieuses."
        : 'Simulate system design mock interviews with real-time feedback and get matched to high-impact leadership roles.',
      icon: Target,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
  ];

  return (
    <div
      id="how-it-works-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="how-it-works-modal"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden text-left"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="p-1 rounded-md bg-amber-500/20 text-amber-700">
            <Sparkles className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            {isFrench ? 'Méthodologie ForPro AI' : 'ForPro AI Methodology'}
          </span>
        </div>

        <h3 className="text-xl font-black text-slate-900 mb-1">
          {isFrench ? 'Comment fonctionne la plateforme ?' : 'How does ForPro AI work?'}
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          {isFrench
            ? 'Trois étapes simples pour propulser votre carrière technique vers les rôles de direction.'
            : 'Three deliberate steps engineered to accelerate your trajectory to engineering leadership.'}
        </p>

        <div className="space-y-4 mb-6">
          {steps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${st.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 tracking-wider">
                      {st.step}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{st.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-semibold text-xs cursor-pointer"
          >
            {isFrench ? 'Fermer' : 'Close'}
          </button>
          <button
            onClick={() => {
              onClose();
              onGetStarted();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>{isFrench ? 'Commencer maintenant' : 'Get Started Now'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
