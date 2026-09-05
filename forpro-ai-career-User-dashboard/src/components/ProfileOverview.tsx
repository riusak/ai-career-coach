import React from 'react';
import {
  TrendingUp,
  Briefcase,
  GraduationCap,
  FolderKanban,
  FileText,
  Sparkles
} from 'lucide-react';

interface ProfileOverviewProps {
  score: number;
  isEmpty: boolean;
  onCompleteProfile: () => void;
  lang: 'en' | 'fr';
}

export const ProfileOverview: React.FC<ProfileOverviewProps> = ({
  score,
  isEmpty,
  onCompleteProfile,
  lang,
}) => {
  const isFrench = lang === 'fr';

  const metrics = [
    { label: isFrench ? 'Compétences' : 'Skills', value: isEmpty ? 0 : 70, icon: TrendingUp },
    { label: isFrench ? 'Expérience' : 'Experience', value: isEmpty ? 0 : 60, icon: Briefcase },
    { label: isFrench ? 'Formation' : 'Education', value: isEmpty ? 0 : 80, icon: GraduationCap },
    { label: isFrench ? 'Projets' : 'Projects', value: isEmpty ? 0 : 50, icon: FolderKanban },
    { label: isFrench ? 'Qualité CV' : 'Resume Quality', value: isEmpty ? 0 : 65, icon: FileText },
  ];

  const currentScore = isEmpty ? 0 : score;

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (currentScore / 100) * circumference;

  return (
    <div
      id="profile-overview-card"
      className="@container bg-white rounded-3xl p-4 sm:p-5 xl:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between h-auto lg:h-full relative gap-3.5 sm:gap-4 overflow-hidden"
    >
      <div className="shrink-0">
        <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
          {isFrench ? "Aperçu du Profil" : "Profile Overview"}
        </h3>
      </div>

      <div className="flex flex-col @[310px]:flex-row items-center justify-between gap-3.5 sm:gap-4 xl:gap-5 flex-1 my-auto py-1 min-w-0 w-full">
        <div className="relative w-24 h-24 sm:w-26 sm:h-26 xl:w-28 xl:h-28 flex items-center justify-center shrink-0">
          <svg
            className="w-full h-full -rotate-90"
            viewBox="0 0 120 120"
          >
            <defs>
              <filter id="profileOrangeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#FF7A00" floodOpacity="0.35" />
              </filter>
              <filter id="innerDiscAmbientShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.04" />
              </filter>
            </defs>

            <circle
              cx="60"
              cy="60"
              r="39"
              fill="#FFFFFF"
              filter="url(#innerDiscAmbientShadow)"
            />

            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="#F1F5F9"
              strokeWidth="8.5"
              fill="none"
            />

            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke={isEmpty ? '#CBD5E1' : '#FF7A00'}
              strokeWidth="8.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              filter="url(#profileOrangeGlow)"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none px-1">
            <span className="text-2xl sm:text-[25px] font-bold text-slate-900 leading-none tracking-tight">
              {currentScore}%
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-1 whitespace-nowrap tracking-tight">
              {isFrench ? "Score Global" : "Overall Score"}
            </span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-2 sm:space-y-2.5 min-w-0">
          {metrics.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex flex-col gap-1 min-w-0 group"
                title={`${item.label}: ${item.value}%`}
              >
                <div className="flex items-center justify-between text-xs min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0 stroke-[2] group-hover:text-[#FF7A00] transition-colors" />
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-800 truncate">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 tabular-nums shrink-0 ml-1">
                    {item.value}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF7A00] group-hover:bg-[#FF8A1A] rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 sm:pt-2.5 border-t border-slate-100 shrink-0">
        <div
          onClick={onCompleteProfile}
          className="p-2.5 sm:p-3 rounded-2xl bg-[#FAF8F5] border border-[#F2EDE4]/80 flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:bg-[#F5F1EB] transition-colors group"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FCEEE1] text-[#FF7A00] flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 fill-[#FF7A00]/20 text-[#FF7A00]" />
          </div>

          <p className="text-[11px] sm:text-xs text-slate-700 font-medium leading-snug min-w-0 flex-1">
            {isFrench
              ? "Complétez votre profil pour obtenir de meilleures correspondances et recommandations IA."
              : "Complete your profile to get better matches and AI recommendations."}
          </p>
        </div>
      </div>
    </div>
  );
};
