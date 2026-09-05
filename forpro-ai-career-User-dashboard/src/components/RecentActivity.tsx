import React from 'react';
import { Upload, CheckCircle2, FileText, ArrowUpRight } from 'lucide-react';
import { ActivityItem } from '../types';

interface RecentActivityProps {
  activities: ActivityItem[];
  lang: 'en' | 'fr';
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities, lang }) => {
  const isFrench = lang === 'fr';

  const defaultItems = [
    {
      id: 'act-1',
      title: isFrench ? 'CV Mis à jour' : 'CV Updated',
      desc: isFrench ? 'Marius_Akolly_CV.pdf (Score ATS 65%)' : 'Uploaded Marius_Akolly_CV.pdf (ATS score 65%)',
      time: isFrench ? 'Il y a 2h' : '2 hours ago',
      icon: Upload,
      bg: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'act-2',
      title: isFrench ? 'Étape Validée' : 'Roadmap Milestone Completed',
      desc: isFrench ? 'Senior Software Engineer chez Moov Africa' : 'Achieved Senior Software Engineer at Moov Africa',
      time: isFrench ? 'Il y a 3j' : '3 days ago',
      icon: CheckCircle2,
      bg: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'act-3',
      title: isFrench ? 'Compétence Ajoutée' : 'New Skill Added',
      desc: isFrench ? 'TypeScript & Cloud Architecture' : 'Added TypeScript and Cloud Architecture',
      time: isFrench ? 'Il y a 1 sem' : '1 week ago',
      icon: FileText,
      bg: 'bg-orange-50 text-[#FF7A00]',
    },
  ];

  return (
    <div
      id="recent-activity-card"
      className="bg-white rounded-3xl p-5 sm:p-6 lg:p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between h-auto lg:h-full gap-4"
    >
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h3 className="font-bold text-slate-900 text-base sm:text-lg">
          {isFrench ? "Activité Récente" : "Recent Activity"}
        </h3>
        <button className="text-xs font-semibold text-[#FF7A00] hover:text-[#E66E00] flex items-center gap-1 group cursor-pointer">
          <span>{isFrench ? "Historique" : "View history"}</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      <div className="space-y-2 flex-1 flex flex-col justify-around my-auto">
        {defaultItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2.5 p-1 rounded-xl hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
              <span className="text-[10px] xl:text-[11px] text-slate-400 shrink-0 font-medium ml-2 whitespace-nowrap">
                {item.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
