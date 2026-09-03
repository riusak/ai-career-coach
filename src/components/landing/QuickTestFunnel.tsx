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
import ErrorModal from '@/components/ui/ErrorModal';
import { parseQuickTestError, QUICK_TEST_DOCUMENT_TYPES } from '@/lib/quick-test/error-codes';
import type { QuickTestResponse } from '@/types/quick-test';

/**
 * Visitor Quick Test funnel (docs/product/mvp.md §2): drag & drop a PDF,
 * validate it locally, then trigger the free ephemeral analysis. The result
 * preview converts by gating deeper features behind sign-up CTAs.
 */

type FunnelStep = 'idle' | 'ready' | 'analyzing' | 'result';

interface RejectionState {
  title: string;
  message: string;
  actionLabel: string;
  action: 'reset' | 'retry';
}

interface QuickTestFunnelProps {
  isAuthenticated: boolean;
}

/**
 * Wraps a structured API error payload (code / documentType / documentKind)
 * so the catch block can build the precise rejection message.
 */
class ApiAnalysisError extends Error {
  constructor(readonly apiPayload: ReturnType<typeof parseQuickTestError>) {
    super('api-analysis-error');
  }
}

export default function QuickTestFunnel({ isAuthenticated }: QuickTestFunnelProps) {
  const t = useTranslations('landing');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const tErrors = useTranslations('errors');
  const [step, setStep] = useState<FunnelStep>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  /** Non-null when the blocking error modal is displayed (rejection or failure). */
  const [rejection, setRejection] = useState<RejectionState | null>(null);
  const [result, setResult] = useState<QuickTestResponse | null>(null);
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
    const target = document.getElementById('resultats-analyse') ?? getPortalTarget();
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [getPortalTarget]);

  // "Billet d'attente" — the server streams the REAL pipeline stages
  // (reading → analyzing → reporting) and each `progress` NDJSON line
  // advances the ticket in lockstep with the actual API work. The timers
  // below are a pure FALLBACK for hosts that buffer streamed responses:
  // they only ever move FORWARD, so genuine stage events always win and
  // the ticket can never freeze on step 1.
  useEffect(() => {
    if (step !== 'analyzing') {
      return;
    }
    const toAnalyzing = setTimeout(
      () => setAnalysisStep((current) => (current < 1 ? 1 : current)),
      3_500,
    );
    const toReporting = setTimeout(
      () => setAnalysisStep((current) => (current < 2 ? 2 : current)),
      9_500,
    );
    return () => {
      clearTimeout(toAnalyzing);
      clearTimeout(toReporting);
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
    setRejection(null);
    setResult(null);
    setStep('idle');
  }, [clearSelection]);

  /** Closes the modal and either resets the funnel or lets the user retry. */
  const handleRejectionAction = useCallback(() => {
    const current = rejection;
    setRejection(null);
    if (current?.action === 'reset') {
      resetFunnel();
      // Reopen the OS file picker: the smooth "invite to try again" gesture.
      inputRef.current?.click();
    }
    // action 'retry': the modal simply closes on the 'ready' step, where the
    // "Analyser mon CV" button re-runs the analysis with the selected file.
  }, [rejection, resetFunnel]);

  /** Localized label for an LLM-detected document type (safe fallback). */
  const documentTypeLabel = useCallback(
    (documentType: string): string => {
      const key = (QUICK_TEST_DOCUMENT_TYPES as readonly string[]).includes(documentType)
        ? documentType
        : 'other';
      return tErrors(`docType.${key}`);
    },
    [tErrors]
  );

  const selectFile = useCallback(
    (file: File | null | undefined) => {
      setRejection(null);

      if (!file) {
        return;
      }

      // Visitor mode: PDF + Word (.docx), 5 MB max (mvp.md §2.2).
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isDocx =
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.docx');
      if (!isPdf && !isDocx) {
        setRejection({
          title: tErrors('rejectionTitle'),
          message: tErrors('unsupportedFormat'),
          actionLabel: tErrors('retryChooseFile'),
          action: 'reset',
        });
        clearSelection();
        return;
      }
      if (file.size <= 0) {
        setRejection({
          title: tErrors('rejectionTitle'),
          message: t('errorEmpty'),
          actionLabel: tErrors('retryChooseFile'),
          action: 'reset',
        });
        clearSelection();
        return;
      }
      if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
        setRejection({
          title: tErrors('rejectionTitle'),
          message: t('errorTooLarge', {
            size: formatBytes(file.size),
            max: formatBytes(MAX_RESUME_FILE_SIZE_BYTES),
          }),
          actionLabel: tErrors('retryChooseFile'),
          action: 'reset',
        });
        clearSelection();
        return;
      }

      setSelectedFile(file);
      setStep('ready');
    },
    [clearSelection, t, tErrors]
  );

  const runAnalysis = useCallback(async () => {
    if (!selectedFile) {
      return;
    }

    setRejection(null);
    // Reset the "billet d'attente" before each new run (also handles the
    // retry case where a previous analysis already advanced the steps).
    setAnalysisStep(0);
    setStep('analyzing');

    // Guided navigation: the results area (skeleton first) sits just below
    // the fold — glide down to it as soon as the analysis starts. Two
    // requests: one immediately for the skeleton, one after the report
    // replaces it so the user lands on the freshly-painted result card
    // (the section's height changes once the skeleton becomes a real grid).
    window.setTimeout(scrollToResults, 120);
    window.setTimeout(scrollToResults, 1200);

    // Declared OUTSIDE the try block so the `finally` below can always
    // release the stream lock (result, error, timeout or abort).
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Client-side safety net: never leave the visitor stuck on the loading
      // state if the network or the LLM pipeline hangs. The server streams NDJSON
      // (one message per pipeline stage + a single terminal `result`/`error`),
      // so we parse it line-by-line and advance the progress ticket in real time.
      const response = await fetch('/api/quick-test', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(45_000),
      });

      // HTTP-level failure (bad request, server error before streaming) :
      // mirror the legacy JSON-payload rejection path.
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        throw new ApiAnalysisError(parseQuickTestError(payload));
      }

      if (!response.body) {
        throw new ApiAnalysisError(parseQuickTestError(null));
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        // NDJSON = newline-delimited JSON: a complete message ends with '\n',
        // so flush one JSON object per complete line and keep the remainder.
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (line === '') {
            continue;
          }

          let message: unknown;
          try {
            message = JSON.parse(line);
          } catch {
            continue; // Defensive: skip a malformed line, keep reading.
          }

          if (
            typeof message === 'object' &&
            message !== null &&
            'type' in message
          ) {
            const msg = message as Record<string, unknown>;
            const type = msg.type;

            if (type === 'progress') {
              const stage = typeof msg.stage === 'string' ? msg.stage : '';
              // Advance the visible ticket in lockstep with the pipeline:
              // reading → analyzing → reporting.
              if (stage === 'analyzing') {
                setAnalysisStep(1);
              } else if (stage === 'reporting') {
                setAnalysisStep(2);
              }
              continue;
            }

            if (type === 'result') {
              const payload = msg as unknown as QuickTestResponse;
              // Successful API call: the report is always a real LLM analysis —
              // heuristic fallbacks no longer exist (failures surface as errors).
              setResult(payload);
              setStep('result');
              return; // terminal — stop reading.
            }

            if (type === 'error') {
              const err = msg as {
                error?: string;
                code?: string;
                documentType?: string;
                documentKind?: string;
              };
              throw new ApiAnalysisError(
                parseQuickTestError({
                  error: err.error,
                  code: err.code,
                  ...(err.documentType ? { documentType: err.documentType } : {}),
                  ...(err.documentKind ? { documentKind: err.documentKind } : {}),
                }),
              );
            }
          }
        }
      }

      // Stream closed without a terminal message → guard against a pipeline
      // that ended abruptly (should not happen, but never hang the UI).
      throw new ApiAnalysisError(parseQuickTestError(null));
    } catch (error) {
      // Blocking centered modal — never an inline banner. Rejections
      // (not_a_cv, unsupported_format) invite choosing another file;
      // technical failures invite retrying the analysis.
      if (
        error instanceof DOMException &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      ) {
        setRejection({
          title: tErrors('analysisFailedTitle'),
          message: t('errorTimeout'),
          actionLabel: tErrors('retryAnalysis'),
          action: 'retry',
        });
        setStep('ready');
        return;
      }

      if (error instanceof ApiAnalysisError && error.apiPayload) {
        const payload = error.apiPayload;
        if (payload.code === 'not_a_cv' && payload.documentKind === 'pdf') {
          // Multimodal PDF: dynamic, typed rejection message.
          setRejection({
            title: tErrors('rejectionTitle'),
            message: tErrors('notCvTyped', {
              type: documentTypeLabel(payload.documentType ?? 'other'),
            }),
            actionLabel: tErrors('retryChooseFile'),
            action: 'reset',
          });
          setStep('ready');
          return;
        }
        if (payload.code === 'not_a_cv') {
          // DOCX (text extraction path): clean, elegant generic rejection.
          setRejection({
            title: tErrors('rejectionTitle'),
            message: tErrors('notCvGeneric'),
            actionLabel: tErrors('retryChooseFile'),
            action: 'reset',
          });
          setStep('ready');
          return;
        }
        if (payload.code === 'unsupported_format') {
          setRejection({
            title: tErrors('rejectionTitle'),
            message: tErrors('unsupportedFormat'),
            actionLabel: tErrors('retryChooseFile'),
            action: 'reset',
          });
          setStep('ready');
          return;
        }
        // Technical failure (llm_failed / llm_unavailable / rate_limited /
        // server_error): server fallback message + explicit retry.
        setRejection({
          title: tErrors('analysisFailedTitle'),
          message: payload.error || t('errorGeneric'),
          actionLabel: tErrors('retryAnalysis'),
          action: 'retry',
        });
        setStep('ready');
        return;
      }

      setRejection({
        title: tErrors('analysisFailedTitle'),
        message: t('errorGeneric'),
        actionLabel: tErrors('retryAnalysis'),
        action: 'retry',
      });
      setStep('ready');
    } finally {
      // Always release the stream lock — result, error, timeout or abort.
      reader?.releaseLock();
    }
  }, [selectedFile, scrollToResults, t, tErrors, documentTypeLabel]);

  return (
    <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-xl shadow-orange-100/60 sm:p-8">
      {step === 'idle' && (
        <div>
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
            <p className="mt-4 text-base font-semibold text-slate-900">{t('dragDrop')}</p>
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
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-xs font-bold uppercase text-orange-700">
                {t('fileLabel')}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{selectedFile.name}</p>
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
          <span aria-hidden="true" className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
          </span>
          <p className="text-sm font-semibold text-slate-900">{t('analyzingInline')}</p>
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

          <p className="max-w-xs text-xs text-navy-600">{t('resultSubtext')}</p>

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
      <ConversionModal isOpen={showConversionModal} onClose={() => setShowConversionModal(false)} />

      {/* Global blocking error modal: document rejections ("Document non
          conforme" + precise dynamic message) and analysis failures
          ("Échec de l'analyse"). Replaces the old inline banners.
          PORTALED to document.body: the funnel sits inside a landing
          <Reveal> wrapper whose `translate`/`transform` creates a CSS
          containing block — that would hijack the modal's `position: fixed`
          and offset it from the viewport once the user scrolls. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <ErrorModal
            open={rejection !== null}
            title={rejection?.title ?? ''}
            description={rejection?.message ?? ''}
            actionLabel={rejection?.actionLabel ?? ''}
            onAction={handleRejectionAction}
            titleId="quick-test-error-modal-title"
          />,
          document.body
        )}

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
