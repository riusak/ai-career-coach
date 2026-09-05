'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Info, Video, X } from 'lucide-react';
import type { CvSummaryData } from '@/types/dashboard';

interface MockInterviewQuickModalProps {
  open: boolean;
  onClose: () => void;
  cvs: CvSummaryData[];
  initialResumeId?: string | null;
}

/**
 * Quick-access modal for the « Mock Interview » dashboard card — mirrors the
 * matching quick modal: pick the reference CV (and optionally the target
 * role), then redirect to the dedicated /dashboard/mock page with the
 * context so the practice session starts from a pre-filled state.
 */
export default function MockInterviewQuickModal({
  open,
  onClose,
  cvs,
  initialResumeId,
}: MockInterviewQuickModalProps) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [selectedCvId, setSelectedCvId] = useState<string>(initialResumeId ?? cvs[0]?.id ?? '');
  const [targetRole, setTargetRole] = useState('');

  if (!open) {
    return null;
  }

  const handleStart = () => {
    const params = new URLSearchParams();
    if (selectedCvId) {
      params.set('cv', selectedCvId);
    }
    const role = targetRole.trim();
    if (role) {
      params.set('role', role);
    }
    const query = params.toString();
    onClose();
    router.push(query ? `/dashboard/mock?${query}` : '/dashboard/mock');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-quick-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <Video className="h-5 w-5" />
            </span>
            <div>
              <h2 id="mock-quick-modal-title" className="text-sm font-bold text-slate-900">
                {t('mockQuickTitle')}
              </h2>
              <p className="text-xs text-slate-500">{t('mockQuickSubtitle')}</p>
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

        {/* Form */}
        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">{t('mockQuickCvLabel')}</span>
            <select
              value={selectedCvId}
              onChange={(event) => setSelectedCvId(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {cvs.length === 0 && <option value="">{t('matchingNoCv')}</option>}
              {cvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.name}
                  {cv.isPrimary ? ' ★' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              {t('mockQuickRoleLabel')}
            </span>
            <input
              type="text"
              value={targetRole}
              maxLength={120}
              onChange={(event) => setTargetRole(event.target.value)}
              placeholder={t('mockQuickRolePlaceholder')}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Info className="h-3.5 w-3.5 text-brand-500" />
            {t('mockQuickHint')}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {t('matchingCancel')}
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={cvs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B1528] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#132238] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Video className="h-3.5 w-3.5" />
              {t('mockQuickStartCta')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}