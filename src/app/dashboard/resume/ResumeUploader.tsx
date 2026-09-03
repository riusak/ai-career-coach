'use client';

import { useActionState, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  RESUME_ACCEPT_ATTRIBUTE,
  formatBytes,
  validateResumeFile,
} from '@/lib/resume-validation';
import ErrorModal from '@/components/ui/ErrorModal';
import Skeleton from '@/components/ui/Skeleton';
import SuccessBanner from '@/components/ui/SuccessBanner';
import { uploadResumeAction, type ResumeUploadState } from './actions';

export default function ResumeUploader() {
  const t = useTranslations('dashboard');
  const tErrors = useTranslations('errors');
  const initialState: ResumeUploadState = { success: false, message: null, data: null };
  const [state, formAction, isPending] = useActionState(uploadResumeAction, initialState);

  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  /** Server action error already dismissed through the blocking modal. */
  const [dismissedActionMessage, setDismissedActionMessage] = useState<string | null>(null);

  const clearSelection = () => {
    setSelectedFile(null);
    setClientError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // Server-side upload failures surface through the same blocking modal as
  // client-side validation errors; dismissal keeps them from re-popping.
  const actionError =
    state.message && !state.success && state.message !== dismissedActionMessage
      ? state.message
      : null;
  const isModalOpen = Boolean(clientError || actionError);
  const isRejection = Boolean(clientError);

  const closeErrorModal = () => {
    setClientError(null);
    setDismissedActionMessage(state.message);
  };

  // Clears the local selection up-front; server feedback (success or error)
  // is rendered from the action state below.
  const handleFormAction = (formData: FormData) => {
    clearSelection();
    formAction(formData);
  };

  const selectFile = (file: File | null | undefined) => {
    setClientError(null);

    if (!file) {
      return;
    }

    const validationError = validateResumeFile(file);
    if (validationError) {
      setClientError(validationError);
      clearSelection();
      return;
    }

    // Keep the form input in sync so the file is included in the FormData
    // when submitting (required for files added via drag-and-drop).
    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (inputRef.current) {
        inputRef.current.files = dataTransfer.files;
      }
      setSelectedFile(file);
    } catch {
      // DataTransfer is unavailable in rare environments; the hidden input
      // stays in sync through normal selection instead.
      setClientError(
        'Drag-and-drop is not supported in this browser. Please use the file picker.'
      );
      clearSelection();
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    selectFile(event.dataTransfer.files[0]);
  };

  return (
    <form action={handleFormAction} className="space-y-4">
      {/* Blocking centered error modal — replaces the old inline banner.
          Validation errors are document rejections; upload failures are
          technical errors. Both invite choosing another file. */}
      <ErrorModal
        open={isModalOpen}
        title={isRejection ? tErrors('rejectionTitle') : tErrors('actionFailedTitle')}
        description={clientError ?? actionError ?? ''}
        actionLabel={tErrors('retryChooseFile')}
        onAction={() => {
          closeErrorModal();
          clearSelection();
          inputRef.current?.click();
        }}
        onClose={closeErrorModal}
        titleId="resume-uploader-error-modal-title"
      />

      {state.success && state.message && (
        <div className="mb-4">
          <SuccessBanner
            title={t('uploadResumeTitle')}
            description={state.message}
          />
        </div>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragActive
            ? 'border-orange-500 bg-orange-50'
            : 'border-navy-200 bg-navy-50 hover:border-orange-400 hover:bg-orange-50'
        }`}
      >
        <svg
          className="mb-3 h-10 w-10 text-orange-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
          />
        </svg>
        <p className="text-sm font-medium text-navy-900">
          {t('uploadResumeTitle')}
        </p>
        <p className="mt-1 text-xs text-navy-500">
          {t('uploadResumeHints')}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        name="file"
        id="resume-file"
        accept={RESUME_ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(event) => selectFile(event.target.files?.[0])}
        disabled={isPending}
      />

      {selectedFile && (
        <div className="flex items-center justify-between rounded-lg border border-navy-100 bg-white px-4 py-3 text-sm shadow-sm">
          <div className="min-w-0">
            <p className="truncate font-medium text-navy-900">
              {selectedFile.name}
            </p>
            <p className="text-xs text-navy-500">
              {formatBytes(selectedFile.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            disabled={isPending}
            className="ml-4 shrink-0 text-sm font-medium text-navy-500 underline transition-colors hover:text-navy-700 disabled:opacity-50"
          >
            {t('changeFile') ?? 'Remove'}
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !selectedFile}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
              />
            </svg>
          )}
          {isPending ? t('uploadCta') + '…' : t('uploadCta')}
        </button>
      </div>

      {/* Shimmer skeleton mirroring the catalogue card being created —
          perceived performance: the upload feels already "in progress". */}
      {isPending && (
        <div
          aria-hidden="true"
          className="mt-4 rounded-xl border border-navy-100 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-56" />
          <Skeleton className="mt-1.5 h-3 w-40" />
        </div>
      )}
    </form>
  );
}
