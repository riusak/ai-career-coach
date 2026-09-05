import { createClient } from '@/utils/supabase/server';
import type { MatchingStage, MatchingSourceType } from '@/types/matching';
import type { JobMatching, JobMatchingDetails, MatchingResponse } from '@/types/matching';

/**
 * Data layer for the append-only `job_matchings` log (migrations 003 + 011).
 * Mirrors the resume_analyses worker contract exactly:
 *
 *   1. queue    - insert a row with match_score NULL (nothing runs automatically);
 *   2. claim    - the worker writes a transient {status:'processing'} marker via
 *                 a conditional UPDATE (concurrency guard: only one run claims);
 *   3. stages   - the marker's `stage` field is refreshed in lockstep with the
 *                 REAL pipeline work so the UI ticket advances truthfully;
 *   4. complete - match_score NULL -> {match_score, matching_details} (policy
 *                 011 allows this UPDATE only while match_score IS NULL);
 *   5. anti-deadlock - a terminal failure DELETES the still-queued row so the
 *                 UI never spins on a result that will never arrive.
 *
 * Completed rows (match_score NOT NULL) are immutable from the UPDATE policy's
 * point of view - the append-only spirit of migration 003 stays intact.
 */

const MATCHING_SELECT =
  'id, resume_id, user_id, job_title, job_description, company, location, ' +
  'source_type, source_url, offer_file_name, match_score, matching_details, created_at';

interface CreateJobMatchingInput {
  resumeId: string;
  jobTitle: string;
  jobDescription: string;
  company?: string | null;
  location?: string | null;
  sourceType?: MatchingSourceType;
  sourceUrl?: string | null;
  offerFileName?: string | null;
}

/** Trims any 1-char metadata to null (the DB columns are nullable text). */
function optionalText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 300) : null;
}

/**
 * Queues a job matching by inserting an append-only row (match_score stays
 * null until the LLM pipeline fills the result).
 */
export async function createJobMatching(
  input: CreateJobMatchingInput
): Promise<MatchingResponse<JobMatching>> {
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
      .from('job_matchings')
      .insert({
        resume_id: input.resumeId,
        user_id: user.id,
        job_title: input.jobTitle.trim().slice(0, 200),
        job_description: input.jobDescription.trim(),
        company: optionalText(input.company),
        location: optionalText(input.location),
        source_type: input.sourceType ?? 'text',
        source_url: optionalText(input.sourceUrl),
        offer_file_name: optionalText(input.offerFileName),
      })
      .select(MATCHING_SELECT)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as unknown as JobMatching) ?? null, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while queueing the matching.';
    return { data: null, error: message };
  }
}

/** Fetches all the authenticated user's matchings, newest first. */
export async function getUserMatchings(): Promise<MatchingResponse<JobMatching[]>> {
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
      .from('job_matchings')
      .select(MATCHING_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as unknown as JobMatching[]) ?? [], error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while fetching matchings.';
    return { data: null, error: message };
  }
}

/**
 * Fetches a single matching of the authenticated user by id. Returns null
 * (without error) when the row does not exist or is not owned by the caller
 * (filtered by RLS).
 */
export async function getJobMatchingById(
  matchingId: string
): Promise<MatchingResponse<JobMatching>> {
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
      .from('job_matchings')
      .select(MATCHING_SELECT)
      .eq('id', matchingId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as JobMatching | null) ?? null, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while fetching the matching.';
    return { data: null, error: message };
  }
}

/**
 * Atomically claims a queued matching row (match_score null, no output yet)
 * by writing a transient claim marker into `matching_details`. The conditional
 * UPDATE is the concurrency guard: two concurrent worker runs cannot both claim
 * the same row. Requires the migration 011 UPDATE policy to be applied.
 */
export async function claimQueuedJobMatching(
  matchingId: string
): Promise<{ claimed: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { claimed: false, error: authError?.message ?? 'No authenticated user found.' };
    }

    const marker: { status: 'processing'; claimed_at: string } = {
      status: 'processing',
      claimed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('job_matchings')
      .update({ matching_details: marker })
      .eq('id', matchingId)
      .eq('user_id', user.id)
      .is('match_score', null)
      .is('matching_details', null)
      .select('id');

    if (error) {
      return { claimed: false, error: error.message };
    }

    return { claimed: (data?.length ?? 0) === 1, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while claiming the matching.';
    return { claimed: false, error: message };
  }
}

/**
 * Persists the real pipeline stage reached by the worker into the transient
 * claim marker (match_score still null - policy 011). Best-effort: the final
 * completion rewrites `matching_details` anyway, and the `match_score is null`
 * guard guarantees a finished result is never overwritten by a late marker.
 */
export async function updateMatchingStage(
  matchingId: string,
  claimedAt: string,
  stage: MatchingStage
): Promise<void> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return;
    }

    const marker: JobMatchingDetails = {
      source: 'llm',
      status: 'processing',
      claimed_at: claimedAt,
      stage,
    };

    const { error } = await supabase
      .from('job_matchings')
      .update({ matching_details: marker })
      .eq('id', matchingId)
      .eq('user_id', user.id)
      .is('match_score', null);

    if (error) {
      console.warn(`[matching] Stage update failed (${stage}):`, error.message);
    }
  } catch {
    // Best-effort : jamais bloquant pour le matching.
  }
}

/**
 * Persists the finished matching on a still-queued row (match_score null ->
 * filled). The `match_score is null` guard keeps completed rows immutable.
 * Returns `completed: false` when the row was concurrently completed or gone.
 */
export async function completeJobMatching(
  matchingId: string,
  score: number,
  details: JobMatchingDetails
): Promise<{ completed: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { completed: false, error: authError?.message ?? 'No authenticated user found.' };
    }

    const { data, error } = await supabase
      .from('job_matchings')
      .update({ match_score: score, matching_details: details })
      .eq('id', matchingId)
      .eq('user_id', user.id)
      .is('match_score', null)
      .select('id');

    if (error) {
      return { completed: false, error: error.message };
    }

    return { completed: (data?.length ?? 0) === 1, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while saving the matching.';
    return { completed: false, error: message };
  }
}

/**
 * Removes a still-queued matching row (match_score null) owned by the caller.
 * Used by the worker as an anti-deadlock escape hatch on terminal failures so
 * the UI falls back to the empty state. Completed rows are never touched.
 */
export async function deleteQueuedJobMatching(
  matchingId: string
): Promise<{ deleted: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { deleted: false, error: authError?.message ?? 'No authenticated user found.' };
    }

    const { data, error } = await supabase
      .from('job_matchings')
      .delete()
      .eq('id', matchingId)
      .eq('user_id', user.id)
      .is('match_score', null)
      .select('id');

    if (error) {
      return { deleted: false, error: error.message };
    }

    return { deleted: (data?.length ?? 0) === 1, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while cleaning up the matching.';
    return { deleted: false, error: message };
  }
}

/** Deletes any matching row of the authenticated user (history management). */
export async function deleteJobMatching(
  matchingId: string
): Promise<{ deleted: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { deleted: false, error: authError?.message ?? 'No authenticated user found.' };
    }

    const { data, error } = await supabase
      .from('job_matchings')
      .delete()
      .eq('id', matchingId)
      .eq('user_id', user.id)
      .select('id');

    if (error) {
      return { deleted: false, error: error.message };
    }

    return { deleted: (data?.length ?? 0) === 1, error: null };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while deleting the matching.';
    return { deleted: false, error: message };
  }
}
