'use client';

import { useActionState } from 'react';
import { updateUserRoleAction, type AdminActionResult } from '@/app/admin/actions';
import type { UserRole } from '@/types/admin';

interface RoleToggleFormProps {
  userId: string;
  currentRole: UserRole;
  /** When true (e.g. acting on oneself), the control is rendered disabled. */
  disabled?: boolean;
}

const initialState: AdminActionResult = { success: false, message: null };

/**
 * Promotes/demotes a single user from the list or the detail view.
 * Renders inline success/error feedback (useActionState). The heavy lifting —
 * admin guard, last-admin safety net, audit logging — lives entirely in the
 * server action + data layer, so the client cannot bypass it.
 */
export default function RoleToggleForm({
  userId,
  currentRole,
  disabled,
}: RoleToggleFormProps) {
  const [state, formAction, isPending] = useActionState(updateUserRoleAction, initialState);
  const isAdmin = currentRole === 'admin';
  const nextRole: UserRole = isAdmin ? 'user' : 'admin';
  const label = isAdmin ? 'Revoke admin' : 'Make admin';

  if (disabled) {
    return (
      <span
        className="text-xs text-slate-400"
        title="You cannot change your own role."
        aria-disabled
      >
        {label}
      </span>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="newRole" value={nextRole} />
      {state.message && (
        <p
          className={`mt-1 text-xs ${
            state.success ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center rounded-md border border-gold-300 bg-gold-50 px-2.5 py-1 text-xs font-medium text-gold-800 opacity-90 shadow-sm transition-colors hover:border-gold-400 hover:bg-gold-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Saving…' : label}
      </button>
    </form>
  );
}
