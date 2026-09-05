import React from 'react';
import { X, Crown, Check } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'fr';
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, lang }) => {
  const isFrench = lang === 'fr';

  if (!isOpen) return null;

  const features = [
    isFrench ? "Analyses de CV illimitées propulsées par IA" : "Unlimited AI-powered CV diagnostics",
    isFrench ? "Roadmap d'accession au poste Lead / Staff Architect" : "Personalized Lead & Staff Architect career pathway",
    isFrench ? "Simulateur d'entretiens techniques illimité" : "Unlimited interactive AI mock interview drills",
    isFrench ? "Matching prioritaire avec les recruteurs partenaires" : "Direct priority matching with premium tech hiring leads",
    isFrench ? "Benchmarking salarial mondial en temps réel" : "Global real-time salary & equity compensation benchmarks"
  ];

  return (
    <div
      id="upgrade-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="upgrade-modal"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden text-center"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 mx-auto flex items-center justify-center mb-4">
          <Crown className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-900">
          {isFrench ? "Passez à ForPro AI Pro" : "Upgrade to ForPro AI Pro"}
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          {isFrench
            ? "Accélérez votre trajectoire de carrière vers le sommet technique."
            : "Supercharge your career velocity to principal leadership roles."}
        </p>

        <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5">
          {features.map((feat, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
              <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all active:scale-98 cursor-pointer"
        >
          {isFrench ? "Commencer l'essai de 14 jours" : "Start 14-Day Free Pro Trial"}
        </button>
      </div>
    </div>
  );
};
