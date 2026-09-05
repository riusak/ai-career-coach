'use server';

import { revalidatePath } from 'next/cache';
import { updateCurrentUserProfile } from '@/lib/supabase/profiles';
import {
  createCertification,
  createEducation,
  createExperience,
  createSkill,
  deleteCertification,
  deleteEducation,
  deleteExperience,
  deleteSkill,
  recomputeRoadmap,
  updateEducation,
  updateExperience,
} from '@/lib/supabase/profile-extensions';
import type { ProfileResponse, Profile, ProfileUpdate } from '@/types/profile';

export type ProfileFormState = {
  success: boolean;
  message: string | null;
  data: Profile | null;
};

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const updates: ProfileUpdate = {
    full_name: strOrNull(formData.get('fullName')),
    headline: strOrNull(formData.get('headline')),
    bio: strOrNull(formData.get('bio')),
    phone: strOrNull(formData.get('phone')),
    location: strOrNull(formData.get('location')),
    linkedin_url: strOrNull(formData.get('linkedin_url')),
    github_url: strOrNull(formData.get('github_url')),
    website_url: strOrNull(formData.get('website_url')),
    target_role: strOrNull(formData.get('target_role')),
    target_year: parseTargetYear(formData.get('target_year')),
  };

  const localeRaw = formData.get('preferred_locale');
  if (typeof localeRaw === 'string' && ['fr', 'en', 'de'].includes(localeRaw)) {
    updates.preferred_locale = localeRaw as ProfileUpdate['preferred_locale'];
  }

  const response: ProfileResponse<Profile> = await updateCurrentUserProfile(updates);

  if (response.error) {
    return { success: false, message: response.error, data: null };
  }

  await recomputeRoadmap();
  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');

  return { success: true, message: 'profile.saveSuccess', data: response.data };
}

function strOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Parses the target year of the career goal (migration 012). Anything
 * outside the DB-check window (2020–2100) degrades to NULL instead of
 * failing the whole profile save.
 */
function parseTargetYear(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const year = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return null;
  return year;
}

// ---------------------------------------------------------------------------
// Career-history CRUD server actions (the form posts multipart/form-data with
// a hidden `_action` discriminator so each section reuses the same endpoint).
// ---------------------------------------------------------------------------

export type SectionActionResult = { error: string | null };

function parseDate(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Sprint 5 / migration 010 — career-roadmap domain whitelist. Kept in sync
 * with the CHECK constraint in supabase/migrations/010_profile_experiences_enrichment.sql.
 */
const EXPERIENCE_DOMAINS = [
  'frontend',
  'backend',
  'architecture',
  'devops',
  'mobile',
  'data',
  'other',
] as const;

export type ExperienceDomain = (typeof EXPERIENCE_DOMAINS)[number];

/** Parses a domain submitted by the form; returns null unless it is allowed. */
function parseDomain(value: FormDataEntryValue | null): ExperienceDomain | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim() as ExperienceDomain;
  return EXPERIENCE_DOMAINS.includes(trimmed) ? trimmed : null;
}

/**
 * Parses a free-text list (one item per line, or comma/semicolon separated)
 * into a clean non-empty string array (NULL when nothing was provided). These
 * arrays are stored in the migration-010 jsonb columns (key_missions,
 * technologies).
 */
function parseStringArray(value: FormDataEntryValue | null): string[] | null {
  if (typeof value !== 'string') return null;
  const items = value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length > 0 ? items.slice(0, 50) : null;
}

export async function createEducationAction(
  _prev: SectionActionResult,
  formData: FormData
): Promise<SectionActionResult> {
  const institution = formData.get('institution');
  if (typeof institution !== 'string' || institution.trim().length === 0) {
    return { error: 'institution is required' };
  }
  const result = await createEducation({
    institution: institution.trim(),
    degree: strOrNull(formData.get('degree')),
    field_of_study: strOrNull(formData.get('field_of_study')),
    start_date: parseDate(formData.get('start_date')),
    end_date: parseDate(formData.get('end_date')),
    is_current: formData.get('is_current') === 'on',
    description: strOrNull(formData.get('description')),
    display_order: 0,
  });
  if (result.error) return { error: result.error };
  await recomputeRoadmap();
  revalidatePath('/dashboard/profile');
  return { error: null };
}

export async function deleteEducationAction(
  _prev: SectionActionResult,
  formData: FormData
): Promise<SectionActionResult> {
  const id = formData.get('id');
  if (typeof id !== 'string') return { error: 'id is required' };
  const result = await deleteEducation(id);
  if (result.error) return { error: result.error };
  await recomputeRoadmap();
  revalidatePath('/dashboard/profile');
  return { error: null };
}

export async function createExperienceAction(
  _prev: SectionActionResult,
  formData: FormData
): Promise<SectionActionResult> {
  const company = formData.get('company');
  const role = formData.get('role');
  if (typeof company !== 'string' || typeof role !== 'string') {
    return { error: 'company and role are required' };
  }
  const result = await createExperience({
    company: company.trim(),
    role: role.trim(),
    description: strOrNull(formData.get('description')),
    start_date: parseDate(formData.get('start_date')),
    end_date: parseDate(formData.get('end_date')),
    is_current: formData.get('is_current') === 'on',
    // Sprint 5 / migration 010 career-roadmap enrichments.
    key_missions: parseStringArray(formData.get('key_missions')),
    technologies: parseStringArray(formData.get('technologies')),
    domain: parseDomain(formData.get('domain')),
    display_order: 0,
  });
  if (result.error) return { error: result.error };
  await recomputeRoadmap();
  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function deleteExperienceAction(
  _prev: SectionActionResult,
  formData: FormData
): Promise<SectionActionResult> {
  const id = formData.get('id');
  if (typeof id !== 'string') return { error: 'id is required' };
  const result = await deleteExperience(id);
  if (result.error) return { error: result.error };
  await recomputeRoadmap();
  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function createSkillAction(
  _prev: SectionActionResult,
  formData: FormData
): Promise<SectionActionResult> {
  const skillName = formData.get('skill_name');
  if (typeof skillName !== 'string' || skillName.trim().length === 0) {
    return { error: 'skill_name is required' };
  }
  const level = formData.get('level');
  const allowed = ['beginner', 'intermediate', 'advanced', 'expert'];
  const result = await createSkill({
    skill_name: skillName.trim(),
    level:
      typeof level === 'string' && (allowed as readonly string[]).includes(level)
        ? (level as 'beginner' | 'intermediate' | 'advanced' | 'expert')
        : 'intermediate',
    category: strOrNull(formData.get('category')),
    display_order: 0,
  });
  if (result.error) return { error: result.error };
  await recomputeRoadmap();
  revalidatePath('/dashboard/profile');
  return { error: null };
}

export async function deleteSkillAction(
  _prev: SectionActionResult,
  formData: FormData
): Promise<SectionActionResult> {
  const id = formData.get('id');
  if (typeof id !== 'string') return { error: 'id is required' };
  const result = await deleteSkill(id);
  if (result.error) return { error: result.error };
  await recomputeRoadmap();
  revalidatePath('/dashboard/profile');
  return { error: null };
}

export async function createCertificationAction(
  _prev: SectionActionResult,
  formData: FormData
): Promise<SectionActionResult> {
  const name = formData.get('name');
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { error: 'name is required' };
  }
  const result = await createCertification({
    name: name.trim(),
    issuer: strOrNull(formData.get('issuer')),
    issue_date: parseDate(formData.get('issue_date')),
    expiry_date: parseDate(formData.get('expiry_date')),
    credential_url: strOrNull(formData.get('credential_url')),
    display_order: 0,
  });
  if (result.error) return { error: result.error };
  await recomputeRoadmap();
  revalidatePath('/dashboard/profile');
  return { error: null };
}

export async function deleteCertificationAction(
  _prev: SectionActionResult,
  formData: FormData
): Promise<SectionActionResult> {
  const id = formData.get('id');
  if (typeof id !== 'string') return { error: 'id is required' };
  const result = await deleteCertification(id);
  if (result.error) return { error: result.error };
  await recomputeRoadmap();
  revalidatePath('/dashboard/profile');
  return { error: null };
}

// Used by PATCH education / experience forms
export async function updateEducationAction(
  _prev: SectionActionResult,
  formData: FormData
): Promise<SectionActionResult> {
  const id = formData.get('id');
  if (typeof id !== 'string') return { error: 'id is required' };
  const result = await updateEducation(id, {
    institution: strOrNull(formData.get('institution')) ?? undefined,
    degree: formData.has('degree') ? strOrNull(formData.get('degree')) : undefined,
    field_of_study: formData.has('field_of_study') ? strOrNull(formData.get('field_of_study')) : undefined,
    start_date: formData.has('start_date') ? parseDate(formData.get('start_date')) : undefined,
    end_date: formData.has('end_date') ? parseDate(formData.get('end_date')) : undefined,
    is_current: typeof formData.get('is_current') === 'string' ? formData.get('is_current') === 'on' : undefined,
    description: formData.has('description') ? strOrNull(formData.get('description')) : undefined,
  });
  if (result.error) return { error: result.error };
  await recomputeRoadmap();
  revalidatePath('/dashboard/profile');
  return { error: null };
}

export async function updateExperienceAction(
  _prev: SectionActionResult,
  formData: FormData
): Promise<SectionActionResult> {
  const id = formData.get('id');
  if (typeof id !== 'string') return { error: 'id is required' };
  // `formData.has` guards let the user actually CLEAR a previously set value
  // (setting NULL) instead of silently skipping the column.
  const companyInput = formData.has('company') ? strOrNull(formData.get('company')) : undefined;
  const roleInput = formData.has('role') ? strOrNull(formData.get('role')) : undefined;
  if (companyInput === null || roleInput === null) {
    return { error: 'company and role are required' };
  }
  const result = await updateExperience(id, {
    company: companyInput ?? undefined,
    role: roleInput ?? undefined,
    description: formData.has('description') ? strOrNull(formData.get('description')) : undefined,
    start_date: formData.has('start_date') ? parseDate(formData.get('start_date')) : undefined,
    end_date: formData.has('end_date') ? parseDate(formData.get('end_date')) : undefined,
    is_current: typeof formData.get('is_current') === 'string' ? formData.get('is_current') === 'on' : undefined,
    // Sprint 5 / migration 010 career-roadmap enrichments (nullable clears).
    key_missions: formData.has('key_missions')
      ? parseStringArray(formData.get('key_missions'))
      : undefined,
    technologies: formData.has('technologies')
      ? parseStringArray(formData.get('technologies'))
      : undefined,
    domain: formData.has('domain') ? parseDomain(formData.get('domain')) : undefined,
  });
  if (result.error) return { error: result.error };
  await recomputeRoadmap();
  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  return { error: null };
}