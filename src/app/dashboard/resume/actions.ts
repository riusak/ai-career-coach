'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createResumeAnalysis,
  deleteResume,
  getLatestResumeAnalysis,
  setPrimaryResume,
  unsetPrimaryResume,
  updateResumeLabel,
  uploadResume,
} from '@/lib/supabase/resumes';
import type { Resume, ResumeAnalysis } from '@/types/resume';

export type ResumeUploadState = {
  success: boolean;
  message: string | null;
  data: Resume | null;
};

export type ResumeActionState = {
  success: boolean;
  message: string | null;
};

/** Extracts and validates the hidden `resumeId` field of a form. */
function readResumeId(formData: FormData): string | null {
  const value = formData.get('resumeId');
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Uploads a resume file. On success the user is redirected to the dedicated
 * preview view — the full LLM analysis is NEVER triggered automatically
 * (docs/product/mvp.md: the visitor/user chooses when to analyze).
 */
export async function uploadResumeAction(
  prevState: ResumeUploadState,
  formData: FormData
): Promise<ResumeUploadState> {
  const fileEntry = formData.get('file');

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return {
      success: false,
      message: 'Please select a resume file to upload.',
      data: prevState.data,
    };
  }

  const response = await uploadResume(fileEntry);

  if (response.error || !response.data) {
    return {
      success: false,
      message: response.error ?? 'Failed to upload the resume.',
      data: prevState.data,
    };
  }

  revalidatePath('/dashboard/resume');
  revalidatePath('/dashboard');

  // Redirect to the dedicated preview view (framework-handled exception).
  redirect(`/dashboard/resume/${response.data.id}`);
}

/**
 * Promotes a resume to primary (⭐). The DB trigger guarantees a single
 * primary CV per user; errors (rare, ownership-related) simply skip the
 * revalidation so the UI keeps showing the actual persisted state.
 */
export async function setPrimaryResumeAction(formData: FormData): Promise<void> {
  const resumeId = readResumeId(formData);
  if (!resumeId) {
    return;
  }

  const { error } = await setPrimaryResume(resumeId);
  if (!error) {
    revalidatePath('/dashboard/resume');
    revalidatePath('/dashboard');
  }
}

/** Removes the primary (⭐) flag from a resume. */
export async function unsetPrimaryResumeAction(formData: FormData): Promise<void> {
  const resumeId = readResumeId(formData);
  if (!resumeId) {
    return;
  }

  const { error } = await unsetPrimaryResume(resumeId);
  if (!error) {
    revalidatePath('/dashboard/resume');
    revalidatePath('/dashboard');
  }
}

/** Updates the user-defined label/category of a resume. */
export async function updateResumeLabelAction(formData: FormData): Promise<void> {
  const resumeId = readResumeId(formData);
  if (!resumeId) {
    return;
  }

  const labelEntry = formData.get('label');
  if (typeof labelEntry !== 'string') {
    return;
  }

  const { error } = await updateResumeLabel(resumeId, labelEntry);
  if (!error) {
    revalidatePath('/dashboard/resume');
    revalidatePath(`/dashboard/resume/${resumeId}`);
    revalidatePath('/dashboard');
  }
}

/**
 * Deletes a resume (DB row + storage object). Its analysis/matching logs are
 * removed by the ON DELETE CASCADE constraints (migration 003).
 */
export async function deleteResumeAction(formData: FormData): Promise<void> {
  const resumeId = readResumeId(formData);
  if (!resumeId) {
    return;
  }

  const { error } = await deleteResume(resumeId);
  if (!error) {
    revalidatePath('/dashboard/resume');
    revalidatePath('/dashboard');
  }
}

/**
 * Explicit "Analyze my CV" action from the preview view: queues a deep
 * analysis by inserting an append-only log row (score null until the LLM
 * pipeline processes it). No upload path ever calls this automatically.
 */
export async function analyzeResumeAction(
  _prevState: ResumeActionState,
  formData: FormData
): Promise<ResumeActionState> {
  const resumeId = readResumeId(formData);

  if (!resumeId) {
    return { success: false, message: 'Missing resume reference. Please retry.' };
  }

  const response = await createResumeAnalysis(resumeId, 'deep');

  if (response.error || !response.data) {
    return {
      success: false,
      message: response.error ?? 'Failed to queue the analysis. Please retry.',
    };
  }

  revalidatePath(`/dashboard/resume/${resumeId}`);
  revalidatePath('/dashboard');

  return { success: true, message: 'Analysis queued! Results will appear on this page.' };
}

/**
 * Read-only polling helper used by the client `LatestAnalysisCard` to refresh
 * the latest analysis row without a full page reload. Ownership is enforced
 * server-side by `getLatestResumeAnalysis` (user check + RLS).
 */
export async function getLatestAnalysisAction(
  resumeId: string
): Promise<ResumeAnalysis | null> {
  if (resumeId.length === 0) {
    return null;
  }

  const { data } = await getLatestResumeAnalysis(resumeId);
  return data;
}
