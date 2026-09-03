'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('admin');
  const isAdmin = currentRole === 'admin';
  const nextRole: UserRole = isAdmin ? 'user' : 'admin';
  const label = isAdmin ? t('common.revokeAdmin') : t('common.makeAdmin');

  if (disabled) {
    return (
      <span
        className="text-xs text-navy-400"
        title={t('common.cannotChangeRoleTitle')}
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
        className="inline-flex items-center rounded-md border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800 opacity-90 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? t('common.saving') : label}
      </button>
    </form>
  );
}
