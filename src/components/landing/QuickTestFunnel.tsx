'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_RESUME_FILE_SIZE_BYTES, formatBytes } from '@/lib/resume-validation';
import SignupModal from '@/components/landing/SignupModal';
import ErrorState from '@/components/ui/ErrorState';
import LoadingSteps from '@/components/ui/LoadingSteps';
import SuccessBanner from '@/components/ui/SuccessBanner';
import type { QuickTestResponse } from '@/types/quick-test';

/**
 * Visitor Quick Test funnel (docs/product/mvp.md §2): drag & drop a PDF,
 * validate it locally, then trigger the free ephemeral analysis. The result
 * preview converts by gating deeper features behind sign-up CTAs.
 */

type FunnelStep = 'idle' | 'ready' | 'analyzing' | 'result';

interface QuickTestFunnelProps {
  isAuthenticated: boolean;
}

const LOCKED_FEATURES = [
  {
    title: 'Analyse complète & détaillée',
    description:
      'Recommandations approfondies, plan d’action priorisé et réécriture guidée section par section.',
  },
  {
    title: 'Matching offre d’emploi',
    description:
      'Confrontez votre CV à une offre cible : score d’adéquation, mots-clés manquants et écarts à combler.',
  },
  {
    title: 'Bibliothèque & historique',
    description:
      'Gérez plusieurs versions de votre CV et suivez la progression de vos analyses dans le temps.',
  },
] as const;

/**
 * "Billet d'attente" steps shown while the analysis runs. They advance on a
 * timer (not on real completion) to maximize perceived performance; each
 * stage realistically matches the backend pipeline order.
 */
const ANALYSIS_STEPS = [
  'Extraction du texte en cours',
  'Analyse des compétences par l’IA',
  'Génération des recommandations',
] as const;

const STEP_DURATIONS_MS = [1600, 3400, 8000] as const;

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  // Animate from 0 on mount: the ring sweep + count-up create a celebratory
  // reveal once the analysis completes (perceived performance pattern).
  const [shownScore, setShownScore] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
      setShownScore(score);
    });
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const progress = mounted ? shownScore / 100 : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-gold-100" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-gold-500 transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900">{shownScore}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-gold-700">/ 100</span>
      </div>
    </div>
  );
}

function FindingList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'positive' | 'negative';
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-slate-600">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                tone === 'positive'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {tone === 'positive' ? '✓' : '✕'}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LockedFeatureCard({
  title,
  description,
  onUnlock,
}: {
  title: string;
  description: string;
  onUnlock: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onUnlock}
      className="relative w-full cursor-pointer overflow-hidden rounded-xl border border-gold-200 bg-white p-5 text-left shadow-sm transition-all hover:border-gold-400 hover:shadow-md"
    >
      <div aria-hidden="true" className="pointer-events-none select-none blur-[3px]">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-sm text-slate-500">{description}</p>
        <div className="mt-3 h-2 w-3/4 rounded-full bg-slate-100" />
        <div className="mt-2 h-2 w-1/2 rounded-full bg-slate-100" />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 px-4 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-5 w-5 text-gold-600"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p className="text-xs font-semibold text-gold-800">Réservé aux membres</p>
        <p className="text-[11px] font-medium text-gold-700 underline underline-offset-2">
          Cliquer pour débloquer
        </p>
      </div>
    </button>
  );
}

export default function QuickTestFunnel({ isAuthenticated }: QuickTestFunnelProps) {
  const [step, setStep] = useState<FunnelStep>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickTestResponse | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // "Billet d'attente": advance the progress steps on a timer while the
  // analysis request is in flight (perceived performance — the UI keeps
  // moving forward instead of freezing on a spinner).
  useEffect(() => {
    if (step !== 'analyzing') {
      return;
    }
    const timers = [
      setTimeout(() => setAnalysisStep(1), STEP_DURATIONS_MS[0]),
      setTimeout(() => setAnalysisStep(2), STEP_DURATIONS_MS[1]),
    ];
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [step]);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setClientError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const resetFunnel = useCallback(() => {
    clearSelection();
    setServerError(null);
    setResult(null);
    setStep('idle');
  }, [clearSelection]);

  const selectFile = useCallback(
    (file: File | null | undefined) => {
      setClientError(null);
      setServerError(null);

      if (!file) {
        return;
      }

      // Visitor mode: PDF only, 5 MB max (mvp.md §2.2).
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setClientError('Format non supporté : le test rapide accepte uniquement des fichiers PDF.');
        clearSelection();
        return;
      }
      if (file.size <= 0) {
        setClientError('Le fichier est vide.');
        clearSelection();
        return;
      }
      if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
        setClientError(
          `Fichier trop volumineux (${formatBytes(file.size)}). Maximum : ${formatBytes(
            MAX_RESUME_FILE_SIZE_BYTES
          )}.`
        );
        clearSelection();
        return;
      }

      setSelectedFile(file);
      setStep('ready');
    },
    [clearSelection]
  );

  const runAnalysis = useCallback(async () => {
    if (!selectedFile) {
      return;
    }

    setServerError(null);
    // Reset the "billet d'attente" before each new run (also handles the
    // retry case where a previous analysis already advanced the steps).
    setAnalysisStep(0);
    setStep('analyzing');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Client-side safety net: never leave the visitor stuck on the loading
      // state if the network or the LLM pipeline hangs.
      const response = await fetch('/api/quick-test', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(45_000),
      });

      if (!response.ok) {
        const payload: { error?: string } = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Une erreur est survenue pendant l’analyse.');
      }

      const payload: QuickTestResponse = await response.json();
      setResult(payload);
      setStep('result');
    } catch (error) {
      let message = 'Une erreur est survenue pendant l’analyse.';
      if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        message =
          'Le serveur met trop de temps à répondre. Vérifiez votre connexion puis réessayez — votre CV n’a pas été conservé.';
      } else if (error instanceof Error) {
        message = error.message;
      }
      setServerError(message);
      setStep('ready');
    }
  }, [selectedFile]);

  const errorMessage = clientError ?? serverError;

  return (
    <div className="rounded-2xl border border-gold-200 bg-white p-6 shadow-xl shadow-gold-100/60 sm:p-8">
      {step === 'idle' && (
        <div>
          <div
            role="button"
            tabIndex={0}
            aria-label="Déposer votre CV au format PDF"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragActive(false);
              selectFile(event.dataTransfer.files[0]);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
              isDragActive
                ? 'border-gold-500 bg-gold-50'
                : 'border-gold-300 bg-gold-50/40 hover:border-gold-400 hover:bg-gold-50'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-12 w-12 text-gold-600"
            >
              <path d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            <p className="mt-4 text-base font-semibold text-slate-900">
              Glissez-déposez votre CV ici
            </p>
            <p className="mt-1 text-sm text-slate-500">
              ou{' '}
              <span className="font-medium text-gold-700 underline decoration-gold-300 underline-offset-2">
                parcourez vos fichiers
              </span>
            </p>
            <p className="mt-4 text-xs text-slate-500">
              PDF uniquement · 5 Mo maximum · Analyse éphémère, rien n’est conservé
            </p>
          </div>

          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold-500" />
              100 % gratuit
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold-500" />
              Sans inscription
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold-500" />
              Résultat en moins de 2 minutes
            </span>
          </p>
        </div>
      )}

      {step === 'ready' && selectedFile && (
        <div aria-live="polite">
          {errorMessage && (
            <div className="mb-4">
              <ErrorState
                title={clientError ? 'Fichier non valide' : 'Oups, une erreur est survenue'}
                description={errorMessage}
              >
                {serverError && selectedFile && (
                  <button
                    type="button"
                    onClick={runAnalysis}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
                  >
                    Réessayer l’analyse
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    clearSelection();
                    inputRef.current?.click();
                  }}
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
                >
                  Choisir un autre fichier
                </button>
              </ErrorState>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-xs font-bold uppercase text-gold-700">
                PDF
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatBytes(selectedFile.size)} · Prêt pour l’analyse
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="ml-3 shrink-0 text-sm font-medium text-slate-500 underline transition-colors hover:text-slate-700"
            >
              Changer
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={runAnalysis}
              className="flex-1 rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition-all hover:from-gold-500 hover:to-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-600 focus:ring-offset-2"
            >
              Analyser mon CV — gratuitement
            </button>
            <button
              type="button"
              onClick={resetFunnel}
              className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <div
          aria-live="polite"
          className="flex flex-col items-center justify-center rounded-xl border border-gold-100 bg-gold-50/40 py-12"
        >
          <LoadingSteps
            steps={ANALYSIS_STEPS}
            activeIndex={analysisStep}
            label="Analyse de votre CV en cours…"
          />
          <p className="mt-6 text-xs text-slate-500">
            Cela ne prend généralement que quelques secondes — aucun compte requis, rien
            n’est conservé.
          </p>
        </div>
      )}

      {step === 'result' && result && (
        <div aria-live="polite">
          {errorMessage && (
            <div className="mb-4">
              <ErrorState
                title="Oups, une erreur est survenue"
                description={errorMessage}
              >
                <button
                  type="button"
                  onClick={resetFunnel}
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
                >
                  Choisir un autre fichier
                </button>
              </ErrorState>
            </div>
          )}

          <div className="mb-5">
            <SuccessBanner
              title="Analyse terminée !"
              description="Voici votre aperçu gratuit. Vos points forts et vos axes d’amélioration prioritaires sont ci-dessous."
            />
          </div>

          {/* Score & document metadata */}
          <div className="flex flex-col items-center gap-6 rounded-xl border border-gold-200 bg-gold-50/60 p-5 sm:flex-row">
            <ScoreRing score={result.analysis.score} />
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">
                Aperçu gratuit
              </p>
              <h3
                className="mt-1 truncate text-lg font-bold text-slate-900"
                title={result.metadata.fileName}
              >
                {result.metadata.fileName}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {result.metadata.pageCount} page{result.metadata.pageCount > 1 ? 's' : ''} ·{' '}
                {result.metadata.wordCount} mots · {formatBytes(result.metadata.fileSizeBytes)}
              </p>
              <p className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="inline-flex rounded-full border border-gold-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gold-800">
                  Analyse éphémère — rien n’est enregistré
                </span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    result.source === 'llm'
                      ? 'border border-gold-300 bg-gold-100 text-gold-900'
                      : 'border border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  {result.source === 'llm'
                    ? '✦ Analyse par IA'
                    : 'Mode dégradé (IA indisponible)'}
                </span>
              </p>
            </div>
          </div>

          {/* Findings */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <FindingList
              title="Points forts"
              items={result.analysis.strengths}
              tone="positive"
            />
            <FindingList
              title="Points faibles"
              items={result.analysis.weaknesses}
              tone="negative"
            />
          </div>

          {result.analysis.recommendations.length > 0 && (
            <div className="mt-6 rounded-xl border border-gold-200 bg-gold-50/50 p-4">
              <h4 className="text-sm font-semibold text-gold-900">
                Recommandations prioritaires
              </h4>
              <ul className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-700">
                {result.analysis.recommendations.map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Gated features — conversion overlay */}
          <div className="mt-8">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-gold-200" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">
                Débloquez tout le potentiel
              </p>
              <span className="h-px flex-1 bg-gold-200" aria-hidden="true" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {LOCKED_FEATURES.map((feature) => (
                <LockedFeatureCard
                  key={feature.title}
                  title={feature.title}
                  description={feature.description}
                  onUnlock={() => setIsModalOpen(true)}
                />
              ))}
            </div>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition-all hover:from-gold-500 hover:to-gold-600"
              >
                Créer un compte gratuitement pour débloquer
              </Link>
              <button
                type="button"
                onClick={resetFunnel}
                className="text-sm font-medium text-slate-500 underline transition-colors hover:text-slate-700"
              >
                Tester un autre CV
              </button>
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          Vous êtes connecté : retrouvez la gestion complète de vos CVs dans{' '}
          <Link href="/dashboard" className="font-medium text-gold-700 underline">
            votre tableau de bord
          </Link>
          .
        </p>
      )}

      <SignupModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <input
        ref={inputRef}
        type="file"
        name="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(event) => selectFile(event.target.files?.[0])}
        disabled={step === 'analyzing'}
      />
    </div>
  );
}