'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deleteUserAccount, updateUserRole } from '@/lib/admin/users';
import type { AdminActionResult } from '@/types/admin';

export type { AdminActionResult } from '@/types/admin';

const ADMIN_PATHS = ['/admin', '/admin/users', '/admin/audit'];

/**
 * Promotes/demotes a user from the users list or the detail view. On success
 * the affected paths are revalidated so the role badge and table reflect the
 * new state in the same roundtrip; the action then returns a message that the
 * UI renders inline (useActionState-friendly).
 */
export async function updateUserRoleAction(
  prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const userId = formData.get('userId');
  const newRole = formData.get('newRole');

  if (typeof userId !== 'string' || typeof newRole !== 'string') {
    return { success: false, message: 'Missing required fields.' };
  }

  const result = await updateUserRole(userId, newRole);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  return { success: true, message: 'Role updated successfully.' };
}

/**
 * Permanently deletes an account. On success it revalidates the listing pages
 * then hard-redirects back to the users list (the detail view can no longer
 * render once the underlying auth user is gone).
 */
export async function deleteUserAction(
  prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const userId = formData.get('userId');

  if (typeof userId !== 'string') {
    return { success: false, message: 'Missing required fields.' };
  }

  const result = await deleteUserAccount(userId);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  for (const path of ADMIN_PATHS) {
    revalidatePath(path);
  }
  revalidatePath(`/admin/users/${userId}`);
  redirect('/admin/users');
}
