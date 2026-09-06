'use client';

import { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ArrowLeft,
  Briefcase,
  Clock,
  FileSearch,
  Globe,
  Mic,
  Target,
  Upload,
  Video,
  X,
} from 'lucide-react';
import PageGuideToggle from '@/components/dashboard/onboarding/PageGuideToggle';
import PageOnboardingGuide from '@/components/dashboard/onboarding/PageOnboardingGuide';
import { usePageGuide } from '@/components/dashboard/onboarding/usePageGuide';
import { startDashboardTour } from '@/lib/dashboard/tour-events';
import type { JobMatchingSummary } from '@/types/matching';

type DirectSource = 'file' | 'url' | 'text';

interface MockInterviewsViewProps {
  /** Target role passed from the dashboard quick-access modal (optional). */
  targetRole?: string | null;
  /** Company of the target role (optional — enriches the focused-prep banner). */
  targetCompany?: string | null;
  /** Completed job matchings (evaluated offers ready for audio interview). */
  matchings: JobMatchingSummary[];
}

/** Colored pill of a matching score (mirrors the matching dashboard badge). */
function scoreTone(score: number | null): string {
  if (score === null) {
    return 'bg-slate-100 text-slate-500 ring-slate-200';
  }
  if (score >= 80) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (score >= 50) {
    return 'bg-brand-50 text-brand-700 ring-brand-200';
  }
  return 'bg-rose-50 text-rose-700 ring-rose-200';
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { dateStyle: 'medium' });
}

/**
 * « Simulations d'Entretiens IA » — Chart 9 template-accurate mock-interview
 * hub: header + contextual controls (Guide / simulation language / ←
 * Dashboard), the dark direct-upload card and the two history sections
 * (recent matchings, past sessions). Live audio sessions arrive in a future
 * sprint — every CTA therefore lands on this hub with the target context set.
 */
export default function MockInterviewsView({
  targetRole = null,
  targetCompany = null,
  matchings = [],
}: MockInterviewsViewProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isFrench = locale !== 'en';
  const guide = usePageGuide('mock');

  // Language of the coming voice simulation (Français / English — wireframe).
  const [simLanguage, setSimLanguage] = useState<'fr' | 'en'>(locale !== 'en' ? 'fr' : 'en');

  // Direct-upload accordion (dark card) state.
  const [directOpen, setDirectOpen] = useState(false);
  const [directSource, setDirectSource] = useState<DirectSource>('file');
  const [directFileName, setDirectFileName] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [directText, setDirectText] = useState('');
  const [directJobTitle, setDirectJobTitle] = useState('');
  const [directCompany, setDirectCompany] = useState('');
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  const openDirectUpload = () => {
    setDirectOpen(true);
    uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Bookmarks the target offer: the dedicated voice studio is a future
  // sprint, so the flow re-enters this hub with the focused-preparation
  // banner (same link contract as the matching report's « Simuler un
  // entretien » entry point).
  const navigateToTarget = (role: string, company?: string | null) => {
    const params = new URLSearchParams();
    const title = role.trim().slice(0, 120);
    if (title.length > 0) {
      params.set('role', title);
    }
    if (company && company.trim().length > 0) {
      params.set('company', company.trim().slice(0, 300));
    }
    const query = params.toString();
    router.push(query ? `/dashboard/mock?${query}` : '/dashboard/mock');
  };

  const simulateMatching = (match: JobMatchingSummary) => {
    navigateToTarget(match.jobTitle, match.company);
  };

  const handleLaunchDirectUpload = () => {
    const title =
      directJobTitle.trim() ||
      directFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') ||
      (directUrl ? (isFrench ? 'Offre en ligne' : 'Online offer') : isFrench ? 'Offre d’emploi' : 'Job offer');
    setDirectOpen(false);
    navigateToTarget(title, directCompany.trim());
  };

  const sourceTabs: { id: DirectSource; label: string; hint: string }[] = [
    {
      id: 'file',
      label: isFrench ? 'Fichier PDF / Word' : 'PDF / Word File',
      hint: isFrench ? 'Glisser le document' : 'Drag the document here',
    },
    {
      id: 'url',
      label: isFrench ? 'Lien Web de l’offre' : 'Job Offer Web Link',
      hint: isFrench ? 'URL LinkedIn, WTTJ…' : 'LinkedIn, WTTJ URL…',
    },
    {
      id: 'text',
      label: isFrench ? 'Copier / Coller texte' : 'Copy / Paste Text',
      hint: isFrench ? 'Description brute' : 'Raw description',
    },
  ];

  return (
    <div id="mock-interviews-view" className="flex flex-col gap-6 sm:gap-7 pb-16">
      {/* HEADER — title/subtitle + contextual controls (Guide / Language / Dashboard). */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-xl bg-orange-50 border border-orange-200 items-center justify-center text-[#FF7A00]">
            <Video className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
              {isFrench ? 'Simulations d’Entretiens IA' : 'AI Mock Interviews'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-2xl leading-relaxed">
              {isFrench
                ? 'Entraînez-vous avec notre recruteur vocal IA en sélectionnant un matching récent ou en téléversant directement une offre d’emploi.'
                : 'Practice with our AI voice recruiter by selecting a recent job match or uploading a job offer directly.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Guide toggle (Chart 7 contextual onboarding widget). */}
          <PageGuideToggle visible={guide.visible} onToggle={guide.toggle} />

          {/* Simulation language selector (Français / English — wireframe). */}
          <div
            role="group"
            aria-label={isFrench ? 'Langue de la simulation' : 'Simulation language'}
            className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-2" aria-hidden="true" />
            {(['fr', 'en'] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setSimLanguage(code)}
                aria-pressed={simLanguage === code}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  simLanguage === code ? 'bg-[#FF7A00] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {code === 'fr' ? 'Français' : 'English'}
              </button>
            ))}
          </div>

          <button
            id="back-to-dashboard-btn"
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      {/* Contextual page guide (hidden by default — revealed by the header toggle). */}
      {guide.visible && (
        <PageOnboardingGuide
          menu="mock"
          onDismiss={guide.hide}
          onStartGlobalTour={() => startDashboardTour(pathname, (href) => router.push(href))}
        />
      )}

      {/* Quick-access context (role picked from the dashboard modal / matching report). */}
      {(targetRole || targetCompany) && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-brand-200/70 bg-brand-50/60 px-4 py-3">
          <Target className="h-4 w-4 shrink-0 text-brand-600" />
          <p className="text-xs font-semibold text-slate-800">
            {isFrench ? 'Préparation ciblée' : 'Focused preparation'}
            {targetRole ? ` : ${targetRole}` : ''}
            {targetCompany ? ` • ${targetCompany}` : ''}
          </p>
        </div>
      )}

      {/* DIRECT UPLOAD & IMMEDIATE SIMULATION — dark container. */}
      <section
        ref={uploadSectionRef}
        className="scroll-mt-6 rounded-3xl border border-slate-200/70 bg-gradient-to-br from-[#0B1528] to-[#132238] p-5 sm:p-6 md:p-8 text-white shadow-lg"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2.5 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-[#FF7A00] border border-orange-500/30 text-xs font-bold">
              {isFrench ? 'Simulation Directe & Immédiate' : 'Direct & Instant Simulation'}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {isFrench ? 'Téléverser directement une offre pour simuler' : 'Directly Upload a Job Offer for Simulation'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isFrench
                ? 'Vous avez une fiche de poste sous la main ? Chargez le fichier (PDF/Word) ou collez le lien pour lancer instantanément un entretien vocal adapté.'
                : 'Got a job offer file or link at hand? Upload the file (PDF/Word) or paste the link to instantly launch a tailored voice interview.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDirectOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{isFrench ? 'Uploader une offre directement' : 'Upload Offer Directly'}</span>
          </button>
        </div>

        {/* Direct-upload accordion */}
        {directOpen && (
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-4 animate-fade-slide-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {isFrench ? 'Configuration de l’offre à simuler' : 'Offer configuration'}
              </h3>
              <button
                type="button"
                onClick={() => setDirectOpen(false)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                {isFrench ? 'Annuler' : 'Cancel'}
              </button>
            </div>

            {/* Source tabs (Fichier PDF / Word · Lien Web · Copier/Coller). */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sourceTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDirectSource(tab.id)}
                  aria-pressed={directSource === tab.id}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    directSource === tab.id
                      ? 'border-[#FF7A00] bg-orange-500/10 text-white'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <p className="text-xs font-bold">{tab.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{tab.hint}</p>
                </button>
              ))}
            </div>

            {/* File drag & drop zone with format specs. */}
            {directSource === 'file' && (
              <div className="border border-dashed border-slate-700 rounded-xl p-5 text-center bg-slate-900/60">
                <input
                  type="file"
                  id="direct-offer-file"
                  accept=".pdf,.doc,.docx"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setDirectFileName(file.name);
                      if (!directJobTitle.trim()) {
                        setDirectJobTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                      }
                    }
                  }}
                  className="hidden"
                />
                <label htmlFor="direct-offer-file" className="cursor-pointer block">
                  <Upload className="w-6 h-6 text-[#FF7A00] mx-auto mb-2" />
                  <p className="text-xs font-bold text-white">
                    {directFileName ||
                      (isFrench
                        ? 'Cliquez pour sélectionner le fichier PDF ou Word (.docx)'
                        : 'Click to select a PDF or Word (.docx) file')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {isFrench ? 'Formats .pdf, .docx, .doc jusqu’à 10MB' : 'Formats .pdf, .docx, .doc up to 10MB'}
                  </p>
                </label>
              </div>
            )}

            {/* URL input */}
            {directSource === 'url' && (
              <div className="space-y-1">
                <input
                  type="url"
                  value={directUrl}
                  onChange={(event) => setDirectUrl(event.target.value)}
                  placeholder="https://company.com/careers/lead-architect..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF7A00]"
                />
                <p className="text-[10px] text-slate-400">
                  {isFrench
                    ? 'Le contenu de la page est récupéré automatiquement pour préparer votre entretien.'
                    : 'Page content is fetched automatically to prepare your interview.'}
                </p>
              </div>
            )}

            {/* Raw pasted text */}
            {directSource === 'text' && (
              <textarea
                rows={3}
                value={directText}
                onChange={(event) => setDirectText(event.target.value)}
                placeholder={isFrench ? 'Collez ici la description du poste…' : 'Paste the job description here…'}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF7A00] resize-none"
              />
            )}

            {/* Job title + company / organisation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={directJobTitle}
                onChange={(event) => setDirectJobTitle(event.target.value)}
                placeholder={isFrench ? 'Intitulé du poste (ex: Lead Platform Architect)' : 'Job title (e.g. Lead Platform Architect)'}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF7A00]"
              />
              <input
                type="text"
                value={directCompany}
                onChange={(event) => setDirectCompany(event.target.value)}
                placeholder={isFrench ? 'Entreprise / Organisation (ex: Wave, Paystack…)' : 'Company / Organisation (e.g. Wave, Paystack…)'}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF7A00]"
              />
            </div>

            {/* Primary action — solid orange. */}
            <button
              type="button"
              onClick={handleLaunchDirectUpload}
              className="w-full py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              {isFrench ? 'Démarrer la simulation pour cette offre →' : 'Start the simulation for this offer →'}
            </button>
          </div>
        )}
      </section>

      {/* SECTION 1 — RECENT MATCHINGS (evaluated offers ready for audio interview). */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isFrench ? 'Historique récent de vos matchings' : 'Recent Matching History'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isFrench
                ? 'Sélectionnez une offre matchée pour lancer un entretien audio ciblé.'
                : 'Click any matched offer to simulate a tailored audio interview.'}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {matchings.length} {isFrench ? 'offres enregistrées' : 'offers recorded'}
          </span>
        </div>

        {matchings.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto text-[#FF7A00]">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">{isFrench ? 'Aucun matching recent' : 'No recent matchings'}</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {isFrench
                  ? 'Évaluez d’abord votre CV face à une offre dans la section Job Matching : le diagnostic alimentera directement votre prochaine simulation vocale.'
                  : 'Evaluate your CV against a job offer in the Job Matching section first: the diagnostic feeds your next voice simulation directly.'}
              </p>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => router.push('/dashboard/matching')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B1528] hover:bg-[#132238] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <FileSearch className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>{isFrench ? 'Évaluer mon CV dans le Job Matching' : 'Evaluate my CV in Job Matching'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {matchings.map((match) => {
              const sourceLabel =
                match.sourceType === 'file'
                  ? isFrench
                    ? 'Fichier PDF'
                    : 'PDF File'
                  : match.sourceType === 'url'
                    ? isFrench
                      ? 'Lien Web'
                      : 'Web Link'
                    : match.sourceType === 'text'
                      ? isFrench
                        ? 'Texte brut'
                        : 'Raw text'
                      : null;
              return (
                <article
                  key={match.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-[#FF7A00]/40 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-bold text-slate-900">{match.jobTitle}</h4>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        {[match.company, match.location].filter(Boolean).join(' • ') ||
                          (isFrench ? 'Offre anonyme' : 'Anonymous offer')}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${scoreTone(match.matchScore)}`}
                    >
                      {match.matchScore === null ? '…' : `${match.matchScore}% Match`}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    {sourceLabel && (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        {sourceLabel}
                      </span>
                    )}
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(match.createdAt, locale)}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <Mic className="w-3.5 h-3.5 text-[#FF7A00]" />
                      {isFrench ? 'Entretien Audio' : 'Audio Interview'}
                    </span>
                    <button
                      type="button"
                      onClick={() => simulateMatching(match)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0B1528] hover:bg-[#FF7A00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5 text-[#FF7A00]" />
                      <span>{isFrench ? 'Simuler entretien audio' : 'Simulate Audio'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2 — PAST INTERVIEW SIMULATIONS (empty until the voice studio arrives). */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {isFrench ? 'Historique de vos simulations passées' : 'Past Mock Interview Sessions'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isFrench
              ? 'Consultez vos diagnostics passés, notes de clarté STAR et synthèses de l’évaluateur.'
              : 'Review your past diagnostics, STAR clarity scores and evaluator summaries.'}
          </p>
        </div>

        <div className="p-8 sm:p-10 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto text-[#FF7A00]">
            <Video className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">
              {isFrench ? 'Aucune simulation enregistrée pour le moment' : 'No mock interview sessions yet'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {isFrench
                ? 'Vos enregistrements vocaux, scores de clarté STAR, transcriptions et synthèses d’évaluateur s’afficheront ici après votre premier entraînement.'
                : 'Your voice recordings, STAR clarity scores, transcripts, and evaluator summaries will appear here after your first practice session.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={openDirectUpload}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B1528] hover:bg-[#FF7A00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>{isFrench ? 'Lancer ma première simulation vocale' : 'Launch My First Voice Interview'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}