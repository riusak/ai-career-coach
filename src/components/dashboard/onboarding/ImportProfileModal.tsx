'use client';

import { useActionState, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, FileUp, Loader2, X } from 'lucide-react';
import {
  RESUME_ACCEPT_ATTRIBUTE,
  formatBytes,
  validateResumeFile,
} from '@/lib/resume-validation';
import { importProfileFromResumeAction } from '@/app/dashboard/onboarding-actions';
import type { ProfileImportState } from '@/types/profile-import';

interface ImportProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const INITIAL_STATE: ProfileImportState = {
  success: false,
  message: null,
  resumeId: null,
  fileName: null,
  summary: null,
};

/**
 * « Smart Profile Import » — drag & drop / file picker for a LinkedIn export
 * or a standard CV. The upload goes through the standard secured resume
 * pipeline and the existing LLM pipeline extracts career history, skills,
 * education & certifications, pre-filling the profile & roadmap.
 */
export default function ImportProfileModal({ open, onClose }: ImportProfileModalProps) {
  const t = useTranslations('onboarding');
  const locale = useLocale();
  const router = useRouter();
  const isFrench = locale !== 'en';
  const [state, formAction, isPending] = useActionState(importProfileFromResumeAction, INITIAL_STATE);

  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  if (!open) return null;

  const clearSelection = () => {
    setSelectedFile(null);
    setClientError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const selectFile = (file: File | null | undefined) => {
    setClientError(null);
    if (!file) return;
    const validationError = validateResumeFile(file);
    if (validationError) {
      setClientError(validationError);
      clearSelection();
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = (formData: FormData) => {
    clearSelection();
    formAction(formData);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10 text-brand-500">
              <FileUp className="h-4 w-4" />
            </span>
            <h3 id="import-profile-title" className="text-base font-extrabold text-slate-900">
              {t('importTitle')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label={t('welcomeClose')}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {state.success ? (
            <div className="space-y-4 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-900">{t('importSuccessTitle')}</h4>
                <p className="mt-1 text-xs text-slate-500">{t('importSuccessDesc')}</p>
              </div>
              {state.summary && (
                <dl className="grid grid-cols-2 gap-2.5 text-left">
                  {([
                    ['experiences', state.summary.experiences],
                    ['skills', state.summary.skills],
                    ['educations', state.summary.educations],
                    ['certifications', state.summary.certifications],
                  ] as const).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {t(`importCount.${key}`)}
                      </dt>
                      <dd className="mt-0.5 text-lg font-black text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push('/dashboard/profile');
                  }}
                  className="w-full cursor-pointer rounded-xl bg-[#0B1528] px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-brand-500 active:scale-[0.98]"
                >
                  {t('importReviewProfile')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                >
                  {t('importDone')}
                </button>
              </div>
            </div>
          ) : (
            <form action={handleSubmit}>
              <p className="text-xs leading-relaxed text-slate-500">{t('importHint')}</p>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                  selectFile(event.dataTransfer.files?.[0]);
                }}
                className={`mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  isDragActive
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-slate-300 bg-slate-50/60'
                }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-500 shadow-xs">
                  <FileUp className="h-6 w-6" />
                </span>
                <p className="text-sm font-bold text-slate-800">
                  {isFrench ? 'Glissez votre CV ou profil LinkedIn' : 'Drop your resume or LinkedIn PDF'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isFrench
                    ? 'PDF ou Word (.pdf / .docx) · 5 Mo max'
                    : 'PDF or Word (.pdf / .docx) · 5 MB max'}
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={isPending}
                  className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0B1528] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#132238] active:scale-[0.98] disabled:opacity-60"
                >
                  <FileUp className="h-3.5 w-3.5 text-slate-300" />
                  {isFrench ? 'Choisir un fichier' : 'Choose a file'}
                </button>
              </div>

              <input
                ref={inputRef}
                type="file"
                name="file"
                accept={RESUME_ACCEPT_ATTRIBUTE}
                className="hidden"
                onChange={(event) => selectFile(event.target.files?.[0])}
                disabled={isPending}
              />

              {selectedFile && !isPending && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatBytes(selectedFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="shrink-0 text-xs font-medium text-slate-400 underline-offset-2 transition-colors hover:text-slate-600 hover:underline"
                  >
                    {isFrench ? 'Retirer' : 'Remove'}
                  </button>
                </div>
              )}

              {(clientError || (state.message && !state.success)) && (
                <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                  {clientError ?? state.message}
                </p>
              )}

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 disabled:opacity-50"
                >
                  {t('welcomeClose')}
                </button>
                <button
                  type="submit"
                  disabled={isPending || !selectedFile}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t('importPending')}
                    </>
                  ) : (
                    <>
                      <FileUp className="h-3.5 w-3.5" />
                      {t('importCta')}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}