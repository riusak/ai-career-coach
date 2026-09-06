'use client';

import { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Briefcase,
  Clock,
  FileSearch,
  Globe,
  Loader2,
  Mic,
  Target,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import InterviewReportModal from '@/components/dashboard/interview/InterviewReportModal';
import InterviewStudio from '@/components/dashboard/interview/InterviewStudio';
import PageGuideToggle from '@/components/dashboard/onboarding/PageGuideToggle';
import PageOnboardingGuide from '@/components/dashboard/onboarding/PageOnboardingGuide';
import { usePageGuide } from '@/components/dashboard/onboarding/usePageGuide';
import { startDashboardTour } from '@/lib/dashboard/tour-events';
import type {
  InterviewSession,
  InterviewSessionSummary,
  InterviewTurn,
  StarEvaluation,
} from '@/types/interview';
import type { JobMatchingSummary } from '@/types/matching';

type DirectSource = 'file' | 'url' | 'text';

interface MockInterviewsViewProps {
  /** Target role passed from the dashboard quick-access modal (optional). */
  targetRole?: string | null;
  /** Company of the target role (optional — enriches the focused-prep banner). */
  targetCompany?: string | null;
  /** Target CV identifier (primary or specified in query). */
  targetCvId?: string | null;
  /** User's available resumes. */
  cvs?: Array<{ id: string; name: string; isPrimary: boolean }>;
  /** Completed job matchings (evaluated offers ready for audio interview). */
  matchings: JobMatchingSummary[];
  /** Historical mock interview sessions recorded in Supabase. */
  pastInterviews?: InterviewSessionSummary[];
}

/** Colored pill of a matching or interview score. */
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

export default function MockInterviewsView({
  targetRole = null,
  targetCompany = null,
  targetCvId = null,
  cvs = [],
  matchings = [],
  pastInterviews = [],
}: MockInterviewsViewProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isFrench = locale !== 'en';
  const guide = usePageGuide('mock');

  // Simulation language selector (Français / English).
  const [simLanguage, setSimLanguage] = useState<'fr' | 'en'>(locale !== 'en' ? 'fr' : 'en');

  // Past interviews local state (updated when new session completes)
  const [pastInterviewsList, setPastInterviewsList] =
    useState<InterviewSessionSummary[]>(pastInterviews);

  // Active live studio session
  const [activeStudioSession, setActiveStudioSession] = useState<{
    session: InterviewSession;
    initialTurn: InterviewTurn;
  } | null>(null);

  // Modal report state for viewing past assessments
  const [selectedReportSession, setSelectedReportSession] = useState<StarEvaluation | null>(null);
  const [selectedReportMeta, setSelectedReportMeta] = useState<{
    jobTitle: string;
    company?: string | null;
  } | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Delete confirmation modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Loading & error states for starting a session
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Direct-upload accordion (dark card) state.
  const [directOpen, setDirectOpen] = useState(false);
  const [directSource, setDirectSource] = useState<DirectSource>('file');
  const [directFileName, setDirectFileName] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [directText, setDirectText] = useState('');
  const [directJobTitle, setDirectJobTitle] = useState('');
  const [directCompany, setDirectCompany] = useState('');
  const [selectedCvForSession, setSelectedCvForSession] = useState<string>(
    targetCvId || cvs[0]?.id || ''
  );
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  const openDirectUpload = () => {
    setDirectOpen(true);
    uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /**
   * Initializes and opens an interactive live interview session in the studio.
   */
  const startSimulation = async (params: {
    resumeId: string;
    jobTitle: string;
    company?: string | null;
    jobDescription?: string | null;
    jobMatchingId?: string | null;
  }) => {
    if (!params.resumeId) {
      setStartError(
        isFrench
          ? 'Aucun CV sélectionné. Veuillez importer un CV dans votre espace avant de lancer une simulation.'
          : 'No resume selected. Please upload a CV to your library first.'
      );
      return;
    }

    setIsStartingSession(true);
    setStartError(null);

    try {
      const response = await fetch('/api/interview/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: params.resumeId,
          jobMatchingId: params.jobMatchingId ?? null,
          jobTitle: params.jobTitle,
          company: params.company ?? null,
          jobDescription: params.jobDescription ?? null,
          language: simLanguage,
          interviewType: 'general',
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (data.session && data.initialTurn) {
        setActiveStudioSession({
          session: data.session,
          initialTurn: data.initialTurn,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(data.error || 'Impossible d’initialiser l’entretien.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du démarrage.';
      setStartError(msg);
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleLaunchDirectUpload = () => {
    const title =
      directJobTitle.trim() ||
      directFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') ||
      (directUrl
        ? isFrench
          ? 'Offre en ligne'
          : 'Online offer'
        : isFrench
        ? 'Offre d’emploi'
        : 'Job offer');

    const chosenResumeId = selectedCvForSession || targetCvId || cvs[0]?.id || '';
    setDirectOpen(false);

    startSimulation({
      resumeId: chosenResumeId,
      jobTitle: title,
      company: directCompany.trim() || null,
      jobDescription: directText.trim() || directUrl.trim() || null,
    });
  };

  /**
   * Opens the STAR report modal for a previously completed interview session.
   */
  const viewPastEvaluation = async (item: InterviewSessionSummary) => {
    setIsLoadingReport(true);
    try {
      const response = await fetch(`/api/interview/session?id=${item.id}`);
      if (!response.ok) throw new Error('Impossible de charger le bilan.');
      const data = await response.json();
      if (data.session?.starEvaluation) {
        setSelectedReportSession(data.session.starEvaluation);
        setSelectedReportMeta({ jobTitle: item.jobTitle, company: item.company });
      }
    } catch (err) {
      console.error('[MockInterviewsView] Error viewing evaluation:', err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  /**
   * Marks an in-progress session as abandoned directly from the past sessions list.
   */
  const handleAbandonFromList = async (sessionId: string) => {
    try {
      const response = await fetch('/api/interview/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: 'abandon' }),
      });
      if (response.ok) {
        setPastInterviewsList((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, status: 'abandoned', hasEvaluation: true }
              : s
          )
        );
      }
    } catch (err) {
      console.error('[MockInterviewsView] Error abandoning session:', err);
    }
  };

  /**
   * Permanently deletes an interview session after user confirmation.
   */
  const handleDeleteSession = async (sessionId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/interview/session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (response.ok) {
        setPastInterviewsList((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch (err) {
      console.error('[MockInterviewsView] Error deleting session:', err);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
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
                ? 'Entraînez-vous avec notre recruteur vocal IA expressif et exigeant. Évaluation STAR complète, relances en direct et conseils sur-mesure.'
                : 'Practice with our expressive AI voice recruiter. Full STAR evaluation, live challenges, and tailored debriefing.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Guide toggle */}
          <PageGuideToggle visible={guide.visible} onToggle={guide.toggle} />

          {/* Simulation language selector */}
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
                  simLanguage === code
                    ? 'bg-[#FF7A00] text-white'
                    : 'text-slate-600 hover:text-slate-900'
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

      {/* Contextual page guide */}
      {guide.visible && (
        <PageOnboardingGuide
          menu="mock"
          onDismiss={guide.hide}
          onStartGlobalTour={() => startDashboardTour(pathname, (href) => router.push(href))}
        />
      )}

      {/* Active Studio Arena (When user is in an active interview) */}
      {activeStudioSession && (
        <section aria-label="Studio interactif" className="scroll-mt-6 animate-fade-slide-in">
          <InterviewStudio
            session={activeStudioSession.session}
            initialTurn={activeStudioSession.initialTurn}
            onClose={() => setActiveStudioSession(null)}
            onSessionUpdated={(updatedSession) => {
              setPastInterviewsList((prev) => {
                const idx = prev.findIndex((s) => s.id === updatedSession.id);
                const summaryItem: InterviewSessionSummary = {
                  id: updatedSession.id,
                  resumeId: updatedSession.resumeId,
                  jobTitle: updatedSession.jobTitle,
                  company: updatedSession.company,
                  language: updatedSession.language,
                  interviewType: updatedSession.interviewType,
                  status: updatedSession.status,
                  score: updatedSession.score,
                  totalQuestions: updatedSession.currentStep,
                  createdAt: updatedSession.createdAt,
                  hasEvaluation: Boolean(updatedSession.starEvaluation),
                };
                if (idx !== -1) {
                  const next = [...prev];
                  next[idx] = summaryItem;
                  return next;
                }
                return [summaryItem, ...prev];
              });
            }}
            onCompleted={(completedSession) => {
              setPastInterviewsList((prev) => {
                const filtered = prev.filter((s) => s.id !== completedSession.id);
                return [
                  {
                    id: completedSession.id,
                    resumeId: completedSession.resumeId,
                    jobTitle: completedSession.jobTitle,
                    company: completedSession.company,
                    language: completedSession.language,
                    interviewType: completedSession.interviewType,
                    status: completedSession.status,
                    score: completedSession.score,
                    totalQuestions: completedSession.currentStep,
                    createdAt: completedSession.createdAt,
                    hasEvaluation: Boolean(completedSession.starEvaluation),
                  },
                  ...filtered,
                ];
              });
            }}
          />
        </section>
      )}

      {/* Global error banner if launch fails */}
      {startError && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{startError}</span>
        </div>
      )}

      {/* Quick-access context banner */}
      {(targetRole || targetCompany) && !activeStudioSession && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-200/70 bg-brand-50/60 px-5 py-3.5 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Target className="h-4 w-4 shrink-0 text-brand-600" />
            <p className="text-xs font-semibold text-slate-800">
              {isFrench ? 'Préparation ciblée' : 'Focused preparation'}
              {targetRole ? ` : ${targetRole}` : ''}
              {targetCompany ? ` • ${targetCompany}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              startSimulation({
                resumeId: targetCvId || cvs[0]?.id || '',
                jobTitle: targetRole || 'Poste ciblé',
                company: targetCompany,
              })
            }
            disabled={isStartingSession}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B1528] hover:bg-[#FF7A00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isStartingSession ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF7A00]" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-[#FF7A00]" />
            )}
            <span>{isFrench ? 'Lancer cet entretien ciblé' : 'Launch Focused Session'}</span>
          </button>
        </div>
      )}

      {/* DIRECT UPLOAD & IMMEDIATE SIMULATION — dark container. */}
      {!activeStudioSession && (
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

              {/* CV selector dropdown if user has multiple CVs */}
              {cvs.length > 1 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    {isFrench ? 'CV de référence pour l’entretien :' : 'Reference CV:'}
                  </label>
                  <select
                    value={selectedCvForSession}
                    onChange={(e) => setSelectedCvForSession(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#FF7A00]"
                  >
                    {cvs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.isPrimary ? '★' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Source tabs */}
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

              {/* File drag & drop zone */}
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
                          setDirectJobTitle(
                            file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
                          );
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
                      {isFrench
                        ? 'Formats .pdf, .docx, .doc jusqu’à 10MB'
                        : 'Formats .pdf, .docx, .doc up to 10MB'}
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
                      ? 'Le lien permet de situer l’entreprise et d’adapter les questions.'
                      : 'The link contextualizes the company for tailored questions.'}
                  </p>
                </div>
              )}

              {/* Raw pasted text */}
              {directSource === 'text' && (
                <textarea
                  rows={3}
                  value={directText}
                  onChange={(event) => setDirectText(event.target.value)}
                  placeholder={
                    isFrench
                      ? 'Collez ici la description du poste…'
                      : 'Paste the job description here…'
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF7A00] resize-none"
                />
              )}

              {/* Job title + company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={directJobTitle}
                  onChange={(event) => setDirectJobTitle(event.target.value)}
                  placeholder={
                    isFrench
                      ? 'Intitulé du poste (ex: Lead Platform Architect)'
                      : 'Job title (e.g. Lead Platform Architect)'
                  }
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF7A00]"
                />
                <input
                  type="text"
                  value={directCompany}
                  onChange={(event) => setDirectCompany(event.target.value)}
                  placeholder={
                    isFrench
                      ? 'Entreprise / Organisation (ex: Wave, Paystack…)'
                      : 'Company / Organisation (e.g. Wave, Paystack…)'
                  }
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF7A00]"
                />
              </div>

              {/* Primary action */}
              <button
                type="button"
                onClick={handleLaunchDirectUpload}
                disabled={isStartingSession}
                className="w-full py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isStartingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isFrench ? 'Préparation de l’entretien...' : 'Preparing session...'}</span>
                  </>
                ) : (
                  <span>
                    {isFrench
                      ? 'Démarrer la simulation pour cette offre →'
                      : 'Start simulation for this offer →'}
                  </span>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* SECTION 1 — RECENT MATCHINGS */}
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
              <h4 className="text-sm font-bold text-slate-800">
                {isFrench ? 'Aucun matching récent' : 'No recent matchings'}
              </h4>
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
                <span>
                  {isFrench ? 'Évaluer mon CV dans le Job Matching' : 'Evaluate my CV in Job Matching'}
                </span>
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
                      className={`inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${scoreTone(
                        match.matchScore
                      )}`}
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
                      onClick={() =>
                        startSimulation({
                          resumeId: match.resumeId,
                          jobMatchingId: match.id,
                          jobTitle: match.jobTitle,
                          company: match.company,
                        })
                      }
                      disabled={isStartingSession}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0B1528] hover:bg-[#FF7A00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isStartingSession ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-[#FF7A00]" />
                      )}
                      <span>{isFrench ? 'Simuler entretien audio' : 'Simulate Audio'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2 — PAST INTERVIEW SIMULATIONS */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
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
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {pastInterviewsList.length} {isFrench ? 'sessions enregistrées' : 'sessions recorded'}
          </span>
        </div>

        {pastInterviewsList.length === 0 ? (
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
                  ? 'Vos simulations vocales, scores de clarté STAR et synthèses d’évaluateur s’afficheront ici après votre premier entraînement.'
                  : 'Your voice recordings, STAR scores, transcripts, and evaluator summaries will appear here after your first session.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={openDirectUpload}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B1528] hover:bg-[#FF7A00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>
                  {isFrench ? 'Lancer ma première simulation vocale' : 'Launch My First Voice Interview'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pastInterviewsList.map((item) => {
              const isCompleted = item.status === 'completed';
              const isAbandoned = item.status === 'abandoned';
              const hasScore = typeof item.score === 'number' && item.score > 0;

              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-[#FF7A00]/40 hover:shadow-sm flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="truncate text-xs font-bold text-slate-900">{item.jobTitle}</h4>
                      {isCompleted && hasScore ? (
                        <span
                          className={`inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${scoreTone(
                            item.score
                          )}`}
                        >
                          {item.score}% STAR
                        </span>
                      ) : isAbandoned ? (
                        <span className="inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">
                          {isFrench ? 'Interrompu' : 'Interrupted'}
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                          {isFrench ? 'En cours' : 'In Progress'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 truncate">
                      {item.company || (isFrench ? 'Entreprise confidentielle' : 'Company confidential')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
                        {item.language}
                      </span>
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(item.createdAt, locale)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(item.id);
                      }}
                      title={isFrench ? 'Supprimer cette simulation' : 'Delete this simulation'}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="pt-2">
                    {isAbandoned ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-500">
                          {isFrench
                            ? `Entretien suspendu (étape ${item.totalQuestions || 1}/5)`
                            : `Interview interrupted (stage ${item.totalQuestions || 1}/5)`}
                        </p>
                        <div className="flex items-center gap-2">
                          {item.hasEvaluation && (
                            <button
                              type="button"
                              onClick={() => viewPastEvaluation(item)}
                              disabled={isLoadingReport}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-[#FF7A00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              <Award className="w-3.5 h-3.5 text-[#FF7A00]" />
                              <span>{isFrench ? 'Bilan' : 'Debrief'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              startSimulation({
                                resumeId: item.resumeId,
                                jobTitle: item.jobTitle,
                                company: item.company,
                              })
                            }
                            disabled={isStartingSession}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-[#FF7A00] border border-orange-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Mic className="w-3.5 h-3.5" />
                            <span>{isFrench ? 'Recommencer' : 'Restart'}</span>
                          </button>
                        </div>
                      </div>
                    ) : item.hasEvaluation ? (
                      <button
                        type="button"
                        onClick={() => viewPastEvaluation(item)}
                        disabled={isLoadingReport}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-[#FF7A00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Award className="w-3.5 h-3.5 text-[#FF7A00]" />
                        <span>{isFrench ? 'Consulter le bilan STAR' : 'View STAR Debrief'}</span>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            startSimulation({
                              resumeId: item.resumeId,
                              jobTitle: item.jobTitle,
                              company: item.company,
                            })
                          }
                          disabled={isStartingSession}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-[#FF7A00] border border-orange-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>{isFrench ? 'Reprendre la simulation' : 'Resume Simulation'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAbandonFromList(item.id)}
                          className="w-full text-center text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {isFrench ? 'Marquer comme interrompue' : 'Mark as interrupted'}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-slide-in"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 border border-rose-200">
                <Trash2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isFrench ? 'Supprimer cette simulation ?' : 'Delete this simulation?'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isFrench
                    ? 'Cette action est irréversible. Le transcript et le bilan STAR seront définitivement supprimés.'
                    : 'This action is irreversible. The transcript and STAR evaluation will be permanently deleted.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                {isFrench ? 'Annuler' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSession(deleteConfirmId)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isFrench ? 'Supprimer' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal for viewing past evaluations */}
      <InterviewReportModal
        open={Boolean(selectedReportSession)}
        onClose={() => {
          setSelectedReportSession(null);
          setSelectedReportMeta(null);
        }}
        evaluation={selectedReportSession}
        jobTitle={selectedReportMeta?.jobTitle || 'Simulation'}
        company={selectedReportMeta?.company}
        language={simLanguage}
      />
    </div>
  );
}