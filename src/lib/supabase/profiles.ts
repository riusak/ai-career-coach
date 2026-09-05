import { createClient } from '@/utils/supabase/server';
import type { Profile, ProfileResponse, ProfileUpdate } from '@/types/profile';

/** Column list including the migration-012 career-goal columns. */
const PROFILE_SELECT_WITH_GOAL =
  'id, full_name, headline, bio, role, target_role, target_year, created_at, updated_at';

/** Fallback column list when migration 012 has not been applied yet. */
const PROFILE_SELECT_BASE = 'id, full_name, headline, bio, role, created_at, updated_at';

/** PostgreSQL 42703 = undefined_column (career-goal columns not migrated yet). */
function isUndefinedColumnError(error: { code?: string }): boolean {
  return error.code === '42703';
}

/**
 * Fetches a user profile by user ID using the Supabase server client.
 * The career-goal columns (migration 012) are read optimistically: if the
 * migration has not been applied yet (Postgres 42703 = undefined column),
 * the query is retried without them and they degrade to null.
 */
export async function getProfileById(userId: string): Promise<ProfileResponse<Profile>> {
  try {
    const supabase = await createClient();

    const withGoal = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_WITH_GOAL)
      .eq('id', userId)
      .single();

    if (!withGoal.error) {
      return { data: withGoal.data as Profile, error: null };
    }

    if (!isUndefinedColumnError(withGoal.error)) {
      return { data: null, error: withGoal.error.message };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_BASE)
      .eq('id', userId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Profile, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while fetching the profile.';
    return { data: null, error: message };
  }
}

/**
 * Fetches the currently authenticated user's profile using the Supabase server client.
 */
export async function getCurrentUserProfile(): Promise<ProfileResponse<Profile>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        data: null,
        error: authError?.message ?? 'No authenticated user found.',
      };
    }

    return await getProfileById(user.id);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while fetching the profile.';
    return { data: null, error: message };
  }
}

/**
 * Updates a user profile by user ID using the Supabase server client.
 */
export async function updateProfileById(
  userId: string,
  updates: ProfileUpdate
): Promise<ProfileResponse<Profile>> {
  try {
    const supabase = await createClient();

    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const write = async (body: Record<string, unknown>, select: string) =>
      supabase
        .from('profiles')
        .upsert({
          id: userId,
          ...body,
        })
        .select(select)
        .single();

    // The goal columns are written only when provided; a missing migration
    // (42703) retries without them so the rest of the profile still saves.
    const hasGoalColumns = 'target_role' in updates || 'target_year' in updates;
    const first = await write(payload, PROFILE_SELECT_WITH_GOAL);

    let data = first.data;
    let error = first.error;

    if (error && hasGoalColumns && isUndefinedColumnError(error)) {
      const basePayload: Record<string, unknown> = { ...payload };
      delete basePayload.target_role;
      delete basePayload.target_year;
      const retry = await write(basePayload, PROFILE_SELECT_BASE);
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as Profile, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while updating the profile.';
    return { data: null, error: message };
  }
}

/**
 * Updates the currently authenticated user's profile using the Supabase server client.
 */
export async function updateCurrentUserProfile(
  updates: ProfileUpdate
): Promise<ProfileResponse<Profile>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        data: null,
        error: authError?.message ?? 'No authenticated user found.',
      };
    }

    return await updateProfileById(user.id, updates);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while updating the profile.';
    return { data: null, error: message };
  }
}
