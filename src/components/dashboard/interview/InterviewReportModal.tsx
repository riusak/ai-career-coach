'use client';

import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Printer,
  Sparkles,
  Target,
  X,
  XCircle,
} from 'lucide-react';
import type { StarEvaluation } from '@/types/interview';

interface InterviewReportModalProps {
  open: boolean;
  onClose: () => void;
  evaluation: StarEvaluation | null;
  jobTitle: string;
  company?: string | null;
  language?: 'fr' | 'en';
}

function scoreTone(score: number): { bg: string; text: string; ring: string; bar: string } {
  if (score >= 80) {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      ring: 'ring-emerald-300',
      bar: 'bg-emerald-500',
    };
  }
  if (score >= 60) {
    return {
      bg: 'bg-orange-50',
      text: 'text-[#FF7A00]',
      ring: 'ring-orange-300',
      bar: 'bg-[#FF7A00]',
    };
  }
  return {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-300',
    bar: 'bg-rose-500',
  };
}

export default function InterviewReportModal({
  open,
  onClose,
  evaluation,
  jobTitle,
  company,
  language = 'fr',
}: InterviewReportModalProps) {
  const isFrench = language !== 'en';
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);

  if (!open || !evaluation) return null;

  const tone = scoreTone(evaluation.overallScore);

  const starPillars = [
    {
      code: 'S',
      title: isFrench ? 'Situation' : 'Situation',
      score: evaluation.situationScore,
      desc: isFrench ? 'Clarté du contexte et des enjeux' : 'Context and stakes clarity',
    },
    {
      code: 'T',
      title: isFrench ? 'Tâche' : 'Task',
      score: evaluation.taskScore,
      desc: isFrench ? 'Définition de l’objectif et de votre rôle' : 'Goal and role clarity',
    },
    {
      code: 'A',
      title: isFrench ? 'Action' : 'Action',
      score: evaluation.actionScore,
      desc: isFrench ? 'Impact personnel et décisions concrètes ("Je")' : 'Personal impact & concrete actions',
    },
    {
      code: 'R',
      title: isFrench ? 'Résultat' : 'Result',
      score: evaluation.resultScore,
      desc: isFrench ? 'Métriques chiffrées et apprentissages' : 'Quantified metrics & learnings',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-report-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-md sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/20 text-[#FF7A00] border border-orange-500/30">
              <Award className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="interview-report-title" className="text-lg sm:text-xl font-black text-white">
                  {isFrench ? 'Bilan & Diagnostic d’Entretien STAR' : 'STAR Mock Interview Assessment'}
                </h2>
                <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-[11px] font-bold text-[#FF7A00] border border-orange-500/30">
                  {isFrench ? 'Méthode STAR' : 'STAR Method'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {jobTitle} {company ? `• ${company}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="Imprimer le rapport"
              className="rounded-xl p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="rounded-xl p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Score & Verdict Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-5 sm:p-6">
            <div className="flex flex-col items-center justify-center text-center p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isFrench ? 'Score Global' : 'Overall Score'}
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className={`text-4xl sm:text-5xl font-black ${tone.text}`}>
                  {evaluation.overallScore}
                </span>
                <span className="text-base font-semibold text-slate-400">/100</span>
              </div>
              <span
                className={`mt-2 inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tone.bg} ${tone.text} ${tone.ring}`}
              >
                {evaluation.overallScore >= 80
                  ? isFrench ? '🌟 Très convaincant' : '🌟 Highly Convincing'
                  : evaluation.overallScore >= 60
                  ? isFrench ? '👍 Bon potentiel' : '👍 Good Potential'
                  : isFrench ? '⚠️ Perfectionnement requis' : '⚠️ Improvement Needed'}
              </span>
            </div>

            <div className="md:col-span-2 flex flex-col justify-center space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
                {isFrench ? 'Verdict & Impression du Recruteur' : 'Recruiter Impression'}
              </span>
              <blockquote className="text-xs sm:text-sm text-slate-700 italic border-l-3 border-[#FF7A00] pl-3 py-1 leading-relaxed bg-white/60 rounded-r-xl">
                « {evaluation.recruiterVerdict} »
              </blockquote>
            </div>
          </div>

          {/* 4 STAR Pillars Grid */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#FF7A00]" />
              {isFrench ? 'Décomposition de la Maîtrise STAR' : 'STAR Method Breakdown'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {starPillars.map((pillar) => {
                const pTone = scoreTone(pillar.score);
                return (
                  <div
                    key={pillar.code}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-black">
                          {pillar.code}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{pillar.title}</span>
                      </div>
                      <span className={`text-xs font-bold ${pTone.text}`}>{pillar.score}%</span>
                    </div>

                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${pTone.bar} rounded-full transition-all duration-500`}
                        style={{ width: `${pillar.score}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium leading-tight">
                      {pillar.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Weaknesses 2-Column Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 space-y-3">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {isFrench ? 'Points Forts Démontrés' : 'Key Strengths'}
              </h4>
              <ul className="space-y-2">
                {evaluation.strengthsSummary.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-slate-700 font-medium leading-relaxed">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 space-y-3">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                <XCircle className="w-4 h-4 text-amber-600" />
                {isFrench ? 'Axes d’Amélioration Prioritaires' : 'Areas for Improvement'}
              </h4>
              <ul className="space-y-2">
                {evaluation.weaknessesSummary.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-slate-700 font-medium leading-relaxed">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Advice Banner */}
          {evaluation.keyAdvice.length > 0 && (
            <div className="rounded-2xl border border-brand-200/80 bg-brand-50/50 p-5 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#FF7A00]" />
                {isFrench ? 'Conseils Clés pour le Jour J' : 'Actionable Tips for the Real Interview'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {evaluation.keyAdvice.map((advice, index) => (
                  <div key={index} className="bg-white rounded-xl p-3 border border-brand-100 shadow-xs text-xs text-slate-700 font-medium">
                    <span className="font-bold text-[#FF7A00] mr-1">#{index + 1}</span>
                    {advice}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Question-by-Question Accordion */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              {isFrench ? 'Détail Question par Question & Formulations Idéales' : 'Question-by-Question Detailed Feedback'}
            </h3>
            <div className="space-y-2.5">
              {evaluation.questionsFeedback.map((item, index) => {
                const isExpanded = expandedQuestion === index;
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedQuestion(isExpanded ? null : index)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold">
                          {index + 1}
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {item.question}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                          <span>S:{item.situationScore}</span>
                          <span>T:{item.taskScore}</span>
                          <span>A:{item.actionScore}</span>
                          <span>R:{item.resultScore}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4 bg-slate-50/50">
                        {/* What candidate said */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase">
                            {isFrench ? 'Votre réponse donnée :' : 'Your answer:'}
                          </span>
                          <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed italic">
                            « {item.candidateAnswer} »
                          </p>
                        </div>

                        {/* Ideal STAR phrasing recommendation */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-[#FF7A00] uppercase flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
                            {isFrench ? 'Formulation STAR Idéale Recommandée :' : 'Recommended Ideal STAR Phrasing:'}
                          </span>
                          <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-3.5 text-xs text-slate-800 font-medium leading-relaxed">
                            {item.suggestedImprovement}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p className="text-xs text-slate-500 font-medium">
            {isFrench ? 'Ce rapport est archivé dans votre historique.' : 'This report is saved in your history.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            {isFrench ? 'Terminer & Retourner au hub' : 'Finish & Return to Hub'}
          </button>
        </div>
      </div>
    </div>
  );
}
