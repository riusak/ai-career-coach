'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  ClipboardPaste,
  FileText,
  FileUp,
  Link2,
  Loader2,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  RESUME_ACCEPT_ATTRIBUTE,
  formatBytes,
  validateResumeFile,
} from '@/lib/resume-validation';
import type { JobMatching } from '@/types/matching';
import type { MatchingQueueState } from './actions';
import { queueJobMatchingAction } from './actions';

/** The three offer ingestion formats, mapped 1:1 to the source tabs. */
type OfferInputMode = 'file' | 'url' | 'text';

const OFFER_SOURCE_TABS: ReadonlyArray<{
  mode: OfferInputMode;
  labelKey: 'matchingTabFile' | 'matchingTabUrl' | 'matchingTabText';
  Icon: typeof FileUp;
}> = [
  { mode: 'file', labelKey: 'matchingTabFile', Icon: FileUp },
  { mode: 'url', labelKey: 'matchingTabUrl', Icon: Link2 },
  { mode: 'text', labelKey: 'matchingTabText', Icon: ClipboardPaste },
];

interface MatchingOfferFormProps {
  /** Id of the CV selected in Step 1 (hidden input of the submission form). */
  resumeId: string | null;
  /** Display name of the selected CV for the footer note (page layout). */
  selectedCvName?: string | null;
  /** Fired once the server action has queued the matching row. */
  onQueued: (matching: JobMatching) => void;
  /**
   * 'page' = template inline studio card (step header, template footer);
   * 'modal' = bare stacked form for the JobMatchModal (own error banners +
   * full-width CTA, optional location field).
   */
  layout?: 'page' | 'modal';
  /** Shows the optional location field (modal keeps its historical field). */
  showLocation?: boolean;
  /** Unique id prefix so the page and the modal inputs never collide. */
  idPrefix?: string;
}

/**
 * Shared job-offer submission form (Chart 7 template alignment). Used inline
 * on the /dashboard/matching studio page (Step 2) AND inside the quick-access
 * JobMatchModal, so the three ingestion formats (file / URL / raw text), the
 * metadata inputs and the queue contract stay in one place.
 *
 * The title field is optional per the template: when left empty, the SERVER
 * resolves it from the offer itself (document text, fetched URL page or raw
 * paste — see `extractOfferMetadata`) so the diagnostic headline always shows
 * a meaningful label. The worker refines it further at completion time.
 */

export default function MatchingOfferForm({
  resumeId,
  selectedCvName = null,
  onQueued,
  layout = 'page',
  showLocation = false,
  idPrefix = 'offer',
}: MatchingOfferFormProps) {
  const t = useTranslations('dashboard');
  const isPage = layout === 'page';
  const [inputMode, setInputMode] = useState<OfferInputMode>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [offerUrl, setOfferUrl] = useState('');
  const [offerText, setOfferText] = useState('');
  const [queueState, setQueueState] = useState<MatchingQueueState>({
    success: false,
    message: null,
    data: null,
  });
  const [isPending, setIsPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const switchTab = (mode: OfferInputMode) => {
    setInputMode(mode);
    setFileError(null);
  };

  const handleFileSelection = (file: File | undefined | null) => {
    if (!file) return;
    const validationError = validateResumeFile(file);
    if (validationError) {
      setFileError(validationError);
      setSelectedFile(null);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resumeId || isPending) return;
    const formData = new FormData(event.currentTarget);
    formData.set('resumeId', resumeId);
    if (inputMode === 'file') {
      if (!selectedFile) {
        setFileError(t('matchingFileRequired'));
        return;
      }
      formData.set('offerFile', selectedFile);
    }
    // Optional title per the template — an empty value is fine: the server
    // action extracts the title (and the worker refines it) from the offer.
    setIsPending(true);
    try {
      const next = await queueJobMatchingAction(queueState, formData);
      if (next.success && next.data) {
        onQueued(next.data);
        // Reset the submission for the next run (tabs + selection kept).
        setJobTitle('');
        setCompany('');
        setLocation('');
        setOfferUrl('');
        setOfferText('');
        clearSelectedFile();
        setQueueState({ success: false, message: null, data: null });
      } else {
        setQueueState(next);
      }
    } finally {
      setIsPending(false);
    }
  };

  const tabsNode = (
    <div
      role="tablist"
      aria-label={t('matchingOfferSource')}
      className="grid w-full grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 lg:w-auto"
    >
      {OFFER_SOURCE_TABS.map(({ mode, labelKey, Icon }) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={inputMode === mode}
          onClick={() => switchTab(mode)}
          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition-all sm:text-xs ${
            inputMode === mode ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      id={`${idPrefix}-form`}
      className={isPage ? 'rounded-2xl border border-slate-200 bg-white p-5 shadow-xs' : 'space-y-4'}
    >
      <input type="hidden" name="resumeId" value={resumeId ?? ''} />

      {/* Step header + source tabs (page layout) / bare tabs (modal layout). */}
      {isPage ? (
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
              2
            </span>
            <h3 className="text-sm font-bold text-slate-900">{t('matchingStepSubmitOffer')}</h3>
          </div>
          {tabsNode}
        </div>
      ) : (
        <div className="space-y-2.5">
          <span className="block text-xs font-bold text-slate-700">{t('matchingOfferSource')}</span>
          {tabsNode}
        </div>
      )}

      <div className="space-y-4">
        {/* Tab 1 — file ingestion (drag & drop, template dropzone). */}
        {inputMode === 'file' &&
          (selectedFile ? (
            <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 px-3.5 py-3">
              <FileText className="h-5 w-5 shrink-0 text-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(selectedFile.size)}</p>
              </div>
              <button
                type="button"
                onClick={clearSelectedFile}
                aria-label={t('matchingFileRemove')}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                handleFileSelection(event.dataTransfer.files?.[0]);
              }}
              className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                isDragging ? 'border-brand-400 bg-brand-50/60' : 'border-slate-200 bg-slate-50/60 hover:border-brand-300'
              }`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-[#FF7A00]">
                <UploadCloud className="h-6 w-6" />
              </span>
              <span className="text-sm font-bold text-slate-800">{t('matchingFileDropHint')}</span>
              <span className="text-xs text-slate-500">{t('matchingFileFormats')}</span>
            </button>
          ))}
        <input
          ref={fileInputRef}
          type="file"
          accept={RESUME_ACCEPT_ATTRIBUTE}
          onChange={(event) => handleFileSelection(event.target.files?.[0])}
          className="hidden"
        />
        {fileError && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
            {fileError}
          </p>
        )}

        {/* Tab 2 — public offer URL (fetched + parsed server-side). */}
        {inputMode === 'url' && (
          <div className="space-y-2">
            <label htmlFor={`${idPrefix}-url`} className="block text-xs font-bold text-slate-700">
              {t('matchingUrl')}
            </label>
            <input
              id={`${idPrefix}-url`}
              name="offerUrl"
              type="url"
              required
              value={offerUrl}
              onChange={(event) => setOfferUrl(event.target.value)}
              placeholder={t('matchingUrlPlaceholder')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="text-[11px] leading-relaxed text-slate-500">{t('matchingUrlTabHint')}</p>
          </div>
        )}

        {/* Tab 3 — raw pasted offer text. */}
        {inputMode === 'text' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor={`${idPrefix}-description`} className="text-xs font-bold text-slate-700">
                {t('matchingDescription')}
              </label>
              <span className="text-[11px] font-medium text-slate-400">
                {t('matchingDescriptionHint', { min: 20 })}
              </span>
            </div>
            <textarea
              id={`${idPrefix}-description`}
              name="jobDescription"
              required
              rows={7}
              maxLength={12000}
              value={offerText}
              onChange={(event) => setOfferText(event.target.value)}
              placeholder={t('matchingDescriptionPlaceholder')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        )}

        {/* Metadata — optional title + company (template Step 2 fields). */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-slate-700">{t('matchingJobTitle')}</span>
            <input
              name="jobTitle"
              type="text"
              maxLength={200}
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder={t('matchingJobPlaceholder')}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">{t('matchingCompany')}</span>
            <input
              name="company"
              type="text"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder={t('matchingCompanyPlaceholder')}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          {showLocation && (
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold text-slate-700">{t('matchingLocation')}</span>
              <input
                name="location"
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={t('matchingLocationPlaceholder')}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
          )}
        </div>

        {queueState.message && !queueState.success && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
            {queueState.message}
          </p>
        )}
      </div>

      {/* Footer — template footer (page) / full-width CTA (modal). */}
      {isPage ? (
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs">
            {resumeId && selectedCvName ? (
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {t('matchingSelectedCv', { name: selectedCvName })}
              </span>
            ) : (
              <span className="font-semibold text-slate-400">{t('matchingNoCvSelected')}</span>
            )}
          </div>
          <button
            type="submit"
            disabled={!resumeId || isPending}
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              !resumeId || isPending
                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                : 'cursor-pointer bg-brand-500 text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 active:scale-[0.98]'
            }`}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('matchingQueuePending')}
              </>
            ) : (
              <>{t('matchingQueueCta')}</>
            )}
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!resumeId || isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('matchingQueuePending')}
            </>
          ) : (
            <>{t('matchingQueueCta')}</>
          )}
        </button>
      )}
    </form>
  );
}
