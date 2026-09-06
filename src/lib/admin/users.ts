import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { RESUME_BUCKET } from '@/lib/supabase/resumes';
import { writeAuditLog } from '@/lib/admin/audit';
import { getCurrentAdmin } from '@/lib/admin/guard';
import { toUserRole, clampPage } from '@/lib/admin/utils';
import { sanitizeLikePattern } from '@/lib/security/rate-limit';
import type {
  AdminResumeSummary,
  AdminLatestAnalysis,
  AdminUser,
  AdminUserDetailResult,
  AdminUserListResult,
  UserRole,
} from '@/types/admin';

const PROFILE_ADMIN_SELECT = 'id, full_name, role, created_at, updated_at';

/** Result of a privileged admin mutation, surfaced to the UI. */
export type AdminMutationResult =
  | { success: true }
  | { success: false; message: string };

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Resolves a user's email (auth.users is private to the service role) and the
 * count of every owner-scoped table that cascades on auth-user deletion.
 */
async function fetchUserEmails(
  service: ServiceClient,
  userIds: readonly string[]
): Promise<Map<string, string | null>> {
  const entries = await Promise.all(
    userIds.map(async (id) => {
      const { data } = await service.auth.admin.getUserById(id);
      return [id, data.user?.email ?? null] as const;
    })
  );
  return new Map(entries);
}

async function fetchResumeCounts(
  service: ServiceClient,
  userIds: readonly string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (userIds.length === 0) {
    return counts;
  }
  const { data } = await service.from('resumes').select('user_id').in('user_id', [...userIds]);
  for (const row of data ?? []) {
    const id = row.user_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

async function fetchAnalysisCounts(
  service: ServiceClient,
  userIds: readonly string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (userIds.length === 0) {
    return counts;
  }
  const { data } = await service
    .from('resume_analyses')
    .select('user_id')
    .in('user_id', [...userIds]);
  for (const row of data ?? []) {
    const id = row.user_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
/**
 * Lists registered users (profiles joined with auth emails) for the admin
 * management view. Filtering/searching runs on `profiles` through RLS; emails
 * and content counts are resolved via the service role.
 */
export async function listAdminUsers(options: {
  query: string | null;
  role: UserRole | null;
  page: number;
  pageSize: number;
}): Promise<AdminUserListResult | null> {
  try {
    const supabase = await createClient();
    const { query, role, page, pageSize } = options;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let request = supabase.from('profiles').select(PROFILE_ADMIN_SELECT, {
      count: 'exact',
    });
    if (query && query.trim().length > 0) {
      const sanitized = sanitizeLikePattern(query);
      request = request.ilike('full_name', `%${sanitized}%`);
    }
    if (role) {
      request = request.eq('role', role);
    }
    request = request.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await request;
    if (error) {
      console.error('[admin] listAdminUsers() query failed:', error.message);
      return null;
    }

    const profiles = (data ?? []) as ProfileRow[];
    const ids = profiles.map((profile) => profile.id);

    const service = createServiceClient();
    const [emails, resumeCounts, analysisCounts] = await Promise.all([
      fetchUserEmails(service, ids),
      fetchResumeCounts(service, ids),
      fetchAnalysisCounts(service, ids),
    ]);

    const users: AdminUser[] = profiles.map((profile) => ({
      id: profile.id,
      email: emails.get(profile.id) ?? null,
      full_name: profile.full_name,
      role: profile.role,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      resume_count: resumeCounts.get(profile.id) ?? 0,
      analysis_count: analysisCounts.get(profile.id) ?? 0,
    }));

    const total = count ?? profiles.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      users,
      total,
      page: clampPage(page, totalPages),
      pageSize,
      totalPages,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error while listing users.';
    console.error('[admin] listAdminUsers() failed:', message);
    return null;
  }
}
/**
 * Full profile of a single user for the /admin/users/[id] detail view:
 * auth metadata (email, last sign-in), resume catalogue and latest analysis.
 */
export async function getAdminUserDetail(
  userId: string
): Promise<AdminUserDetailResult | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_ADMIN_SELECT)
      .eq('id', userId)
      .maybeSingle();

    const profile = data as ProfileRow | null;
    if (error || !profile) {
      return null;
    }

    const service = createServiceClient();

    const [{ data: authUser }, resumeRes, analysisCountRes, latestAnalysisRes] =
      await Promise.all([
        service.auth.admin.getUserById(userId),
        service
          .from('resumes')
          .select('id, file_name, is_primary, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        service
          .from('resume_analyses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        service
          .from('resume_analyses')
          .select('analysis_type, score, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const resumes = (resumeRes.data ?? []) as AdminResumeSummary[];
    const latestAnalysis = (latestAnalysisRes.data ?? null) as AdminLatestAnalysis | null;

    return {
      user: {
        id: profile.id,
        email: authUser.user?.email ?? null,
        full_name: profile.full_name,
        role: profile.role,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        last_sign_in_at: authUser.user?.last_sign_in_at ?? null,
        resume_count: resumes.length,
        analysis_count: analysisCountRes.count ?? 0,
      },
      resumes,
      analysis_count: analysisCountRes.count ?? 0,
      latestAnalysis,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error while fetching the user.';
    console.error('[admin] getAdminUserDetail() failed:', message);
    return null;
  }
}
/**
 * Promotes/demotes a user. Uses the service role to bypass the
 * "only-self can update own profile" RLS rule, and the
 * `enforce_profile_role_integrity` trigger (migration 005) authorizes the
 * service-role caller (auth.uid() IS NULL at the service level).
 */
export async function updateUserRole(
  targetUserId: string,
  roleValue: string
): Promise<AdminMutationResult> {
  const admin = await getCurrentAdmin();
  if (!admin.ok) {
    return {
      success: false,
      message: 'Forbidden: only administrators can manage user roles.',
    };
  }

  const newRole = toUserRole(roleValue);
  if (!newRole) {
    return { success: false, message: 'Invalid role. Expected "user" or "admin".' };
  }

  try {
    const service = createServiceClient();

    const { data, error: fetchError } = await service
      .from('profiles')
      .select('id, role')
      .eq('id', targetUserId)
      .maybeSingle();

    const target = data as { id: string; role: UserRole } | null;
    if (fetchError || !target) {
      return { success: false, message: 'Target user not found.' };
    }

    if (target.role === newRole) {
      return {
        success: false,
        message: `User is already ${newRole === 'admin' ? 'an' : 'a'} ${newRole}.`,
      };
    }

    // Safety nets when revoking the admin role: never lock the operator out,
    // and never destroy the last administrator of the platform.
    if (newRole === 'user' && target.role === 'admin') {
      if (targetUserId === admin.userId) {
        return { success: false, message: 'You cannot revoke your own admin role.' };
      }

      const { count: adminCount, error: countError } = await service
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (countError || (adminCount ?? 0) <= 1) {
        return {
          success: false,
          message: 'This is the only administrator account. Promote another user first.',
        };
      }
    }

    const { error: updateError } = await service
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (updateError) {
      return { success: false, message: updateError.message };
    }

    await writeAuditLog({
      actorId: admin.userId,
      action: 'profile.role_change',
      targetType: 'profiles',
      targetId: targetUserId,
      payload: { from: target.role, to: newRole },
    });

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected error while updating the role.';
    console.error('[admin] updateUserRole() failed:', message);
    return { success: false, message };
  }
}
/**
 * Permanently deletes an authentication account (and every owned resource that
 * cascades on auth.users deletion per the FK graph in migrations 001–006).
 *
 * Flow: guard admin → reject self-delete → resolve target (email + role) →
 * best-effort storage cleanup → audit log (attempt) → delete auth user →
 * audit log (success/failure). Service-role only; the caller's session can
 * never delete its own account and never operates without an admin guard.
 */
export async function deleteUserAccount(targetUserId: string): Promise<AdminMutationResult> {
  const admin = await getCurrentAdmin();
  if (!admin.ok) {
    return {
      success: false,
      message: 'Forbidden: only administrators can delete accounts.',
    };
  }

  if (targetUserId === admin.userId) {
    return { success: false, message: 'You cannot delete your own account.' };
  }

  try {
    const service = createServiceClient();

    const { data: targetProf, error: profError } = await service
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', targetUserId)
      .maybeSingle();

    const targetProfile =
      targetProf as { id: string; full_name: string | null; role: string } | null;
    if (profError || !targetProfile) {
      return { success: false, message: 'Target user not found.' };
    }

    const { data: targetAuth } = await service.auth.admin.getUserById(targetUserId);
    const targetEmail = targetAuth.user?.email ?? null;

    // Best-effort: remove the user's resume files from the private bucket so
    // nothing is orphaned on disk (the resumes rows cascade-delete via FK).
    try {
      const { data: resumeRows } = await service
        .from('resumes')
        .select('file_path')
        .eq('user_id', targetUserId);

      const paths = (resumeRows ?? [])
        .map((row) => row.file_path as string)
        .filter((path) => typeof path === 'string' && path.length > 0);

      if (paths.length > 0) {
        const { error: storageError } = await service.storage
          .from(RESUME_BUCKET)
          .remove(paths);
        if (storageError) {
          console.error('[admin] storage cleanup failed:', storageError.message);
        }
      }
    } catch (err) {
      console.error('[admin] storage cleanup threw:', (err as Error)?.message);
    }

    // Audit BEFORE deleting: anchors the attempt in the immutable log even if
    // the auth-user deletion below fails.
    await writeAuditLog({
      actorId: admin.userId,
      action: 'user.delete',
      targetType: 'auth.user',
      targetId: targetUserId,
      payload: {
        email: targetEmail,
        role: targetProfile.role,
        full_name: targetProfile.full_name,
      },
    });

    const { error: deleteError } = await service.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      await writeAuditLog({
        actorId: admin.userId,
        action: 'user.delete_failed',
        targetType: 'auth.user',
        targetId: targetUserId,
        payload: { message: deleteError.message },
      });
      return { success: false, message: `Delete failed: ${deleteError.message}` };
    }

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected error while deleting the account.';
    console.error('[admin] deleteUserAccount() failed:', message);
    return { success: false, message };
  }
}




