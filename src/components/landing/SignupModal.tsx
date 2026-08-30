'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Conversion modal gating the Quick Test advanced features: shown when a
 * visitor interacts with locked (members-only) results. Purely presentational
 * — account creation still happens on /signup.
 */

interface SignupModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SignupModal({ open, onClose }: SignupModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-gold-200 bg-white p-8 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-slate-950 shadow-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-5 w-5"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2
          id="signup-modal-title"
          className="mt-4 text-xl font-bold tracking-tight text-slate-900"
        >
          Créez un compte gratuitement pour débloquer
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Votre aperçu gratuit reste éphémère. Avec un compte, vous accédez à
          l&apos;analyse complète, au matching d&apos;offres et à votre historique.
        </p>

        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="text-gold-600">✦</span>
            Analyse complète & recommandations détaillées
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="text-gold-600">✦</span>
            Matching CV ↔ offre d&apos;emploi
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="text-gold-600">✦</span>
            Simulations d&apos;entretien & bibliothèque de CVs
          </li>
        </ul>

        <Link
          href="/signup"
          className="mt-6 block rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 px-6 py-3 text-center text-sm font-bold text-slate-950 shadow-md transition-all hover:from-gold-500 hover:to-gold-600"
        >
          Créer mon compte gratuit
        </Link>
        <p className="mt-3 text-center text-xs text-slate-500">
          Déjà inscrit ?{' '}
          <Link href="/login" className="font-medium text-gold-700 underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}