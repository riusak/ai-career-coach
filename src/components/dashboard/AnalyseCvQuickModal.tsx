'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import type { CvDetailData } from '@/types/dashboard';
import { formatRelativeTime } from '@/lib/dashboard/relative-time';
import { RESUME_ACCEPT_ATTRIBUTE, validateResumeFile } from '@/lib/resume-validation';

interface AnalyseCvQuickModalProps {
  open: boolean;
  onClose: () => void;
  /** Existing CVs — the user must explicitly pick one (no preset selection). */
  cvs: CvDetailData[];
  /** Fired when an existing CV is selected (opens its preview). */
  onSelectCv: (cv: CvDetailData) => void;
  /** Fired with the flash-uploaded file (uploads + opens the preview). */
  onFlashUploadFile: (file: File) => void;
  /** True while the flash upload is in flight. */
  isUploading: boolean;
}

function scoreClass(score: number | null): string {
  if (score === null) return 'text-slate-400';
  if (score >= 60) return 'text-emerald-600';
  if (score >= 50) return 'text-brand-500';
  return 'text-orange-600';
}

/**
 * « Aperçu » — quick-access selector opened from the « Analyser mon CV » card.
 * Lists the user's existing CVs (the user MUST select one to preview it, no
 * default CV is pre-selected) and offers a flash file picker at the bottom to
 * upload a temporary document and preview it immediately.
 */
export default function AnalyseCvQuickModal({
  open,
  onClose,
  cvs,
  onSelectCv,
  onFlashUploadFile,
  isUploading,
}: AnalyseCvQuickModalProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [flashError, setFlashError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleFile = (file: File | null | undefined) => {
    setFlashError(null);
    if (!file) return;
    const validationError = validateResumeFile(file);
    if (validationError) {
      setFlashError(validationError);
      return;
    }
    onFlashUploadFile(file);
  };

  return (
    <div
      id="analyse-cv-quick-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analyse-cv-quick-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h2 id="analyse-cv-quick-modal-title" className="text-sm font-bold text-slate-900">
                {t('analyseQuickTitle')}
              </h2>
              <p className="text-xs text-slate-500">{t('analyseQuickSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('matchingModalClose')}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — CV list + flash upload */}
        <div className="flex-1 overflow-y-auto space-y-3 px-6 py-5">
          {cvs.length > 0 ? (
            <ul className="space-y-2">
              {cvs.map((cv) => (
                <li key={cv.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCv(cv)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition-all hover:border-brand-400 hover:bg-brand-50/40"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition-colors group-hover:bg-brand-100 group-hover:text-brand-500">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900" title={cv.name}>
                          {cv.name}
                          {cv.isPrimary ? ` · ${t('primaryBadge')}` : ''}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {formatRelativeTime(cv.createdAt, locale)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg bg-slate-50 px-2 py-1 text-xs font-black ${scoreClass(cv.score)}`}
                    >
                      {cv.score !== null ? `${cv.score}%` : '—'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
              {t('analyseQuickNoCv')}
            </p>
          )}
          {/* Flash upload — bottom of the list */}
          <div className="border-t border-slate-100 pt-3">
            <button
              id="btn-analyse-quick-upload"
              type="button"
              disabled={isUploading}
              onClick={() => {
                setFlashError(null);
                inputRef.current?.click();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-700 transition-all hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  {t('analyseQuickUploading')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 text-emerald-600" />
                  {t('analyseQuickUploadCta')}
                </>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={RESUME_ACCEPT_ATTRIBUTE}
              className="hidden"
              onChange={() => {
                const file = inputRef.current?.files?.[0] ?? null;
                if (inputRef.current) {
                  inputRef.current.value = '';
                }
                handleFile(file);
              }}
              disabled={isUploading}
            />
            {flashError && (
              <p role="alert" className="mt-2 text-[11px] font-semibold leading-snug text-red-600">
                {flashError}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
          <p className="text-[11px] font-semibold text-slate-500">
            {t('analyseQuickHint')}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('matchingCancel')}
          </button>
        </div>
      </div>
    </div>
  );
}