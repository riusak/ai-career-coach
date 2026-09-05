'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Briefcase, FileText, FolderKanban, GraduationCap, Info, TrendingUp } from 'lucide-react';
import type { ProfileMetrics } from '@/types/dashboard';

interface ProfileOverviewProps {
  score: number;
  isEmpty: boolean;
  metrics: ProfileMetrics;
}

const RING_RADIUS = 44;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * « Aperçu du Profil » — exact port of the template's ProfileOverview.tsx:
 * glowing orange donut, five metric bars and the beige « complétez votre
 * profil » CTA. Metric values are server-computed (0–100), not hardcoded.
 */
export default function ProfileOverview({ score, isEmpty, metrics }: ProfileOverviewProps) {
  const locale = useLocale();
  const router = useRouter();
  const isFrench = locale !== 'en';

  const bars = [
    { label: isFrench ? 'Compétences' : 'Skills', value: metrics.skills, Icon: TrendingUp },
    { label: isFrench ? 'Expérience' : 'Experience', value: metrics.experience, Icon: Briefcase },
    { label: isFrench ? 'Formation' : 'Education', value: metrics.education, Icon: GraduationCap },
    { label: isFrench ? 'Certifications' : 'Certifications', value: metrics.certifications, Icon: FolderKanban },
    { label: isFrench ? 'Qualité CV' : 'Resume Quality', value: metrics.resumeQuality, Icon: FileText },
  ];

  const currentScore = isEmpty ? 0 : Math.max(0, Math.min(100, score));
  const strokeDashoffset = RING_CIRCUMFERENCE - (currentScore / 100) * RING_CIRCUMFERENCE;

  return (
    <div
      id="profile-overview-card"
      className="bg-white rounded-3xl p-4 sm:p-5 xl:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between h-auto lg:h-full relative gap-3.5 sm:gap-4 overflow-hidden"
    >
      <div className="shrink-0">
        <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
          {isFrench ? 'Aperçu du Profil' : 'Profile Overview'}
        </h3>
      </div>

      <div className="flex flex-col @[310px]:flex-row items-center justify-between gap-3.5 sm:gap-4 xl:gap-5 flex-1 my-auto py-1 min-w-0 w-full">
        <div className="relative w-26 h-26 sm:w-27 sm:h-27 xl:w-28 xl:h-28 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
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
              r={RING_RADIUS}
              stroke="#F1F5F9"
              strokeWidth="8.5"
              fill="none"
            />

            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              stroke={isEmpty ? '#CBD5E1' : '#FF7A00'}
              strokeWidth="8.5"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              filter="url(#profileOrangeGlow)"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center select-none pointer-events-none px-1.5">
            <span className="text-[21px] sm:text-[23px] xl:text-2xl font-bold text-slate-900 leading-none tracking-tight">
              {currentScore}%
            </span>
            <span className="text-[9px] sm:text-[9.5px] xl:text-[10px] font-medium text-slate-500 mt-1 whitespace-nowrap leading-none tracking-tight">
              {isFrench ? 'Score Global' : 'Overall Score'}
            </span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-2 sm:space-y-2.5 min-w-0">
          {bars.map((item) => {
            const Icon = item.Icon;
            const displayValue = isEmpty ? 0 : item.value;
            return (
              <div
                key={item.label}
                className="flex flex-col gap-1 min-w-0 group"
                title={`${item.label}: ${displayValue}%`}
              >
                <div className="flex items-center justify-between text-xs min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0 stroke-[2] group-hover:text-[#FF7A00] transition-colors" />
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-800 truncate">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 tabular-nums shrink-0 ml-1">
                    {displayValue}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      isEmpty ? 'bg-slate-300' : 'bg-[#FF7A00] group-hover:bg-[#FF8A1A]'
                    }`}
                    style={{ width: `${displayValue}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 sm:pt-2.5 border-t border-slate-100 shrink-0">
        <div
          onClick={() => router.push('/dashboard/profile')}
          className="p-2.5 sm:p-3 rounded-2xl bg-[#FAF8F5] border border-[#F2EDE4]/80 flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:bg-[#F5F1EB] transition-colors group"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FCEEE1] text-[#FF7A00] flex items-center justify-center shrink-0">
            <Info className="w-3.5 h-3.5 text-[#FF7A00]" />
          </div>

          <p className="text-[11px] sm:text-xs text-slate-700 font-medium leading-snug min-w-0 flex-1">
            {isFrench
              ? 'Complétez votre profil pour obtenir de meilleures correspondances et recommandations IA.'
              : 'Complete your profile to get better matches and AI recommendations.'}
          </p>
        </div>
      </div>
    </div>
  );
}