import type { ReactNode } from 'react';

/**
 * Inviting placeholder for empty collections or missing data.
 * Server-component friendly (no client hooks) — usable anywhere.
 * "Navy & Orange" styling: subtle orange icon, clear guidance, optional action.
 */

export type EmptyStateIcon = 'document' | 'chart' | 'users';

const ICONS: Record<EmptyStateIcon, ReactNode> = {
  document: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-7 w-7"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  chart: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-7 w-7"
    >
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  users: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-7 w-7"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: EmptyStateIcon;
  /** Optional call-to-action rendered below the guidance text. */
  action?: ReactNode;
}

export default function EmptyState({
  title,
  description,
  icon = 'document',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/40 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
        {ICONS[icon]}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}