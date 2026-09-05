'use client';

import { useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import {
  Activity,
  Briefcase,
  FileUp,
  LineChart,
  Search,
  Upload,
  Video,
} from 'lucide-react';
import { RESUME_ACCEPT_ATTRIBUTE, validateResumeFile } from '@/lib/resume-validation';

interface QuickActionsProps {
  /** True while a flash upload is in flight (disables the pickers). */
  isFlashUploading: boolean;
  /** Upload card: file picked → park it + redirect to /dashboard/cvs. */
  onUploadFileSelected: (file: File) => void;
  /** Analyse card: opens the « Aperçu » selector modal (no preset CV). */
  onAnalyseCv: () => void;
  /** Match card: opens the quick-access matching modal. */
  onMatchJobs: () => void;
  /** Mock card: opens the quick-access mock-interview modal. */
  onMockInterview: () => void;
}

/**
 * « Actions rapides » — port of the template's QuickActions.tsx wired to the
 * real flows: the upload card opens a native flash file picker (parked for
 * the CVs page), the analyse card opens the « Aperçu » selector modal, and
 * the match / mock cards open dedicated quick-access modals before
 * redirecting to their pages.
 */
export default function QuickActions({
  isFlashUploading,
  onUploadFileSelected,
  onAnalyseCv,
  onMatchJobs,
  onMockInterview,
}: QuickActionsProps) {
  const locale = useLocale();
  const isFrench = locale !== 'en';

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /** Reads (and resets) the picked file of a hidden input. */
  const pick = (input: HTMLInputElement | null): File | null => {
    const file = input?.files?.[0] ?? null;
    if (input) {
      input.value = '';
    }
    return file;
  };

  const actions = [
    {
      id: 'upload-cv',
      title: isFrench ? 'Téléverser un nouveau CV' : 'Upload Your CV',
      desc: isFrench
        ? 'Sélection directe de votre fichier : il vous attendra sur la page Mes CVs.'
        : 'Pick your file directly: it will be waiting for you on the CVs page.',
      icon: FileUp,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      error: uploadError,
      footer: (
        <>
          <button
            id="btn-upload-cv"
            type="button"
            disabled={isFlashUploading}
            onClick={() => {
              setUploadError(null);
              uploadInputRef.current?.click();
            }}
            className="inline-flex w-full items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0B1528] hover:bg-[#132238] text-white text-xs sm:text-[13px] font-semibold transition-all active:scale-98 cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-3.5 w-3.5 text-slate-300" />
            <span>{isFrench ? 'Choisir un fichier' : 'Choose a file'}</span>
          </button>
          {/* Flash picker — opens the native file dialog directly. */}
          <input
            ref={uploadInputRef}
            type="file"
            accept={RESUME_ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={() => {
              const file = pick(uploadInputRef.current);
              if (!file) return;
              const validationError = validateResumeFile(file);
              if (validationError) {
                setUploadError(validationError);
                return;
              }
              setUploadError(null);
              onUploadFileSelected(file);
            }}
            disabled={isFlashUploading}
          />
        </>
      ),
    },
    {
      id: 'analyse-cv',
      title: isFrench ? 'Analyser mon CV' : 'Analyse Your CV',
      desc: isFrench
        ? 'Sélectionnez l’un de vos CV ou téléversez-en un temporaire pour un aperçu immédiat.'
        : 'Pick one of your CVs or flash-upload a temporary one for an instant preview.',
      icon: LineChart,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      error: null,
      footer: (
        <>
          <button
            id="btn-analyse-cv"
            type="button"
            onClick={onAnalyseCv}
            className="inline-flex w-full items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0B1528] hover:bg-[#132238] text-white text-xs sm:text-[13px] font-semibold transition-all active:scale-98 cursor-pointer shadow-xs"
          >
            <Activity className="h-3.5 w-3.5 text-slate-300" />
            <span>{isFrench ? 'Lancer le test' : 'Start the test'}</span>
          </button>
        </>
      ),
    },
    {
      id: 'match-jobs',
      title: isFrench ? 'Matcher avec une offre' : 'Match Job Offer',
      desc: isFrench
        ? "Sélectionnez un CV et collez les exigences de l'offre dans la fenêtre rapide."
        : 'Pick a CV and paste the offer requirements in the quick modal.',
      icon: Briefcase,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-50',
      error: null,
      footer: (
        <button
          id="btn-match-jobs"
          type="button"
          onClick={onMatchJobs}
          className="inline-flex w-full items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-[13px] font-semibold transition-all active:scale-98 cursor-pointer"
        >
          <Search className="h-3.5 w-3.5 text-slate-600" />
          <span>{isFrench ? 'Évaluer une offre' : 'Evaluate Offer'}</span>
        </button>
      ),
    },
    {
      id: 'mock-interview',
      title: isFrench ? 'Simulateur d’entretien' : 'Mock Interview',
      desc: isFrench
        ? 'Choisissez le CV de référence et le poste ciblé, puis démarrez l’entraînement.'
        : 'Pick the reference CV and target role, then start practising.',
      icon: Video,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      error: null,
      footer: (
        <button
          id="btn-mock-interview"
          type="button"
          onClick={onMockInterview}
          className="inline-flex w-full items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-[13px] font-semibold transition-all active:scale-98 cursor-pointer"
        >
          <Video className="h-3.5 w-3.5 text-slate-600" />
          <span>{isFrench ? 'Démarrer' : 'Start Interview'}</span>
        </button>
      ),
    },
  ];

  return (
    <section
      id="quick-actions-section"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 shrink-0"
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <div
            key={action.id}
            id={action.id}
            className="relative bg-white rounded-3xl p-5 sm:p-5.5 lg:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
          >
            <div>
              {/* Icon Container */}
              <div
                className={`w-11 h-11 rounded-2xl ${action.iconBg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200`}
              >
                <Icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>

              {/* Title & Desc */}
              <h3 className="font-bold text-slate-900 text-[15px] sm:text-base mb-1.5">
                {action.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-3">
                {action.desc}
              </p>
            </div>

            {/* Action zone */}
            <div className="pt-4 mt-1 space-y-1.5">
              {action.footer}
              {action.error && (
                <p role="alert" className="text-[11px] font-semibold leading-snug text-red-600">
                  {action.error}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}