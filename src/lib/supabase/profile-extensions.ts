import { createClient } from '@/utils/supabase/server';
import {
  imageExtensionForMimeType,
  validateImageBuffer,
  MAX_AVATAR_FILE_SIZE_BYTES,
  MAX_BANNER_FILE_SIZE_BYTES,
} from '@/lib/image-validation';
import type {
  Profile,
  ProfileCertification,
  ProfileCertificationInput,
  ProfileEducation,
  ProfileEducationInput,
  ProfileExperience,
  ProfileExperienceInput,
  ProfileResponse,
  ProfileRoadmap,
  ProfileSkill,
  ProfileSkillInput,
  ProfileUpdate,
} from '@/types/profile';

/** Avatar / banner buckets are public — the lib returns the resolved public URL. */
const AVATAR_BUCKET = 'avatars';
const BANNER_BUCKET = 'banners';

export async function getCurrentUserProfile(): Promise<ProfileResponse<Profile>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { data: null, error: userError?.message ?? 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data as Profile | null) ?? null, error: null };
}

export async function updateCurrentUserProfile(
  patch: ProfileUpdate
): Promise<ProfileResponse<Profile>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as Profile, error: null };
}

export async function uploadProfileAvatar(file: File): Promise<ProfileResponse<Profile>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Server-authoritative magic-byte validation — the client-reported MIME type
  // and file extension are both spoofable, and this bucket is PUBLIC.
  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateImageBuffer(buffer, MAX_AVATAR_FILE_SIZE_BYTES);
  if (!validation.ok || !validation.mimeType) {
    return { data: null, error: validation.error };
  }

  const path = `${user.id}/avatar-${Date.now()}.${imageExtensionForMimeType(validation.mimeType)}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, { upsert: true, contentType: validation.mimeType });

  if (uploadError) {
    return { data: null, error: uploadError.message };
  }

  const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = `${publicData.publicUrl}?v=${Date.now()}`;

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as Profile, error: null };
}

export async function deleteProfileAvatar(): Promise<ProfileResponse<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // List and remove every object under the user folder (best-effort cleanup).
  const { data: list } = await supabase.storage.from(AVATAR_BUCKET).list(user.id);
  if (list && list.length > 0) {
    const paths = list.map((entry) => `${user.id}/${entry.name}`);
    await supabase.storage.from(AVATAR_BUCKET).remove(paths);
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id);

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: null, error: null };
}

export async function uploadProfileBanner(file: File): Promise<ProfileResponse<Profile>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Server-authoritative magic-byte validation — mirrors the avatar upload.
  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateImageBuffer(buffer, MAX_BANNER_FILE_SIZE_BYTES);
  if (!validation.ok || !validation.mimeType) {
    return { data: null, error: validation.error };
  }

  const path = `${user.id}/banner-${Date.now()}.${imageExtensionForMimeType(validation.mimeType)}`;

  const { error: uploadError } = await supabase.storage
    .from(BANNER_BUCKET)
    .upload(path, buffer, { upsert: true, contentType: validation.mimeType });

  if (uploadError) {
    return { data: null, error: uploadError.message };
  }

  const { data: publicData } = supabase.storage.from(BANNER_BUCKET).getPublicUrl(path);
  const publicUrl = `${publicData.publicUrl}?v=${Date.now()}`;

  const { data, error } = await supabase
    .from('profiles')
    .update({ banner_url: publicUrl })
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data as Profile, error: null };
}

export async function deleteProfileBanner(): Promise<ProfileResponse<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data: list } = await supabase.storage.from(BANNER_BUCKET).list(user.id);
  if (list && list.length > 0) {
    const paths = list.map((entry) => `${user.id}/${entry.name}`);
    await supabase.storage.from(BANNER_BUCKET).remove(paths);
  }

  const { error } = await supabase
    .from('profiles')
    .update({ banner_url: null })
    .eq('id', user.id);

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: null, error: null };
}

// ---------------------------------------------------------------------------
// Career history CRUD
// ---------------------------------------------------------------------------

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function listEducations(): Promise<ProfileResponse<ProfileEducation[]>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_educations')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: (data as ProfileEducation[]) ?? [], error: null };
}

export async function createEducation(
  input: ProfileEducationInput
): Promise<ProfileResponse<ProfileEducation>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_educations')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as ProfileEducation, error: null };
}

export async function updateEducation(
  id: string,
  input: Partial<ProfileEducationInput>
): Promise<ProfileResponse<ProfileEducation>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_educations')
    .update(input)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as ProfileEducation, error: null };
}

export async function deleteEducation(id: string): Promise<ProfileResponse<null>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('profile_educations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export async function listExperiences(): Promise<ProfileResponse<ProfileExperience[]>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_experiences')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: (data as ProfileExperience[]) ?? [], error: null };
}

export async function createExperience(
  input: ProfileExperienceInput
): Promise<ProfileResponse<ProfileExperience>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_experiences')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as ProfileExperience, error: null };
}

export async function updateExperience(
  id: string,
  input: Partial<ProfileExperienceInput>
): Promise<ProfileResponse<ProfileExperience>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_experiences')
    .update(input)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as ProfileExperience, error: null };
}

export async function deleteExperience(id: string): Promise<ProfileResponse<null>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('profile_experiences')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export async function listSkills(): Promise<ProfileResponse<ProfileSkill[]>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_skills')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: (data as ProfileSkill[]) ?? [], error: null };
}

export async function createSkill(
  input: ProfileSkillInput
): Promise<ProfileResponse<ProfileSkill>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_skills')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as ProfileSkill, error: null };
}

export async function deleteSkill(id: string): Promise<ProfileResponse<null>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('profile_skills')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export async function listCertifications(): Promise<ProfileResponse<ProfileCertification[]>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_certifications')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: (data as ProfileCertification[]) ?? [], error: null };
}

export async function createCertification(
  input: ProfileCertificationInput
): Promise<ProfileResponse<ProfileCertification>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_certifications')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as ProfileCertification, error: null };
}

export async function deleteCertification(id: string): Promise<ProfileResponse<null>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('profile_certifications')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export async function getRoadmap(): Promise<ProfileResponse<ProfileRoadmap>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_roadmap')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (data) return { data: data as ProfileRoadmap, error: null };
  // Initialise the row if missing.
  const { data: created, error: insertError } = await supabase
    .from('profile_roadmap')
    .insert({ user_id: userId, stage: 1, progress_percent: 0 })
    .select('*')
    .single();
  if (insertError) return { data: null, error: insertError.message };
  return { data: created as ProfileRoadmap, error: null };
}

export async function recomputeRoadmap(): Promise<ProfileResponse<ProfileRoadmap>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };
  const supabase = await createClient();
  const [profile, educations, experiences, skills, certifications] = await Promise.all([
    supabase.from('profiles').select('headline, bio, phone, location').eq('id', userId).maybeSingle(),
    supabase.from('profile_educations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('profile_experiences').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('profile_skills').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('profile_certifications').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  const profileComplete = Boolean(profile.data?.headline && profile.data?.bio);
  const eduCount = educations.count ?? 0;
  const expCount = experiences.count ?? 0;
  const skillCount = skills.count ?? 0;
  const certCount = certifications.count ?? 0;

  // Stage 1: identity & contact (profile complete + ≥1 phone/location)
  // Stage 2: ≥1 experience + ≥1 education
  // Stage 3: ≥3 skills
  // Stage 4: ≥1 certification + everything else
  let stage: 1 | 2 | 3 | 4 = 1;
  if (profileComplete && (profile.data?.phone || profile.data?.location) && skillCount >= 3) {
    stage = 3;
  }
  if (expCount > 0 && eduCount > 0 && skillCount >= 3 && certCount > 0) {
    stage = 4;
  } else if (expCount > 0 && eduCount > 0) {
    stage = 2;
  }

  // Progress percent: 0 → 100 across the four stages, weighted by section.
  const profileWeight = profileComplete ? 25 : 0;
  const expWeight = expCount > 0 ? 25 : 0;
  const eduWeight = eduCount > 0 ? 20 : 0;
  const skillWeight = Math.min(skillCount, 5) * 4;
  const certWeight = Math.min(certCount, 3) * 5;
  const progress = Math.min(100, profileWeight + expWeight + eduWeight + skillWeight + certWeight);

  const { data, error } = await supabase
    .from('profile_roadmap')
    .upsert({ user_id: userId, stage, progress_percent: progress }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as ProfileRoadmap, error: null };
}