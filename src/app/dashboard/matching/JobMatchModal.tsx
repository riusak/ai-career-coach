'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Briefcase, CheckCircle2, Loader2, Target, X } from 'lucide-react';
import type { CvSummaryData } from '@/types/dashboard';
import type { MatchingQueueState } from './actions';
import { queueJobMatchingAction } from './actions';
import LatestMatchingCard from './LatestMatchingCard';

/**
 * JobMatchModal — the real Phase 5.2 matching entry point.
 *
 * Step 1 « form »: pick the target CV, fill the offer metadata + paste the
 * offer text, and queue the matching through the server action (nothing runs
 * on upload — mirror of the deep-analysis contract).
 *
 * Step 2 « processing »: the queued row id is handed to LatestMatchingCard,
 * which triggers POST /api/resume/match exactly once, shows the shimmer
 * skeleton + waiting ticket, and polls until the diagnostic is ready.
 *
 * Step 3 « completed »: MatchingReport is rendered inline; closing refreshes
 * the matching-history list through router.refresh().
 */

type ModalPhase = 'form' | 'processing' | 'completed';

const MIN_OFFER_CHARS = 20;

interface JobMatchModalProps {
  open: boolean;
  onClose: () => void;
  cvs: CvSummaryData[];
  initialResumeId?: string | null;
  /**
   * Quick-access mode (dashboard card): queue the matching then redirect to
   * the dedicated /dashboard/matching page (?queued=<id>) instead of showing
   * the live processing view inside the modal.
   */
  redirectOnQueue?: boolean;
}

export default function JobMatchModal({
  open,
  onClose,
  cvs,
  initialResumeId,
  redirectOnQueue = false,
}: JobMatchModalProps) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const initialState: MatchingQueueState = { success: false, message: null, data: null };
  const [queueState, setQueueState] = useState<MatchingQueueState>(initialState);
  const [isPending, setIsPending] = useState(false);
  const [phase, setPhase] = useState<ModalPhase>('form');

  if (!open) {
    return null;
  }

  const closeModal = () => {
    void router.refresh();
    onClose();
  };

  /** Submits the offer form to the server action, then switches to the live
   *  processing view the moment the queued row exists (no effect, no cascade).
   *  In quick-access mode the user is redirected to the dedicated matching
   *  page which takes over the processing + result display. */
  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    const next = await queueJobMatchingAction(queueState, formData);
    setIsPending(false);
    setQueueState(next);
    if (next.success && next.data) {
      if (redirectOnQueue) {
        onClose();
        router.push(`/dashboard/matching?queued=${next.data.id}`);
        return;
      }
      setPhase('processing');
    }
  };

  /** Resets the whole flow so a new match can be launched in the same session. */
  const handleNewMatch = () => {
    setQueueState(initialState);
    setPhase('form');
  };

  const queuedMatching = queueState.data;

  return (
    <div
      id="job-match-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-match-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        id="job-match-modal-container"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <Briefcase className="h-5 w-5" />
            </span>
            <div>
              <h2 id="job-match-modal-title" className="text-base font-extrabold text-slate-900">
                {t('matchingModalTitle')}
              </h2>
              <p className="text-[11px] font-medium text-slate-500">{t('matchingModalSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label={t('matchingModalClose')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {phase === 'form' && (
            <form action={handleSubmit} className="space-y-4">
              {/* Target CV */}
              <label className="block">
                <span className="text-xs font-bold text-slate-700">{t('matchingSelectCv')}</span>
                <select
                  name="resumeId"
                  defaultValue={initialResumeId ?? cvs[0]?.id ?? ''}
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {cvs.length === 0 && <option value="">{t('matchingNoCv')}</option>}
                  {cvs.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.name}
                      {cv.isPrimary ? ' ⭐' : ''}
                    </option>
                  ))}
                </select>
              </label>

              {/* Offer metadata */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">{t('matchingJobTitle')}</span>
                  <input
                    name="jobTitle"
                    type="text"
                    required
                    maxLength={200}
                    placeholder={t('matchingJobPlaceholder')}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700">{t('matchingCompany')}</span>
                  <input
                    name="company"
                    type="text"
                    placeholder={t('matchingCompanyPlaceholder')}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700">{t('matchingLocation')}</span>
                  <input
                    name="location"
                    type="text"
                    placeholder={t('matchingLocationPlaceholder')}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700">{t('matchingUrl')}</span>
                  <input
                    name="sourceUrl"
                    type="url"
                    placeholder={t('matchingUrlPlaceholder')}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </label>
              </div>

              <input type="hidden" name="sourceType" value="text" />

              {/* Offer text */}
              <label className="block">
                <span className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{t('matchingDescription')}</span>
                  <span className="font-medium text-slate-400">
                    {t('matchingDescriptionHint', { min: MIN_OFFER_CHARS })}
                  </span>
                </span>
                <textarea
                  name="jobDescription"
                  required
                  rows={6}
                  maxLength={12_000}
                  placeholder={t('matchingDescriptionPlaceholder')}
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </label>

              {queueState.message && !queueState.success && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
                >
                  {queueState.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('matchingQueuePending')}
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    {t('matchingQueueCta')}
                  </>
                )}
              </button>
            </form>
          )}

          {phase === 'processing' && queuedMatching && (
            <LatestMatchingCard
              matchingId={queuedMatching.id}
              initialMatching={queuedMatching}
              onCompleted={() => setPhase('completed')}
            />
          )}

          {phase === 'completed' && queuedMatching && (
            <LatestMatchingCard
              key={queuedMatching.id}
              matchingId={queuedMatching.id}
              initialMatching={queuedMatching}
            />
          )}
        </div>

        {/* Footer */}
        {phase !== 'form' && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {phase === 'completed' ? t('matchingReadyHint') : t('matchingQueuedHint')}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {phase === 'completed' && (
                <button
                  type="button"
                  onClick={handleNewMatch}
                  className="rounded-xl border border-brand-200 bg-white px-4 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  {t('matchingNewAgain')}
                </button>
              )}
              <button
                type="button"
                onClick={
                  phase === 'completed'
                    ? () => {
                        void router.refresh();
                        onClose();
                      }
                    : closeModal
                }
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
              >
                {phase === 'completed' ? t('matchingDone') : t('matchingCancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}