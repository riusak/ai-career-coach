'use client';

import { useEffect } from 'react';

/**
 * Global centered blocking error modal — replaces inline error banners and
 * toasts for analysis rejections and failures. Overlays the WHOLE viewport
 * with a fixed full-screen backdrop (`fixed inset-0` + `backdrop-blur`),
 * locks the dialog to the exact center of the user's active screen view
 * regardless of scroll position, and prevents background scrolling while
 * open (`overflow: hidden` on body). Presents: a prominent warning icon, a
 * clear title, the precise context-aware message, and a single primary
 * action that closes the modal and resets the flow (e.g. back to the upload
 * dropzone).
 *
 * A11y: role="dialog" + aria-modal, Escape closes, body scroll is locked
 * while open (same pattern as SignupModal).
 *
 * NOTE: `position: fixed` is hijacked by any transformed ancestor (a CSS
 * containing block). Consumers rendering this modal below an animated
 * wrapper (e.g. the landing <Reveal>) MUST portal it to document.body —
 * see QuickTestFunnel.
 */

interface ErrorModalProps {
  open: boolean;
  title: string;
  description: string;
  /** Primary action label (e.g. "Réessayer" / "Choisir un autre fichier"). */
  actionLabel: string;
  /** Closes the modal and resets the flow (reset selection, re-run, …). */
  onAction: () => void;
  /** Optional dedicated dismiss handler (defaults to onAction). */
  onClose?: () => void;
  /** Accessible id of the title element. */
  titleId?: string;
}

export default function ErrorModal({
  open,
  title,
  description,
  actionLabel,
  onAction,
  onClose,
  titleId = 'error-modal-title',
}: ErrorModalProps) {
  const dismiss = onClose ?? onAction;

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, dismiss]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="animate-fade-up relative w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={dismiss}
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

        {/* Prominent warning icon */}
        <div
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        </div>

        <h2 id={titleId} className="mt-4 text-xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>

        <button
          type="button"
          onClick={onAction}
          className="mt-6 w-full rounded-lg bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition-all hover:from-orange-500 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
