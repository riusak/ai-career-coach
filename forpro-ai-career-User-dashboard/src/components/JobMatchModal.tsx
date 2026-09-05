import React from 'react';
import { X, Briefcase, Bell, Sparkles, Check } from 'lucide-react';

interface JobMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'fr';
}

export const JobMatchModal: React.FC<JobMatchModalProps> = ({ isOpen, onClose, lang }) => {
  const isFrench = lang === 'fr';
  const [subscribed, setSubscribed] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div
      id="job-match-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="job-match-modal"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden text-center"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isFrench ? "Bientôt disponible" : "Coming Soon"}</span>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 mx-auto flex items-center justify-center mb-3">
          <Briefcase className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-900">
          {isFrench ? "Job Matching Intelligent" : "Smart Job Matching Engine"}
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
          {isFrench
            ? "Notre algorithme IA analyse votre Roadmap et vous connecte automatiquement avec les offres Tech les plus stimulantes correspondant à vos ambitions."
            : "Our proprietary AI engine scans your ascending roadmap and pairs you with top-tier engineering roles aligned with your career summit."}
        </p>

        <div className="mt-5 pt-4 border-t border-slate-100">
          {subscribed ? (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{isFrench ? "Vous êtes inscrit sur la liste prioritaire !" : "You're on the early access priority list!"}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => setSubscribed(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                <span>{isFrench ? "M'alerter dès l'ouverture" : "Notify Me Upon Launch"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
