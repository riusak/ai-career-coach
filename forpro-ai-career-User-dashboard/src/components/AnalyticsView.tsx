import React, { useState } from 'react';
import {
  Activity,
  TrendingUp,
  Award,
  Clock,
  Briefcase,
  Flame,
  Zap,
  Target,
  BarChart2,
  ArrowUpRight,
  Lightbulb,
  FileText,
  Users,
  Video,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { getStoredMatches, getStoredSessions } from '../utils/matchingStorage';
import { getStoredCVs } from '../utils/cvStorage';
import { MenuOnboardingGuide } from './MenuOnboardingGuide';

interface AnalyticsViewProps {
  onBackToDashboard: () => void;
  lang?: 'en' | 'fr';
  isEmpty?: boolean;
  onNavigateTab?: (tab: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  onBackToDashboard,
  lang = 'fr',
  isEmpty = false,
  onNavigateTab,
}) => {
  const matches = isEmpty ? [] : getStoredMatches();
  const sessions = isEmpty ? [] : getStoredSessions();
  const cvs = isEmpty ? [] : getStoredCVs();

  // Career stats calculation
  const totalInterviews = sessions.length;
  const totalMatches = matches.length;
  const totalCVs = cvs.length;
  const avgInterviewScore =
    sessions.length > 0
      ? Math.round(sessions.reduce((acc, s) => acc + s.score, 0) / sessions.length)
      : 0;

  // Primary CV score
  const primaryCV = cvs.find((c) => c.isPrimary) || cvs[0];
  const currentATSScore = primaryCV ? primaryCV.score : 0;
  const [showGuide, setShowGuide] = useState(true);

  // Career competencies radar data (only populated when not empty)
  const competencies = isEmpty
    ? []
    : [
        { name: 'System Design & Distributed Architectures', level: 95, category: 'Architecture' },
        { name: 'Event Streaming (Apache Kafka & Outbox)', level: 96, category: 'Backend' },
        { name: 'Cloud Infrastructure & Kubernetes (AWS/EKS)', level: 92, category: 'DevOps' },
        { name: 'Relational DB Tuning & Concurrency (PostgreSQL)', level: 90, category: 'Data' },
        { name: 'Engineering Leadership & Mentoring', level: 88, category: 'Management' },
        { name: 'Fintech Protocols & PCI-DSS Compliance', level: 84, category: 'Security' },
      ];

  // Career Milestones timeline data
  const careerTimeline = isEmpty
    ? []
    : [
        {
          period: '2023 - Aujourd’hui',
          role: 'Senior Software Engineer & Tech Lead',
          company: 'Moov Africa',
          impact: 'Passerelle Mobile Money à 15M+ requêtes/jour. Latence inter-services réduite de 42%.',
          status: 'Actuel',
        },
        {
          period: '2021 - 2023',
          role: 'Tech Lead & Cloud Systems Engineer',
          company: 'GVA Group',
          impact: 'Automatisation Terraform/EKS (déploiements de 3 jours à 25 minutes). Observabilité MTTR -55%.',
          status: 'Complété',
        },
        {
          period: '2019 - 2021',
          role: 'Senior Backend Developer',
          company: 'TogoTech Solutions',
          impact: 'Microservices Java & Python gRPC pour 3M+ utilisateurs mobiles. Optimisation requêtes DB +45%.',
          status: 'Complété',
        },
      ];

  // Interview progression points
  const interviewProgression = isEmpty
    ? []
    : [
        { date: 'Août 2026', title: 'System Design Initial', score: 78, type: 'Technique' },
        { date: '28 Août 2026', title: 'Staff Systems (Paystack)', score: 86, type: 'Audio Pro' },
        { date: '2 Sept. 2026', title: 'Principal Architect (Wave)', score: 91, type: 'Audio Pro' },
      ];

  return (
    <div id="career-analytics-view" className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF7A00]">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {lang === 'fr' ? 'Analytics & Activité Carrière' : 'Career Analytics & Activity'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            {lang === 'fr'
              ? 'Visualisez votre progression professionnelle, l’historique de vos entraînements et la maîtrise de vos compétences clés.'
              : 'Track your career progression, training activity history, and core skills mastery.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            id="analytics-guide-btn"
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/90 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title={lang === 'fr' ? 'Afficher ou masquer le guide de prise en main' : 'Toggle page guide'}
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>
              {showGuide
                ? lang === 'fr'
                  ? 'Masquer guide'
                  : 'Hide guide'
                : lang === 'fr'
                ? '💡 Guide de la page'
                : '💡 Page Guide'}
            </span>
          </button>

          <button
            onClick={onBackToDashboard}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            {lang === 'fr' ? '← Dashboard' : '← Dashboard'}
          </button>
        </div>
      </div>

      {/* Dedicated Contextual Onboarding Guide */}
      {showGuide && (
        <MenuOnboardingGuide
          menu="analytics"
          lang={lang}
          onDismiss={() => setShowGuide(false)}
          onStartGlobalTour={onBackToDashboard}
        />
      )}

      {/* KPI Cards: User Activities & Career Readiness */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Career Experience */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'fr' ? 'Années d’Expérience' : 'Years Experience'}
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {isEmpty ? '0 an' : '8+ Ans'}
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-1">
              {isEmpty ? (
                <span>{lang === 'fr' ? 'Profil débutant / initial' : 'New starter profile'}</span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Niveau Lead / Principal
                </span>
              )}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-[#FF7A00] flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Interview Readiness */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'fr' ? 'Score Entretien Moyen' : 'Avg Interview Score'}
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {isEmpty || avgInterviewScore === 0 ? '--' : `${avgInterviewScore}%`}
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-1">
              {isEmpty || totalInterviews === 0 ? (
                <span>{lang === 'fr' ? '0 simulation passée' : '0 sessions taken'}</span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  +13 pts en 30 jours
                </span>
              )}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Matchings & Offers analyzed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'fr' ? 'Offres Analysées' : 'Offers Matched'}
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalMatches}</h3>
            <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
              {totalMatches === 0
                ? lang === 'fr'
                  ? 'Aucune offre comparée'
                  : 'No matches yet'
                : '91% adéquation moyenne'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Training Activity Streak */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'fr' ? 'Série d’Activité' : 'Active Streak'}
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {isEmpty ? '0 Jour' : '6 Jours'}
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-1">
              {isEmpty ? (
                <span>{lang === 'fr' ? 'Prêt à démarrer' : 'Ready to start'}</span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Entraînement régulier
                </span>
              )}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* CONDITIONAL BODY: Empty State vs Full Visual Analytics */}
      {isEmpty ? (
        /* DEDICATED ELEGANT EMPTY STATE CARD */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xs space-y-8">
          <div className="max-w-xl mx-auto text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-orange-50 border border-orange-200 flex items-center justify-center mx-auto text-[#FF7A00]">
              <BarChart2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              {lang === 'fr'
                ? 'Aucune donnée analytique pour le moment'
                : 'No analytics data yet'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {lang === 'fr'
                ? 'Vos graphiques d’évolution, votre radar de compétences et l’historique de vos entraînements se construiront au fil de vos actions sur ForPro AI.'
                : 'Your career trajectory graphs, competency radar, and interview progress curves will automatically build as you take actions on ForPro AI.'}
            </p>
          </div>

          {/* 3 Activation Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">
                  {lang === 'fr' ? '1. Importer un premier CV' : '1. Upload First CV'}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  {lang === 'fr'
                    ? 'Déclenche l’audit de vos mots-clés et calcule votre conformité algorithmique ATS initiale.'
                    : 'Audits your technical keywords and computes your initial algorithmic ATS score.'}
                </p>
              </div>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('cvs')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer pt-2"
                >
                  <span>{lang === 'fr' ? 'Accéder à Mes CVs' : 'Go to My CVs'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF7A00] flex items-center justify-center mb-3">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">
                  {lang === 'fr' ? '2. Évaluer une offre d’emploi' : '2. Match a Job Offer'}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  {lang === 'fr'
                    ? 'Mesure votre taux d’adéquation technique et enrichit vos métriques de matching.'
                    : 'Gauges your technical fit against market requirements to feed match statistics.'}
                </p>
              </div>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('matching')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#FF7A00] hover:text-orange-700 cursor-pointer pt-2"
                >
                  <span>{lang === 'fr' ? 'Tester le Matching' : 'Try Job Matching'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Video className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">
                  {lang === 'fr' ? '3. Réaliser une simulation vocale' : '3. Take a Mock Interview'}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  {lang === 'fr'
                    ? 'Alimente vos graphiques de progression avec vos premières notes d’élocution et de structure STAR.'
                    : 'Populates your progression graphs with clarity, relevance, and STAR scores.'}
                </p>
              </div>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('mock')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer pt-2"
                >
                  <span>{lang === 'fr' ? 'Lancer un entretien' : 'Start an Interview'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B1528] hover:bg-[#FF7A00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>{lang === 'fr' ? 'Retourner au Tableau de Bord' : 'Return to Dashboard'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* FULL ANALYTICS DATA DASHBOARD */
        <>
          {/* Grid: Career Trajectory & Competencies Mastery */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Competencies Mastery Radar/Bars (6 cols) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <BarChart2 className="w-5 h-5 text-[#FF7A00]" />
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === 'fr' ? 'Maîtrise des Piliers Techniques' : 'Technical Competencies Mastery'}
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-semibold">Évaluation IA continue</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === 'fr'
                  ? 'Niveau évalué à partir de vos réalisations en production, vos certifications et vos réponses lors des simulations audio.'
                  : 'Skill levels assessed from your production achievements, certifications, and live interview responses.'}
              </p>

              <div className="space-y-4 pt-2">
                {competencies.map((comp, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{comp.name}</span>
                      <span className="font-black text-[#FF7A00]">{comp.level}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-linear-to-r from-[#FF7A00] to-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${comp.level}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Points forts : <strong>Systèmes Distribués & Kafka</strong>
                </span>
                <span>
                  Axe prioritaire : <strong>PCI-DSS & FinOps</strong>
                </span>
              </div>
            </div>

            {/* Right: Career Milestones & Experience Progression (6 cols) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-[#FF7A00]" />
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === 'fr' ? 'Trajectoire Professionnelle & Rôles' : 'Career Progression & Milestones'}
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Senior Track
                </span>
              </div>

              <div className="space-y-4 pt-1">
                {careerTimeline.map((item, index) => (
                  <div key={index} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{item.role}</h4>
                        <p className="text-[11px] font-semibold text-[#FF7A00]">{item.company}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-bold">
                        {item.period}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Historical Progression: Interview Simulations & CV ATS evolution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#FF7A00]" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === 'fr' ? 'Historique des Simulations d’Entretiens' : 'Interview Practice History'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'fr'
                      ? 'Évolution de vos performances d’expression, de clarté et de pertinence technique au fil du temps.'
                      : 'Track your delivery, clarity, and technical relevance evolution across simulations.'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {totalInterviews} sessions au total
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {interviewProgression.map((item, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">{item.date}</span>
                    <span className="px-2 py-0.5 rounded bg-orange-100 text-[#FF7A00] font-bold text-[10px]">
                      {item.type}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-slate-900">{item.score}%</span>
                      <span className="text-xs text-emerald-600 font-bold">
                        {i === 0 ? 'Score de base' : `+${item.score - interviewProgression[i - 1].score} pts`}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#FF7A00] h-full rounded-full" style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
