'use client';

import { Calendar, CheckCircle2, Flag, Layers, Target, X } from 'lucide-react';
import CompanyLogo from '@/components/dashboard/CompanyLogo';
import type { MilestoneData } from '@/types/dashboard';

interface MilestoneModalProps {
  milestone: MilestoneData | null;
  onClose: () => void;
  locale: string;
}

/**
 * Milestone detail popup — exact port of the template's MilestoneModal.tsx:
 * amber top bar, badge icon, missions & technologies, and the ForPro AI
 * alignment footer.
 */
export default function MilestoneModal({ milestone, onClose, locale }: MilestoneModalProps) {
  const isFrench = locale !== 'en';

  if (!milestone) return null;

  return (
    <div
      id="milestone-detail-modal-overlay"
      className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="milestone-detail-modal"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden"
      >
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${
            milestone.isGoal ? 'bg-amber-500' : 'bg-slate-900'
          }`}
        />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {milestone.isGoal ? (
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 font-black text-sm shrink-0">
                <Flag className="w-6 h-6 text-amber-600 fill-amber-500" />
              </div>
            ) : (
              /* Chart 3 — dynamic company logo (Clearbit) with initials fallback. */
              <CompanyLogo company={milestone.company} size="md" shape="rounded" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-slate-900 leading-tight">
                  {milestone.role}
                </h3>
                {milestone.isCurrent && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {isFrench ? 'Actuel' : 'Current'}
                  </span>
                )}
                {milestone.isGoal && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Target className="w-3 h-3 text-amber-600" />
                    {isFrench ? 'Cible / Goal' : 'Target / Goal'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-semibold flex items-center gap-2 mt-0.5">
                {milestone.company && (
                  <>
                    <span>{milestone.company}</span>
                    <span>•</span>
                  </>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {milestone.yearRange}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label={isFrench ? 'Fermer' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-4">
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {milestone.description}
          </p>
        </div>

        <div className="mb-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isFrench ? 'Missions & Réalisations Clés' : 'Key Missions & Impact'}</span>
          </h4>
          <ul className="space-y-2">
            {milestone.keyMissions.map((mission, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{mission}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-5">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {milestone.isGoal
                ? isFrench
                  ? 'Stack cible pour cet objectif'
                  : 'Target stack for this goal'
                : isFrench
                  ? 'Technologies & Compétences'
                  : 'Technologies & Skills'}
            </span>
          </h4>

          {milestone.isGoal ? (
            // Chart 3 / migration 014 — the enriched career-objective baseline
            // (target technologies + target skills) drives the goal detail.
            <div className="space-y-2.5">
              {milestone.targetTechnologies && milestone.targetTechnologies.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {milestone.targetTechnologies.map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              {milestone.targetSkills && milestone.targetSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {milestone.targetSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {(!milestone.targetTechnologies || milestone.targetTechnologies.length === 0) &&
                (!milestone.targetSkills || milestone.targetSkills.length === 0) && (
                  <p className="text-xs text-slate-500">
                    {isFrench
                      ? 'Aucune techno/compétence cible renseignée pour le moment.'
                      : 'No target technologies/skills defined yet.'}
                  </p>
                )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {milestone.technologies.map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Target className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-slate-900">
              {isFrench
                ? 'ForPro AI : Alignement 92% avec les attentes de votre objectif'
                : 'ForPro AI: 92% alignment with your target expectations'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}