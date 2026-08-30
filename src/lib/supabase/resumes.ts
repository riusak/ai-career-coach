import { createClient } from '@/utils/supabase/server';
import { sanitizeFileName, validateResumeFile } from '@/lib/resume-validation';
import type {
  Resume,
  ResumeAnalysis,
  ResumeAnalysisType,
  ResumeResponse,
} from '@/types/resume';

export const RESUME_BUCKET = 'resumes';

/**
 * Column lists for resume reads. `label` (migration 004) is read optimistically:
 * if the migration has not been applied yet, the query is retried without it
 * (Postgres error 42703 = undefined column) and `label` degrades to null.
 */
const RESUME_SELECT_WITH_LABEL =
  'id, user_id, file_path, file_name, label, is_primary, parsed_content, created_at';

const RESUME_SELECT_WITHOUT_LABEL =
  'id, user_id, file_path, file_name, is_primary, parsed_content, created_at';

type ResumeRowWithoutLabel = Omit<Resume, 'label'>;

/** PostgreSQL 42703 = undefined_column (label not migrated yet). */
function isUndefinedColumnError(error: { code?: string }): boolean {
  return error.code === '42703';
}

function withNullableLabel(
  rows: Array<ResumeRowWithoutLabel & { label?: string | null }>
): Resume[] {
  return rows.map((row) => ({ ...row, label: row.label ?? null }));
}

/**
 * Uploads a resume file to the private "resumes" storage bucket under the
 * authenticated user's folder ("<user_id>/<timestamp>-<file_name>") and
 * inserts its metadata in the resumes table. The uploaded file is removed
 * if the metadata insert fails to avoid orphaned storage objects.
 */
export async function uploadResume(file: File): Promise<ResumeResponse<Resume>> {
  try {
    const validationError = validateResumeFile(file);
    if (validationError) {
      return { data: null, error: validationError };
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? 'No authenticated user found.' };
    }

    const filePath = `${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;

    // The first uploaded resume becomes the primary one automatically
    // (docs/product/mvp.md §3.1: a default CV must exist for the dashboard).
    const { count, error: countError } = await supabase
      .from('resumes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      return { data: null, error: countError.message };
    }

    const isPrimary = (count ?? 0) === 0;

    const { error: uploadError } = await supabase.storage
      .from(RESUME_BUCKET)
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return { data: null, error: uploadError.message };
    }

    const { data, error: insertError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        file_path: filePath,
        file_name: file.name,
        label: null,
        is_primary: isPrimary,
        parsed_content: null,
      })
      .select('id, user_id, file_path, file_name, label, is_primary, parsed_content, created_at')
      .single();

    if (insertError || !data) {
      // Roll back the storage upload so no orphaned object remains.
      await supabase.storage.from(RESUME_BUCKET).remove([filePath]);
      return { data: null, error: insertError?.message ?? 'Failed to save resume metadata.' };
    }

    return { data: data as Resume, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while uploading the resume.';
    return { data: null, error: message };
  }
}

/**
 * Fetches the authenticated user's resumes, newest first.
 */
export async function getUserResumes(): Promise<ResumeResponse<Resume[]>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? 'No authenticated user found.' };
    }

    const withLabel = await supabase
      .from('resumes')
      .select(RESUME_SELECT_WITH_LABEL)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    let data: Array<ResumeRowWithoutLabel & { label?: string | null }> | null = withLabel.data;
    let error: typeof withLabel.error = withLabel.error;

    // Migration 004 not applied yet: retry without `label` (degrades to null).
    if (error && isUndefinedColumnError(error)) {
      const fallback = await supabase
        .from('resumes')
        .select(RESUME_SELECT_WITHOUT_LABEL)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return { data: null, error: error.message };
    }

    const rows = withNullableLabel(
      (data ?? []) as Array<ResumeRowWithoutLabel & { label?: string | null }>
    );

    return { data: rows, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while fetching resumes.';
    return { data: null, error: message };
  }
}

/**
 * Fetches a single resume of the authenticated user by id.
 * Returns null (without error) when the resume does not exist or is not
 * owned by the caller (row filtered out by RLS).
 */
export async function getResumeById(resumeId: string): Promise<ResumeResponse<Resume>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? 'No authenticated user found.' };
    }

    const withLabel = await supabase
      .from('resumes')
      .select(RESUME_SELECT_WITH_LABEL)
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    let data: (ResumeRowWithoutLabel & { label?: string | null }) | null = withLabel.data;
    let error: typeof withLabel.error = withLabel.error;

    // Migration 004 not applied yet: retry without `label` (degrades to null).
    if (error && isUndefinedColumnError(error)) {
      const fallback = await supabase
        .from('resumes')
        .select(RESUME_SELECT_WITHOUT_LABEL)
        .eq('id', resumeId)
        .eq('user_id', user.id)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const rows = withNullableLabel([data as ResumeRowWithoutLabel & { label?: string | null }]);

    return { data: rows[0] ?? null, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while fetching the resume.';
    return { data: null, error: message };
  }
}

/**
 * Promotes a resume to primary (⭐). The `demote_other_primary_resumes` DB
 * trigger (migration 002) demotes the previous primary in the same statement,
 * so at most one primary row per user exists at any time.
 */
export async function setPrimaryResume(resumeId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: authError?.message ?? 'No authenticated user found.' };
    }

    const { error } = await supabase
      .from('resumes')
      .update({ is_primary: true })
      .eq('id', resumeId)
      .eq('user_id', user.id);

    return { error: error?.message ?? null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while updating the primary resume.';
    return { error: message };
  }
}

/**
 * Removes the primary (⭐) flag from a resume. A user may have no primary CV.
 */
export async function unsetPrimaryResume(resumeId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: authError?.message ?? 'No authenticated user found.' };
    }

    const { error } = await supabase
      .from('resumes')
      .update({ is_primary: false })
      .eq('id', resumeId)
      .eq('user_id', user.id);

    return { error: error?.message ?? null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while updating the primary resume.';
    return { error: message };
  }
}

/**
 * Updates the user-defined label/category of a resume ("CV Dev", "CV Data FR"...).
 * An empty label is stored as NULL. Max 80 characters (DB-enforced as well).
 */
export async function updateResumeLabel(
  resumeId: string,
  label: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: authError?.message ?? 'No authenticated user found.' };
    }

    const trimmed = label.trim();
    if (trimmed.length > 80) {
      return { error: 'Label must be 80 characters or fewer.' };
    }

    const { error } = await supabase
      .from('resumes')
      .update({ label: trimmed.length === 0 ? null : trimmed })
      .eq('id', resumeId)
      .eq('user_id', user.id);

    return { error: error?.message ?? null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while updating the resume label.';
    return { error: message };
  }
}

/**
 * Deletes a resume owned by the authenticated user: the DB row first
 * (cascading on its analysis/matching logs per migration 003), then the
 * underlying storage object. The private file is removed best-effort after
 * the row delete succeeds.
 */
export async function deleteResume(resumeId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: authError?.message ?? 'No authenticated user found.' };
    }

    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('file_path')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError.message };
    }

    if (!resume) {
      return { error: 'Resume not found.' };
    }

    const { error: deleteError } = await supabase
      .from('resumes')
      .delete()
      .eq('id', resumeId)
      .eq('user_id', user.id);

    if (deleteError) {
      return { error: deleteError.message };
    }

    // The row is gone (logs cascaded); clean up the private storage object.
    const { error: storageError } = await supabase.storage
      .from(RESUME_BUCKET)
      .remove([resume.file_path]);

    // The DB row is already deleted: a storage failure leaves an orphaned
    // object only, never orphaned metadata.
    return { error: storageError?.message ?? null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while deleting the resume.';
    return { error: message };
  }
}

/**
 * Queues a deep analysis for a resume by inserting a row in the append-only
 * `resume_analyses` log (migration 003). `score` stays null until the LLM
 * pipeline fills the result — no analysis is triggered on upload, only here.
 */
export async function createResumeAnalysis(
  resumeId: string,
  analysisType: ResumeAnalysisType
): Promise<ResumeResponse<ResumeAnalysis>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? 'No authenticated user found.' };
    }

    const { data, error } = await supabase
      .from('resume_analyses')
      .insert({
        resume_id: resumeId,
        user_id: user.id,
        analysis_type: analysisType,
      })
      .select('id, resume_id, user_id, analysis_type, score, structured_output, created_at')
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ResumeAnalysis, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while queuing the analysis.';
    return { data: null, error: message };
  }
}

/**
 * Fetches the most recent analysis log row of a resume (null if never analyzed).
 */
export async function getLatestResumeAnalysis(
  resumeId: string
): Promise<ResumeResponse<ResumeAnalysis>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? 'No authenticated user found.' };
    }

    const { data, error } = await supabase
      .from('resume_analyses')
      .select('id, resume_id, user_id, analysis_type, score, structured_output, created_at')
      .eq('resume_id', resumeId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ResumeAnalysis | null, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while fetching the analysis.';
    return { data: null, error: message };
  }
}

/**
 * Creates a short-lived signed URL for the private resume file, used by the
 * PDF preview component. Access is authorized by the storage RLS policies
 * (owner-only) even though the URL itself is unguessable.
 */
export async function createResumeSignedUrl(
  filePath: string,
  expiresInMinutes = 60
): Promise<ResumeResponse<string>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? 'No authenticated user found.' };
    }

    const { data, error } = await supabase.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(filePath, expiresInMinutes * 60);

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Failed to create the preview URL.' };
    }

    return { data: data.signedUrl, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while creating the preview URL.';
    return { data: null, error: message };
  }
}
