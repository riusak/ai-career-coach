'use server';

import { revalidateDashboardData } from '@/lib/dashboard/revalidate';
import { MAX_OFFER_TEXT_CHARS, ingestOfferText } from '@/lib/analysis/offer-ingest';
import {
  extractOfferMetadata,
  GENERIC_JOB_TITLE,
} from '@/lib/analysis/offer-metadata';
import {
  createJobMatching,
  deleteJobMatching,
  getJobMatchingById,
} from '@/lib/supabase/matchings';
import type { JobMatching } from '@/types/matching';

export type MatchingQueueState = {
  success: boolean;
  message: string | null;
  data: JobMatching | null;
};

export type MatchingActionState = {
  success: boolean;
  message: string | null;
};

/** Server-side input guards mirroring the pipeline bounds (cheap early rejects). */
const MIN_OFFER_CHARS = 20;
const MAX_TITLE_CHARS = 200;

function readOptional(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === 'string' ? value : null;
}

/**
 * Queues a job matching by inserting an append-only `job_matchings` row
 * (match_score NULL). The LLM comparison is NEVER triggered here — the client
 * fires POST /api/resume/match exactly once for the queued row (referenced by
 * its id), then polls this fresh row via getLatestMatchingAction (mirror of
 * the deep-analysis queue contract).
 *
 * The offer itself is ingested in ANY of the three supported formats
 * (uploaded PDF/Word file, public offer URL, raw pasted text) and normalized
 * into a clean `job_description` by `ingestOfferText` BEFORE any validation
 * or persistence — the Gemini pipeline only ever sees clean raw text.
 */
export async function queueJobMatchingAction(
  prevState: MatchingQueueState,
  formData: FormData
): Promise<MatchingQueueState> {
  const resumeId = readOptional(formData, 'resumeId');
  const userTitle = readOptional(formData, 'jobTitle')?.trim() ?? '';

  if (!resumeId) {
    return {
      success: false,
      message: 'Sélectionnez d’abord le CV à confronter à l’offre.',
      data: prevState.data,
    };
  }

  // Multimodal ingestion: file (PDF/Word/TXT) → URL → raw text, whichever
  // format was submitted; failures return a user-actionable French message.
  const ingested = await ingestOfferText(formData);
  if (ingested.error) {
    return {
      success: false,
      message: ingested.error,
      data: prevState.data,
    };
  }

  const jobDescription = ingested.text;
  if (jobDescription.length === 0) {
    return {
      success: false,
      message: 'Collez le texte de l’offre d’emploi avant de lancer le matching.',
      data: prevState.data,
    };
  }
  if (jobDescription.length < MIN_OFFER_CHARS) {
    return {
      success: false,
      message: `Le texte de l’offre est trop court (${MIN_OFFER_CHARS} caractères minimum).`,
      data: prevState.data,
    };
  }
  if (jobDescription.length > MAX_OFFER_TEXT_CHARS) {
    return {
      success: false,
      message: `Le texte de l’offre dépasse la limite de ${MAX_OFFER_TEXT_CHARS} caractères.`,
      data: prevState.data,
    };
  }

  // Chart 8 — offer-derived job title: when the user leaves the field empty,
  // the title is pulled from the offer itself (document text, fetched URL
  // page or raw paste). The canonical generic label is the last resort; the
  // worker then refines it at completion with the LLM detection.
  const heuristics = extractOfferMetadata(jobDescription);
  const jobTitle = (
    userTitle.length > 0 ? userTitle : (heuristics.jobTitle ?? GENERIC_JOB_TITLE)
  ).slice(0, MAX_TITLE_CHARS);

  const { data, error } = await createJobMatching({
    resumeId,
    jobTitle,
    jobDescription,
    company: readOptional(formData, 'company'),
    location: readOptional(formData, 'location'),
    sourceType: ingested.sourceType,
    sourceUrl: ingested.sourceUrl,
    offerFileName: ingested.offerFileName,
  });

  if (error || !data) {
    return {
      success: false,
      message: error ?? 'Impossible de lancer le matching. Veuillez réessayer.',
      data: prevState.data,
    };
  }

  revalidateDashboardData();

  return { success: true, message: 'Matching lancé ! Analyse en cours…', data };
}

/**
 * Read-only polling helper used by the client to refresh a matching row
 * without a full page reload. Ownership is enforced server-side by
 * `getJobMatchingById` (user check + RLS).
 */
export async function getLatestMatchingAction(
  matchingId: string
): Promise<JobMatching | null> {
  if (matchingId.length === 0) {
    return null;
  }
  const { data } = await getJobMatchingById(matchingId);
  return data;
}

/** Deletes a matching row from the history (completed rows included). */
export async function deleteJobMatchingAction(formData: FormData): Promise<void> {
  const value = formData.get('matchingId');
  const matchingId = typeof value === 'string' && value.length > 0 ? value : null;
  if (!matchingId) {
    return;
  }

  const { error } = await deleteJobMatching(matchingId);
  if (!error) {
    revalidateDashboardData();
  }
}