'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Briefcase, CheckCircle2, X } from 'lucide-react';
import type { CvSummaryData } from '@/types/dashboard';
import type { JobMatching } from '@/types/matching';
import LatestMatchingCard from './LatestMatchingCard';
import MatchingOfferForm from './MatchingOfferForm';

/**
 * JobMatchModal — quick-access matching entry point (tabs, modals, CV cards).
 *
 * Reuses the shared `MatchingOfferForm` (file / URL / raw text) plus a
 * target-CV selector. Queueing goes through the same server action → the
 * modal switches to the live processing/result panel (LatestMatchingCard),
 * or — in redirect-on-queue mode used from the dashboard — sends the user to
 * the dedicated /dashboard/matching page (?queued=<id>).
 */

type ModalPhase = 'form' | 'processing' | 'completed';

interface JobMatchModalProps {
  open: boolean;
  onClose: () => void;
  cvs: CvSummaryData[];
  initialResumeId?: string | null;
  /** Quick-access mode: queue then redirect to the dedicated matching page
   *  (?queued=<id>) instead of showing the live view inside the modal. */
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
  const [phase, setPhase] = useState<ModalPhase>('form');
  const [queuedMatching, setQueuedMatching] = useState<JobMatching | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(
    initialResumeId ?? cvs[0]?.id ?? null
  );

  if (!open) {
    return null;
  }

  const closeModal = () => {
    void router.refresh();
    onClose();
  };

  /** Handles the freshly queued row from the server action. */
  const handleQueued = (matching: JobMatching) => {
    setQueuedMatching(matching);
    if (redirectOnQueue) {
      onClose();
      router.push(`/dashboard/matching?queued=${matching.id}`);
      return;
    }
    setPhase('processing');
  };

  /** Resets the flow so a new match can be launched in the same session. */
  const handleNewMatch = () => {
    setQueuedMatching(null);
    setPhase('form');
  };

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
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal header */}
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
            <div className="space-y-4">
              {/* Target CV */}
              <label className="block">
                <span className="text-xs font-bold text-slate-700">{t('matchingSelectCv')}</span>
                <select
                  id="job-match-cv-select"
                  value={selectedCvId ?? ''}
                  onChange={(event) => setSelectedCvId(event.target.value || null)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {cvs.length === 0 && <option value="">{t('matchingNoCv')}</option>}
                  {cvs.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.name}
                      {cv.isPrimary ? ' — ★' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <MatchingOfferForm
                resumeId={selectedCvId}
                selectedCvName={cvs.find((cv) => cv.id === selectedCvId)?.name}
                onQueued={handleQueued}
                layout="modal"
                showLocation
                idPrefix="modal"
              />
            </div>
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