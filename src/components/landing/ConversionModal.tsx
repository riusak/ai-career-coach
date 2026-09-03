'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface ConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal de conversion non bloquante.
 *
 * S'affiche une fois les résultats du Quick Test rendus visibles, mais ne
 * l'empêche jamais l'utilisateur de relancer un nouveau test gratuit.
 */
export default function ConversionModal({ isOpen, onClose }: ConversionModalProps) {
  const t = useTranslations('landing');
  const tCommon = useTranslations('common');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      aria-hidden={!isOpen}
    >
      <div className="relative mx-4 max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
          aria-label={tCommon('close')}
        >
          ✕
        </button>

        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v6m-3 3h6M12 15l3-3m-3 3l-3-3"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {t('conversionModal.title')}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {t('conversionModal.subtitle')}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/signup"
            onClick={() => {
              // Tracking de conversion fire-and-forget : ne doit jamais
              // gêner la navigation (échec réseau silencieux).
              void fetch('/api/quick-test/cta', { method: 'POST' }).catch(() => {});
              onClose();
            }}
            className="rounded-lg bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-2.5 text-center text-sm font-semibold text-slate-950 shadow-md transition-all hover:from-orange-500 hover:to-orange-600"
          >
            {t('conversionModal.cta')}
          </Link>
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            {t('conversionModal.skip')}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          {t('conversionModal.reassurance')}
        </p>
      </div>
    </div>
  );
}

export { ConversionModal as FragmentConversion };
export { Fragment };
