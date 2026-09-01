'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { MAX_RESUME_FILE_SIZE_BYTES, formatBytes } from '@/lib/resume-validation';
import SignupModal from '@/components/landing/SignupModal';
import ConversionModal from '@/components/landing/ConversionModal';
import QuickTestResultSection, { ANALYSIS_STEP_KEYS } from '@/components/landing/QuickTestResult';
import ErrorState from '@/components/ui/ErrorState';
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

const STEP_DURATIONS_MS = [1600, 3400, 8000] as const;

export default function QuickTestFunnel({ isAuthenticated }: QuickTestFunnelProps) {
  const t = useTranslations('landing');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const [step, setStep] = useState<FunnelStep>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
    const [result, setResult] = useState<QuickTestResponse | null>(null);
  // True when the server answered with a heuristic-fallback analysis (source
  // !== 'llm'): a visible warning banner with a retry action is rendered in
  // the results portal instead of relying on the small "Mode dégradé" badge.
  const [degradedNotice, setDegradedNotice] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  /**
   * Returns the server-rendered portal root (`#quick-test-results-root`).
   * Read directly at render time — no state/effect needed, the node is part
   * of the static HTML and never disappears, so a single DOM lookup is enough.
   */
  const getPortalTarget = useCallback(() => {
    if (typeof document === 'undefined') {
      return null;
    }
    return document.getElementById('quick-test-results-root');
  }, []);

  /** Smoothly bring the results section (just below the fold) into view.
   *  Re-targets the inner `#resultats-analyse` once it mounts so the user
   *  always lands on the freshly-painted result card. */
  const scrollToResults = useCallback(() => {
    const target =
      document.getElementById('resultats-analyse') ?? getPortalTarget();
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [getPortalTarget]);

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

  // Conversion modal: déclenche 1s après l'affichage du résultat pour un
  // visiteur non authentifié, pour laisser lire son score en premier.
  useEffect(() => {
    if (step === 'result' && result && !isAuthenticated) {
      const timer = setTimeout(() => setShowConversionModal(true), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step, result, isAuthenticated]);

const clearSelection = useCallback(() => {
    setSelectedFile(null);
    // Back to the dropzone: leaving `step` on 'ready' with a null file would
    // unmount the whole block and freeze the funnel on a blank screen (the
    // "Changer" bug).
    setStep('idle');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const resetFunnel = useCallback(() => {
    clearSelection();
    setClientError(null);
    setServerError(null);
    setDegradedNotice(false);
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
const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx');
if (!isPdf && !isDocx) {
        setClientError(t('errorNotPdf'));
        clearSelection();
        return;
      }
      if (file.size <= 0) {
        setClientError(t('errorEmpty'));
        clearSelection();
        return;
      }
      if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
        setClientError(
          t('errorTooLarge', {
            size: formatBytes(file.size),
            max: formatBytes(MAX_RESUME_FILE_SIZE_BYTES),
          })
        );
        clearSelection();
        return;
      }

      setSelectedFile(file);
      setStep('ready');
    },
    [clearSelection, t]
  );

  const runAnalysis = useCallback(async () => {
    if (!selectedFile) {
      return;
    }

    setServerError(null);
    // Reset the "billet d'attente" and the degraded-mode notice before each
    // new run (also handles the retry case where a previous analysis already
    // advanced the steps).
    setAnalysisStep(0);
    setDegradedNotice(false);
    setStep('analyzing');

    // Guided navigation: the results area (skeleton first) sits just below
    // the fold — glide down to it as soon as the analysis starts. Two
    // requests: one immediately for the skeleton, one after the report
    // replaces it so the user lands on the freshly-painted result card
    // (the section's height changes once the skeleton becomes a real grid).
    window.setTimeout(scrollToResults, 120);
    window.setTimeout(scrollToResults, 1200);

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
        throw new Error(payload.error ?? t('errorGeneric'));
      }

      const payload: QuickTestResponse = await response.json();
      // Successful API call: only flag the degraded state when the analysis
      // genuinely fell back to the heuristic engine — a real LLM result
      // displays the full AI-powered scores with no warning.
      setDegradedNotice(payload.source !== 'llm');
      setResult(payload);
      setStep('result');
    } catch (error) {
      let message = t('errorGeneric');
      if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        message = t('errorTimeout');
      } else if (error instanceof Error) {
        message = error.message;
      }
      setServerError(message);
      setStep('ready');
    }
  }, [selectedFile, scrollToResults, t]);

  const errorMessage = clientError ?? serverError;

  return (
    <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-xl shadow-orange-100/60 sm:p-8">
      {step === 'idle' && (
        <div>
          {/* Local validation errors (non-PDF, empty, oversized file) are set
              by selectFile right before clearSelection() returns here — they
              must stay visible on the dropzone, not vanish with the card. */}
          {clientError && (
            <div className="mb-4">
              <ErrorState title={t('errorTitle')} description={clientError} />
            </div>
          )}
          <div
            role="button"
            tabIndex={0}
            aria-label={t('dragDrop')}
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
                ? 'border-orange-500 bg-orange-50'
                : 'border-orange-300 bg-orange-50/40 hover:border-orange-400 hover:bg-orange-50'
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
              className="h-12 w-12 text-orange-600"
            >
              <path d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            <p className="mt-4 text-base font-semibold text-slate-900">
              {t('dragDrop')}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {tCommon('or')}{' '}
              <span className="font-medium text-orange-700 underline decoration-orange-300 underline-offset-2">
                {t('browse')}
              </span>
            </p>
            <p className="mt-4 text-xs text-slate-500">{t('fileHints')}</p>
          </div>

          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              {t('trustFree')}
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              {t('trustNoSignup')}
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              {t('trustFast')}
            </span>
          </p>
        </div>
      )}

      {step === 'ready' && selectedFile && (
        <div aria-live="polite">
          {errorMessage && (
            <div className="mb-4">
              <ErrorState
                title={t('errorTitle')}
                description={errorMessage}
              >
                {serverError && selectedFile && (
                  <button
                    type="button"
                    onClick={runAnalysis}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
                  >
                    {tCommon('retry')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
                >
                  {tCommon('cancel')}
                </button>
              </ErrorState>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-xs font-bold uppercase text-orange-700">
                {t('fileLabel')}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {t('readySize', { size: formatBytes(selectedFile.size) })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                clearSelection();
                // Reopen the OS file picker right away: "Changer" must swap
                // the file in one gesture, not just silently clear it.
                inputRef.current?.click();
              }}
              className="ml-3 shrink-0 text-sm font-medium text-slate-500 underline transition-colors hover:text-slate-700"
            >
              {t('changeFile')}
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={runAnalysis}
              className="flex-1 rounded-lg bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition-all hover:from-orange-500 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2"
            >
              {t('analyzeButton')}
            </button>
            <button
              type="button"
              onClick={resetFunnel}
              className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {tCommon('cancel')}
            </button>
          </div>
        </div>
      )}

{step === 'analyzing' && (
        <div aria-live="polite" className="flex items-center gap-3 py-2">
          <span
            aria-hidden="true"
            className="relative flex h-2.5 w-2.5 shrink-0"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
          </span>
          <p className="text-sm font-semibold text-slate-900">
            {t('analyzingInline')}
          </p>
          <p className="text-xs text-slate-500">
            {t(`analysisSteps.${ANALYSIS_STEP_KEYS[analysisStep]}`)}
          </p>
        </div>
      )}

      {step === 'result' && result && (
        <div
          aria-live="polite"
          className="animate-fade-up flex flex-col items-center justify-center gap-5 py-6 text-center"
        >
          {/* "Analysé" badge — confirms the report is ready below the fold. */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-3.5 w-3.5"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {t('resultBadge')}
          </span>

          {/* Principal logo — large, centered, clean reveal. */}
          <Image
            src="/branding/logo-primary-light.png"
            alt={tCommon('appName')}
            width={560}
            height={163}
            priority
            className="animate-fade-up h-28 w-auto object-contain sm:h-36"
          />

          <p className="max-w-xs text-xs text-navy-600">
            {t('resultSubtext')}
          </p>

          <button
            type="button"
            onClick={resetFunnel}
            className="text-xs font-medium text-navy-500 underline transition-colors hover:text-navy-800"
          >
            {t('testAnother')}
          </button>
        </div>
      )}

      {/* Below-the-fold results: portaled into the server-rendered root so the
          Hero card stays 100% stable. Renders the skeleton during analysis and
          the full bento report once the payload arrives. */}
      {(step === 'analyzing' || step === 'result') &&
        (() => {
          const target = getPortalTarget();
          if (!target) {
            return null;
          }
          return createPortal(
            <>
              {/* Degraded-mode warning: the server answered 200 but with the
                  heuristic engine. Explicit, actionable feedback — the visitor
                  can re-run the analysis to try for a real AI result. */}
              {step === 'result' && degradedNotice && (
                <div
                  role="alert"
                  className="animate-fade-up mb-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                    >
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                      <path d="M12 9v4M12 17h.01" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        {t('degradedTitle')}
                      </p>
                      <p className="mt-0.5 text-xs text-amber-800">
                        {t('degradedDescription')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={runAnalysis}
                    className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  >
                    {t('degradedRetry')}
                  </button>
                </div>
              )}
              <QuickTestResultSection
                status={step === 'result' ? 'result' : 'analyzing'}
                result={result}
                analysisStep={analysisStep}
                onUnlock={() => setIsModalOpen(true)}
                onReset={resetFunnel}
              />
            </>,
            target
          );
        })()}
      {isAuthenticated && (
        <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          <Link href="/dashboard" className="font-medium text-orange-700 underline">
            {tNav('dashboard')}
          </Link>
        </p>
      )}

      <SignupModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
<ConversionModal
  isOpen={showConversionModal}
  onClose={() => setShowConversionModal(false)}
/>

      <input
        ref={inputRef}
        type="file"
        name="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(event) => selectFile(event.target.files?.[0])}
        disabled={step === 'analyzing'}
      />
    </div>
  );
}