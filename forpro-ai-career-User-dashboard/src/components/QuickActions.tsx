import React from 'react';
import {
  FileUp,
  LineChart,
  Briefcase,
  Video,
  Upload,
  Activity,
  Search
} from 'lucide-react';

interface QuickActionsProps {
  onUploadCV: () => void;
  onAnalyseCV: () => void;
  onMatchJobs: () => void;
  onMockInterview: () => void;
  lang: 'en' | 'fr';
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onUploadCV,
  onAnalyseCV,
  onMatchJobs,
  onMockInterview,
  lang,
}) => {
  const isFrench = lang === 'fr';

  const actions = [
    {
      id: 'upload-cv',
      title: isFrench ? 'Téléverser un nouveau CV' : 'Upload Your CV',
      desc: isFrench
        ? "Obtenez une analyse IA et améliorez votre CV instantanément."
        : 'Get AI analysis and improve your CV instantly.',
      btnText: isFrench ? 'Téléverser CV' : 'Upload CV',
      btnIcon: Upload,
      icon: FileUp,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      primaryBtn: true,
      onClick: onUploadCV,
    },
    {
      id: 'analyse-cv',
      title: isFrench ? 'Analyser mon CV' : 'Analyse Your CV',
      desc: isFrench
        ? "Retours IA détaillés pour renforcer et booster votre profil."
        : 'Detailed AI feedback to strengthen your profile.',
      btnText: isFrench ? 'Analyser' : 'Analyse Now',
      btnIcon: Activity,
      icon: LineChart,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      primaryBtn: false,
      onClick: onAnalyseCV,
    },
    {
      id: 'match-jobs',
      title: isFrench ? 'Matcher avec une offre' : 'Match Job Offer',
      desc: isFrench
        ? "Évaluez votre CV face à une offre d'emploi (PDF, Word ou lien URL)."
        : 'Evaluate your CV against any job offer (PDF, Word or URL link).',
      btnText: isFrench ? 'Évaluer une offre' : 'Evaluate Offer',
      btnIcon: Search,
      icon: Briefcase,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-50',
      primaryBtn: false,
      onClick: onMatchJobs,
    },
    {
      id: 'mock-interview',
      title: isFrench ? 'Simulateur d’entretien' : 'Mock Interview',
      desc: isFrench
        ? "Entraînez-vous avec l'IA et réussissez vos entretiens techniques."
        : 'Practice with AI and improve your interview skills.',
      btnText: isFrench ? 'Démarrer' : 'Start Interview',
      btnIcon: Video,
      icon: Video,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      primaryBtn: false,
      onClick: onMockInterview,
    },
  ];

  return (
    <section id="quick-actions-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 shrink-0">
      {actions.map((action) => {
        const Icon = action.icon;
        const BtnIcon = action.btnIcon;
        return (
          <div
            key={action.id}
            id={action.id}
            className="relative bg-white rounded-3xl p-5 sm:p-5.5 lg:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
          >
            <div>
              {/* Icon Container */}
              <div
                className={`w-11 h-11 rounded-2xl ${action.iconBg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200`}
              >
                <Icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>

              {/* Title & Desc */}
              <h3 className="font-bold text-slate-900 text-[15px] sm:text-base mb-1.5">
                {action.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-2">
                {action.desc}
              </p>
            </div>

            {/* Action Button */}
            <div className="pt-4 mt-1">
              <button
                id={`btn-${action.id}`}
                onClick={action.onClick}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all active:scale-98 cursor-pointer ${
                  action.primaryBtn
                    ? 'bg-[#0B1528] hover:bg-[#132238] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <span>{action.btnText}</span>
                <BtnIcon className={`w-3.5 h-3.5 ${action.primaryBtn ? 'text-slate-300' : 'text-slate-600'}`} />
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
};
