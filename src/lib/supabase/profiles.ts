import { createClient } from '@/utils/supabase/server';
import type { Profile, ProfileResponse, ProfileUpdate } from '@/types/profile';

/**
 * Fetches a user profile by user ID using the Supabase server client.
 */
export async function getProfileById(userId: string): Promise<ProfileResponse<Profile>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, headline, bio, created_at, updated_at')
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

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...payload,
      })
      .select('id, full_name, headline, bio, created_at, updated_at')
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Profile, error: null };
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
