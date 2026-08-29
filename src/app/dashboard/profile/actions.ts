'use server';

import { revalidatePath } from 'next/cache';
import { updateCurrentUserProfile } from '@/lib/supabase/profiles';
import type { ProfileResponse, Profile, ProfileUpdate } from '@/types/profile';

export type ProfileFormState = {
  success: boolean;
  message: string | null;
  data: Profile | null;
};

export async function updateProfileAction(
  prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const fullName = formData.get('fullName');
  const headline = formData.get('headline');
  const bio = formData.get('bio');

  const updates: ProfileUpdate = {
    full_name: typeof fullName === 'string' && fullName.trim().length > 0 ? fullName.trim() : null,
    headline: typeof headline === 'string' && headline.trim().length > 0 ? headline.trim() : null,
    bio: typeof bio === 'string' && bio.trim().length > 0 ? bio.trim() : null,
  };

  const response: ProfileResponse<Profile> = await updateCurrentUserProfile(updates);

  if (response.error) {
    return {
      success: false,
      message: response.error,
      data: prevState.data,
    };
  }

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');

  return {
    success: true,
    message: 'Profile updated successfully.',
    data: response.data,
  };
}
