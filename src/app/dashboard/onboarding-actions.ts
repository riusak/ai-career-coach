'use server';

import { revalidateDashboardData } from '@/lib/dashboard/revalidate';
import { cookies } from 'next/headers';
import { ONBOARDING_COOKIE } from '@/app/dashboard/onboarding-config';
import { markOnboardingCompleted, updateCurrentUserProfile } from '@/lib/supabase/profiles';
import { uploadResume } from '@/lib/supabase/resumes';
import {
  createCertification,
  createEducation,
  createExperience,
  createSkill,
  listCertifications,
  listEducations,
  listExperiences,
  listSkills,
  recomputeRoadmap,
} from '@/lib/supabase/profile-extensions';
import { validateResumeFile } from '@/lib/resume-validation';
import { extractProfileFromDocument } from '@/lib/profile-import/extract';
import type { ProfileUpdate } from '@/types/profile';
import type { ProfileImportState, ProfileImportSummary } from '@/types/profile-import';

/**
 * Onboarding persistence for the dashboard (Phase 3 → Sprint 7). The template's
 * localStorage has been replaced with a two-layer durable state:
 *   - the `forpro_onboarding_seen` cookie (fast path per browser);
 *   - the `profiles.onboarding_completed_at` column (source of truth — the
 *     wizard is triggered strictly once per USER, across browsers/logins).
 */

/** Marks the onboarding as completed (DB flag + cookie). Called when the user
 * finishes the wizard, explicitly dismisses/skips it, or marks it done. */
export async function completeOnboardingAction(): Promise<void> {
  await markOnboardingCompleted();

  const store = await cookies();
  store.set(ONBOARDING_COOKIE, '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    ...(process.env.NODE_ENV === 'production' ? { secure: true } : {}),
  });
}

/** Removes the marker (used for demos/tests — not exposed in the UI). */
export async function resetOnboardingAction(): Promise<void> {
  const store = await cookies();
  store.delete(ONBOARDING_COOKIE);
}

/**
 * « Smart Profile Import » — uploads a LinkedIn PDF / standard CV through the
 * standard secured resume pipeline, then uses the existing LLM pipeline to
 * extract career history, skills, education and certifications, pre-filling
 * the user's profile & roadmap. Duplicates are skipped against existing rows.
 */
export async function importProfileFromResumeAction(
  _prevState: ProfileImportState,
  formData: FormData
): Promise<ProfileImportState> {
  const fileEntry = formData.get('file');

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return {
      success: false,
      message: 'Please select a resume file to import.',
      resumeId: null,
      fileName: null,
      summary: null,
    };
  }

  const validationError = validateResumeFile(fileEntry);
  if (validationError) {
    return {
      success: false,
      message: validationError,
      resumeId: null,
      fileName: null,
      summary: null,
    };
  }

  // 1) Upload through the standard secured pipeline (appears in the CV library;
  //    the first CV becomes primary automatically).
  const upload = await uploadResume(fileEntry);
  if (upload.error || !upload.data) {
    return {
      success: false,
      message: upload.error ?? 'Failed to upload the resume.',
      resumeId: null,
      fileName: null,
      summary: null,
    };
  }

  // 2) LLM extraction of the structured career profile.
  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const extraction = await extractProfileFromDocument(buffer, fileEntry.name);
  if (!extraction.ok) {
    return {
      success: false,
      message: extraction.error.message,
      resumeId: upload.data.id,
      fileName: fileEntry.name,
      summary: null,
    };
  }

  const { extraction: data } = extraction;
  const summary: ProfileImportSummary = {
    experiences: 0,
    skills: 0,
    educations: 0,
    certifications: 0,
    profileFields: 0,
  };

  // 3a) Identity patches (full_name, headline, bio, location).
  const profilePatch: ProfileUpdate = {};
  if (data.full_name) profilePatch.full_name = data.full_name;
  if (data.headline) profilePatch.headline = data.headline;
  if (data.bio) profilePatch.bio = data.bio;
  if (data.location) profilePatch.location = data.location;
  if (Object.keys(profilePatch).length > 0) {
    const profileResult = await updateCurrentUserProfile(profilePatch);
    if (!profileResult.error) summary.profileFields = Object.keys(profilePatch).length;
  }

  // 3b) Section inserts — deduplicated against the existing rows.
  const [existingExperiences, existingSkills, existingEducations, existingCertifications] =
    await Promise.all([listExperiences(), listSkills(), listEducations(), listCertifications()]);

  const existingExperienceKeys = new Set(
    (existingExperiences.data ?? []).map((e) => `${e.company}|${e.role}`.toLowerCase())
  );
  const existingSkillKeys = new Set(
    (existingSkills.data ?? []).map((s) => s.skill_name.toLowerCase())
  );
  const existingEducationKeys = new Set(
    (existingEducations.data ?? []).map((e) => e.institution.toLowerCase())
  );
  const existingCertificationKeys = new Set(
    (existingCertifications.data ?? []).map((c) => c.name.toLowerCase())
  );

  for (const experience of data.experiences) {
    const key = `${experience.company}|${experience.role}`.toLowerCase();
    if (existingExperienceKeys.has(key)) continue;
    const result = await createExperience({
      company: experience.company,
      role: experience.role,
      description: experience.description ?? null,
      start_date: experience.start_date ?? null,
      end_date: experience.end_date ?? null,
      is_current: experience.is_current ?? false,
      display_order: summary.experiences,
      technologies: experience.technologies ?? [],
      key_missions: experience.key_missions ?? [],
    });
    if (!result.error) summary.experiences += 1;
  }

  for (const skill of data.skills) {
    if (existingSkillKeys.has(skill.skill_name.toLowerCase())) continue;
    const result = await createSkill({
      skill_name: skill.skill_name,
      level: skill.level,
      category: skill.category ?? null,
      display_order: 0,
    });
    if (!result.error) summary.skills += 1;
  }

  for (const education of data.educations) {
    if (existingEducationKeys.has(education.institution.toLowerCase())) continue;
    const result = await createEducation({
      institution: education.institution,
      degree: education.degree ?? null,
      field_of_study: education.field_of_study ?? null,
      start_date: education.start_date ?? null,
      end_date: education.end_date ?? null,
      is_current: education.is_current ?? false,
      description: null,
      display_order: summary.educations,
    });
    if (!result.error) summary.educations += 1;
  }

  for (const certification of data.certifications) {
    if (existingCertificationKeys.has(certification.name.toLowerCase())) continue;
    const result = await createCertification({
      name: certification.name,
      issuer: certification.issuer ?? null,
      issue_date: certification.issue_date ?? null,
      expiry_date: null,
      credential_url: null,
      display_order: 0,
    });
    if (!result.error) summary.certifications += 1;
  }

  // 4) Roadmap recompute + centralized cache invalidation so EVERY dashboard
  //    segment (roadmap, analytics, CV grid, settings…) reflects the freshly
  //    imported profile instantly (Chart 4).
  await recomputeRoadmap();
  revalidateDashboardData();

  return {
    success: true,
    message: 'Profile imported successfully.',
    resumeId: upload.data.id,
    fileName: fileEntry.name,
    summary,
  };
}