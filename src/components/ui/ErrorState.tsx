import type { ReactNode } from 'react';

/**
 * Friendly, actionable error display with explicit recovery paths.
 * Server-component friendly: recovery actions are passed as `children`
 * (links, buttons) so it can be used from server components too.
 */

interface ErrorStateProps {
  title: string;
  description: string;
  /** Recovery actions, e.g. a retry button or a "choose another file" link. */
  children?: ReactNode;
}

export default function ErrorState({ title, description, children }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center"
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-red-900">{title}</p>
        <p className="mt-0.5 text-sm text-red-700">{description}</p>
        {children && <div className="mt-2.5 flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}