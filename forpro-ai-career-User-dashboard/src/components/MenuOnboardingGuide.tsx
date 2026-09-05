import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  X,
  ArrowRight,
  Lightbulb,
  FileText,
  Upload,
  Link as LinkIcon,
  Video,
  Mic,
  BarChart2,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronUp,
  Compass
} from 'lucide-react';

export type MenuType = 'matching' | 'mock' | 'cvs' | 'timeline' | 'analytics' | 'settings';

interface MenuOnboardingGuideProps {
  menu: MenuType;
  lang?: 'en' | 'fr';
  onDismiss?: () => void;
  onStartGlobalTour?: () => void;
}

interface StepDetail {
  number: string;
  title: string;
  desc: string;
  badge?: string;
}

interface GuideContent {
  tag: string;
  title: string;
  subtitle: string;
  steps: StepDetail[];
  proTip: string;
}

export const MenuOnboardingGuide: React.FC<MenuOnboardingGuideProps> = ({
  menu,
  lang = 'fr',
  onDismiss,
  onStartGlobalTour,
}) => {
  const isFrench = lang === 'fr';
  const [isCollapsed, setIsCollapsed] = useState(false);

  const guideData: Record<MenuType, GuideContent> = {
    matching: {
      tag: isFrench ? 'GUIDE DE PRISE EN MAIN • JOB MATCHING' : 'QUICK START GUIDE • JOB MATCHING',
      title: isFrench
        ? "Comment évaluer votre CV face à une offre d'emploi ?"
        : 'How to match your CV against any job offer?',
      subtitle: isFrench
        ? "Mesurez votre compatibilité technique en 3 étapes simples et lancez un entraînement ciblé."
        : 'Measure your technical compatibility in 3 steps and trigger targeted practice.',
      steps: [
        {
          number: '1',
          title: isFrench ? '1. Sélectionnez votre CV' : '1. Select your target CV',
          desc: isFrench
            ? 'Choisissez votre CV de référence (ex. Architecte Cloud) parmi vos versions enregistrées.'
            : 'Pick your benchmark CV (e.g. Cloud Architect) from your stored versions.',
          badge: isFrench ? 'Sélection' : 'Selection',
        },
        {
          number: '2',
          title: isFrench ? "2. Déposez l'offre d'emploi" : '2. Upload or paste job offer',
          desc: isFrench
            ? "Glissez un fichier PDF ou Word (DOCX), ou collez directement le lien URL LinkedIn / site carrière."
            : 'Drag & drop a PDF/Word file, or paste a LinkedIn or career site URL.',
          badge: isFrench ? 'PDF / Word / URL' : 'PDF / Word / URL',
        },
        {
          number: '3',
          title: isFrench ? "3. Diagnostic & Simulation" : '3. Diagnosis & Simulation',
          desc: isFrench
            ? "Découvrez votre score d'adéquation et cliquez sur « Lancer une simulation d'entretien pour cette offre »."
            : 'Get your compatibility breakdown and click "Launch interview simulation for this offer".',
          badge: isFrench ? 'Passerelle Entretien' : 'Interview Bridge',
        },
      ],
      proTip: isFrench
        ? "L'analyse IA identifie les mots-clés obligatoires manquants et pondère les écarts de séniorité pour maximiser vos chances."
        : 'The AI model spots missing core keywords and weights seniority gaps to maximize your callback rate.',
    },
    mock: {
      tag: isFrench ? 'GUIDE DE PRISE EN MAIN • SIMULATIONS D’ENTRETIENS' : 'QUICK START GUIDE • MOCK INTERVIEWS',
      title: isFrench
        ? "Comment réussir votre simulation d'entretien vocal IA ?"
        : 'How to ace your AI voice mock interview session?',
      subtitle: isFrench
        ? "Entraînez-vous à l'oral en conditions réelles et recevez un feedback méthodologique STAR complet."
        : 'Practice speaking under real conditions and receive thorough STAR structured feedback.',
      steps: [
        {
          number: '1',
          title: isFrench ? "1. Choisissez l'offre ciblée" : '1. Choose target job offer',
          desc: isFrench
            ? "Sélectionnez une offre récemment matchée (ex. Wave, Paystack) ou uploadez-en une directement."
            : 'Select a recently matched offer or upload a new job ad directly.',
          badge: isFrench ? 'Offre ciblée' : 'Target Offer',
        },
        {
          number: '2',
          title: isFrench ? "2. Activez le mode Audio & Langue" : '2. Activate Audio & Language',
          desc: isFrench
            ? "Choisissez le Français ou l'Anglais, écoutez les questions posées à haute voix et parlez au micro."
            : 'Select French or English, listen to verbal questions, and respond with your microphone.',
          badge: isFrench ? 'Audio & Voix' : 'Audio & Voice',
        },
        {
          number: '3',
          title: isFrench ? "3. Débriefing STAR & Conseils" : '3. STAR Debrief & Advice',
          desc: isFrench
            ? "Obtenez un score chiffré (Clarté, Profondeur technique) et des axes de reformulation concrets."
            : 'Get a clear numeric score (Clarity, Technical depth) and concrete rephrasing tips.',
          badge: isFrench ? 'Feedback IA' : 'AI Feedback',
        },
      ],
      proTip: isFrench
        ? "Structurez vos réponses orales selon la méthode STAR (Situation, Tâche, Action, Résultat chiffré) pour obtenir plus de 90/100."
        : 'Structure spoken answers using the STAR method (Situation, Task, Action, Result) to score above 90/100.',
    },
    cvs: {
      tag: isFrench ? 'GUIDE DE PRISE EN MAIN • GESTIONNAIRE DE CVS' : 'QUICK START GUIDE • CV MANAGER',
      title: isFrench
        ? "Comment optimiser et gérer vos différentes versions de CV ?"
        : 'How to manage and optimize your CV versions?',
      subtitle: isFrench
        ? "Passez les filtres ATS et adaptez votre profil selon les postes visés."
        : 'Pass recruiter ATS filters and tailor your profile for target opportunities.',
      steps: [
        {
          number: '1',
          title: isFrench ? '1. Importez vos CVs' : '1. Upload your CVs',
          desc: isFrench
            ? 'Glissez vos fichiers PDF ou Word (.docx). Notre parser extrait automatiquement votre historique.'
            : 'Drop your PDF or Word (.docx) files. Our parser extracts your history automatically.',
          badge: isFrench ? 'Parsing' : 'Parsing',
        },
        {
          number: '2',
          title: isFrench ? '2. Audit ATS & Lisibilité' : '2. ATS Audit & Readability',
          desc: isFrench
            ? 'Visualisez votre note de compatibilité (ex. 88%), les forces détectées et les compétences à valoriser.'
            : 'Review your ATS score (e.g. 88%), recognized strengths, and highlighted skills.',
          badge: isFrench ? 'Score ATS' : 'ATS Score',
        },
        {
          number: '3',
          title: isFrench ? '3. CV Principal & Actions' : '3. Primary CV & Actions',
          desc: isFrench
            ? 'Définissez votre CV principal en 1 clic pour préremplir le Job Matching et vos simulations d’entretien.'
            : 'Set your primary CV with 1 click to pre-fill Job Matching and mock interview sessions.',
          badge: isFrench ? 'CV Principal' : 'Primary CV',
        },
      ],
      proTip: isFrench
        ? "Un CV au score ATS supérieur à 85% garantit que les robots de recrutement ne rejetteront pas votre dossier."
        : 'An ATS score above 85% ensures applicant tracking robots will never filter out your application.',
    },
    timeline: {
      tag: isFrench ? 'GUIDE DE PRISE EN MAIN • ROADMAP DE CARRIÈRE' : 'QUICK START GUIDE • CAREER ROADMAP',
      title: isFrench
        ? "Comment valoriser et projeter votre parcours professionnel ?"
        : 'How to showcase and project your career roadmap?',
      subtitle: isFrench
        ? "Retracez vos 8+ années d'évolution technique et visualisez vos prochains jalons de leadership."
        : 'Trace your 8+ years technical ascent and visualize upcoming leadership milestones.',
      steps: [
        {
          number: '1',
          title: isFrench ? '1. Rétrospective 8+ ans' : '1. 8+ Years Retrospective',
          desc: isFrench
            ? 'Consultez le fil chronologique de vos expériences passées (TogoTech, GVA, Moov Africa).'
            : 'Review the chronological timeline of your previous roles and achievements.',
          badge: isFrench ? 'Historique' : 'History',
        },
        {
          number: '2',
          title: isFrench ? '2. Enrichissez vos jalons' : '2. Add new milestones',
          desc: isFrench
            ? 'Ajoutez vos certifications récentes (AWS, Kubernetes) ou vos projets d’architecture majeurs.'
            : 'Add recent certifications (AWS, Kubernetes) or major architecture deliverables.',
          badge: isFrench ? 'Certifications' : 'Certifications',
        },
        {
          number: '3',
          title: isFrench ? '3. Objectif Staff / Principal' : '3. Target Staff / Principal',
          desc: isFrench
            ? 'Découvrez les compétences clés recommandées pour franchir le cap de Lead vers Staff Architect.'
            : 'Discover recommended competencies to make the leap from Lead to Staff Architect.',
          badge: isFrench ? 'Objectif Pro' : 'Pro Goal',
        },
      ],
      proTip: isFrench
        ? "Indiquez toujours des métriques d'impact chiffrées (millions d'utilisateurs, temps de latence réduit, économies Cloud)."
        : 'Always include measurable impact metrics (millions of users, reduced latency, Cloud cost savings).',
    },
    analytics: {
      tag: isFrench ? 'GUIDE DE PRISE EN MAIN • ANALYTICS' : 'QUICK START GUIDE • ANALYTICS',
      title: isFrench
        ? "Comment interpréter vos métriques de progression ?"
        : 'How to interpret your career performance metrics?',
      subtitle: isFrench
        ? "Suivez votre assiduité, vos scores d'entretien et votre montée en puissance technique."
        : 'Track your diligence, mock interview scores, and technical mastery growth.',
      steps: [
        {
          number: '1',
          title: isFrench ? '1. Activité & Régularité' : '1. Activity & Streak',
          desc: isFrench
            ? 'Suivez votre série de régularité (Streak) et le nombre d’offres analysées dans le mois.'
            : 'Track your preparation streak and total job offers evaluated this month.',
          badge: isFrench ? 'Régularité' : 'Streak',
        },
        {
          number: '2',
          title: isFrench ? '2. Évolution des Entretiens' : '2. Interview Progress',
          desc: isFrench
            ? 'Visualisez la progression de vos notes orales session après session (de 78% à 91%+).'
            : 'Visualize your spoken interview grades improving session over session (from 78% to 91%+).',
          badge: isFrench ? 'Progression' : 'Progression',
        },
        {
          number: '3',
          title: isFrench ? '3. Cartographie des Piliers' : '3. Competency Radar',
          desc: isFrench
            ? 'Identifiez vos domaines d’excellence (System Design, Kafka, EKS) et les axes à renforcer.'
            : 'Identify areas of excellence (System Design, Kafka, EKS) and growth areas.',
          badge: isFrench ? 'Expertise' : 'Expertise',
        },
      ],
      proTip: isFrench
        ? "Une régularité de 2 simulations d'entretien par semaine augmente votre aisance orale de 40% lors du vrai entretien."
        : 'Practicing 2 mock interviews per week increases verbal composure by 40% in real executive rounds.',
    },
    settings: {
      tag: isFrench ? 'GUIDE DE PRISE EN MAIN • PARAMÈTRES' : 'QUICK START GUIDE • SETTINGS',
      title: isFrench
        ? "Comment configurer votre expérience ForPro AI ?"
        : 'How to configure your ForPro AI workspace?',
      subtitle: isFrench
        ? "Ajustez la posture du coach IA, la langue de travail et vos préférences de confidentialité."
        : 'Adjust AI coach behavior, primary working language, and confidentiality settings.',
      steps: [
        {
          number: '1',
          title: isFrench ? '1. Langue & Devises' : '1. Language & Currency',
          desc: isFrench
            ? 'Basculez entre Français et Anglais selon les opportunités nationales ou internationales.'
            : 'Switch between French and English for local or international opportunities.',
          badge: isFrench ? 'FR / EN' : 'FR / EN',
        },
        {
          number: '2',
          title: isFrench ? '2. Posture du Coach IA' : '2. AI Coach Tone',
          desc: isFrench
            ? 'Choisissez entre un coach bienveillant ou un coach ultra-exigeant style Big Tech.'
            : 'Select between an encouraging coach or a rigorous FAANG-style interviewer.',
          badge: isFrench ? 'Personnalité' : 'Personality',
        },
        {
          number: '3',
          title: isFrench ? '3. Confidentialité & Alertes' : '3. Privacy & Alerts',
          desc: isFrench
            ? 'Activez l’anonymisation pour explorer le marché en toute discrétion.'
            : 'Enable anonymization to explore the market in full discretion.',
          badge: isFrench ? 'Sécurité' : 'Security',
        },
      ],
      proTip: isFrench
        ? "Passez en mode « Coach Exigeant » quelques jours avant vos entretiens finaux pour tester vos limites."
        : 'Switch to "Rigorous Coach" a few days before your final round to test your limits.',
    },
  };

  const currentGuide = guideData[menu];

  return (
    <div
      id={`menu-onboarding-guide-${menu}`}
      className="w-full bg-gradient-to-r from-slate-900 via-[#0B1528] to-[#132238] rounded-3xl p-5 sm:p-6 text-white border border-slate-700/70 shadow-lg relative overflow-hidden mb-6 transition-all duration-300"
    >
      {/* Ambient background aura */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#FF7A00]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#FFA040] text-[11px] font-bold mb-2 tracking-wide">
            <Sparkles className="w-3.5 h-3.5 fill-[#FFA040]" />
            <span>{currentGuide.tag}</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {currentGuide.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {currentGuide.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title={isCollapsed ? (isFrench ? 'Déplier le guide' : 'Expand guide') : (isFrench ? 'Réduire le guide' : 'Collapse guide')}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-4 h-4" />
                <span className="hidden sm:inline">{isFrench ? 'Voir les étapes' : 'Show steps'}</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" />
                <span className="hidden sm:inline">{isFrench ? 'Réduire' : 'Collapse'}</span>
              </>
            )}
          </button>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title={isFrench ? 'Masquer ce guide' : 'Dismiss guide'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Steps Section */}
      {!isCollapsed && (
        <div className="mt-5 space-y-4 relative z-10 animate-in fade-in duration-200">
          {/* 3 Step Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {currentGuide.steps.map((step) => (
              <div
                key={step.number}
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-7 h-7 rounded-xl bg-[#FF7A00] text-white font-black text-xs flex items-center justify-center shadow-xs">
                      {step.number}
                    </span>
                    {step.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10">
                        {step.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1 group-hover:text-[#FFA040] transition-colors">
                    {step.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pro Tip Callout + Actions Footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/10">
            <div className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed max-w-2xl">
              <Lightbulb className="w-4 h-4 text-[#FFA040] shrink-0 mt-0.5" />
              <span>
                <strong className="text-white font-bold">
                  {isFrench ? 'Astuce ForPro :' : 'ForPro Tip:'}
                </strong>{' '}
                {currentGuide.proTip}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {onStartGlobalTour && (
                <button
                  onClick={onStartGlobalTour}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                  title={isFrench ? 'Revoir la visite globale du dashboard' : 'Review global dashboard tour'}
                >
                  <Compass className="w-3.5 h-3.5 text-[#FFA040]" />
                  <span>{isFrench ? 'Tour Global' : 'Global Tour'}</span>
                </button>
              )}

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isFrench ? 'J’ai compris' : 'Got it'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
