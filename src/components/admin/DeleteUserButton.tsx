'use client';

import { useActionState } from 'react';
import { deleteUserAction, type AdminActionResult } from '@/app/admin/actions';

interface DeleteUserButtonProps {
  userId: string;
  userName: string | null;
  /** When true the action is unavailable (e.g. deleting yourself). */
  disabled?: boolean;
}

const initialState: AdminActionResult = { success: false, message: null };

/**
 * Permanently deletes a user account. Requires an explicit `window.confirm`
 * to prevent accidental activation from the users table. All authorization,
 * resource cleanup and audit logging happen server-side in the data layer —
 * the client only carries the user reference (id).
 */
export default function DeleteUserButton({ userId, userName, disabled }: DeleteUserButtonProps) {
  const [state, formAction, isPending] = useActionState(deleteUserAction, initialState);
  const label = userName ?? userId;

  if (disabled) {
    return (
      <span
        className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-400 opacity-60"
        title="You cannot delete your own account."
        aria-disabled
      >
        Delete
      </span>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `Permanently delete "${label}"?\n\nThis removes the account, every CV, and all analysis/matching logs. This cannot be undone.`
    );
    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="inline-block">
      <input type="hidden" name="userId" value={userId} />
      {state.message && !state.success && (
        <p className="mt-1 block text-xs text-red-700">{state.message}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 opacity-90 shadow-sm transition-colors hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Removing…' : 'Delete'}
      </button>
    </form>
  );
}
