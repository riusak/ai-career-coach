/**
 * resume/match/route.ts â€” Job-matching worker pour les comptes authentifiÃ©s.
 *
 * Miroir exact de l'architecture du worker d'analyse (`/api/resume/analyze`) :
 * la route est un ADAPTATEUR HTTP mince autour du pipeline de matching UNIQUE
 * (`src/lib/analysis/matching.ts`), lui-mÃªme alimentÃ© par le client Gemini
 * dÃ©diÃ© (`src/lib/quick-test/matching-llm.ts`).
 *
 * Responsibilities conservÃ©es ici (transport / file d'attente):
 *   1) RequÃªte authentifiÃ©e (session Supabase) + ownership checks;
 *   2) Claim atomique de la ligne en attente (`job_matchings`, match_score null)
 *      avec rÃ©clamation des claims pÃ©rimÃ©s (crashs);
 *   3) RÃ©solution du texte du CV (parsed_content, sinon extraction Ã  la volÃ©e
 *      depuis le fichier privÃ© de Storage) puis dÃ©lÃ©gation au pipeline partagÃ©;
 *   4) Persistance {match_score, matching_details};
 *   5) Ã‰chec terminal â†’ suppression de la ligne en attente (anti-blocage UI).
 *
 * Failure policy: toute erreur non rÃ©cupÃ©rable (CV illisible, texte d'offre
 * invalide, Ã©chec LLM aprÃ¨s retries...) supprime la ligne en attente â€” l'UI ne
 * reste jamais bloquÃ©e et l'utilisateur peut simplement relancer. Il n'y a
 * AUCUN fallback heuristique: un Ã©chec transitoire du LLM fait Ã©chouer
 * l'exÃ©cution explicitement, jamais avec un faux score.
 */

import { analyzeJobMatch } from '@/lib/analysis/matching';
import {
  claimQueuedJobMatching,
  completeJobMatching,
  deleteQueuedJobMatching,
  getJobMatchingById,
  updateMatchingStage,
} from '@/lib/supabase/matchings';
import {
  downloadResumeFile,
  getResumeById,
} from '@/lib/supabase/resumes';
import {
  extractPdfText,
  PdfExtractionError,
} from '@/lib/quick-test/pdf-extract';
import {
  extractDocxText,
  DocxExtractionError,
} from '@/lib/quick-test/docx-extract';
import type { JobMatchingDetails } from '@/types/matching';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** A claim older than this is considered abandoned and may be reclaimed. */
const STALE_CLAIM_MS = 90_000;

/** Cap applied to on-the-fly CV text extraction (memory / prompt guard). */
const MAX_MATCHING_RESUME_CHARS = 20_000;

function jsonResponse(payload: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function isProcessingMarker(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.status === 'processing' && typeof record.claimed_at === 'string';
}
/** Extracts plain text from a stored resume file (PDF/DOCX/TXT), capped. */
async function extractResumeText(
  buffer: Buffer,
  fileName: string
): Promise<{ text: string; error: string | null }> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) {
    try {
      const { text } = extractPdfText(buffer);
      return { text: text.slice(0, MAX_MATCHING_RESUME_CHARS), error: null };
    } catch (err) {
      const message =
        err instanceof PdfExtractionError
          ? err.message
          : 'Impossible de lire ce PDF (il est peut-Ãªtre corrompu ou scannÃ©).';
      return { text: '', error: message };
    }
  }
  if (lower.endsWith('.docx')) {
    try {
      const { text } = await extractDocxText(buffer);
      return { text: text.slice(0, MAX_MATCHING_RESUME_CHARS), error: null };
    } catch (err) {
      const message =
        err instanceof DocxExtractionError
          ? err.message
          : 'Impossible de lire ce document Word (il est peut-Ãªtre corrompu).';
      return { text: '', error: message };
    }
  }
  if (lower.endsWith('.txt')) {
    return { text: buffer.toString('utf8').slice(0, MAX_MATCHING_RESUME_CHARS), error: null };
  }
  return { text: '', error: 'Format de CV non supportÃ© pour le matching.' };
}

export async function POST(request: Request): Promise<Response> {
  // 1) Body parsing + validation.

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.', code: 'server_error' }, 400);
  }

  if (typeof body !== 'object' || body === null) {
    return jsonResponse({ error: 'Invalid JSON body.', code: 'server_error' }, 400);
  }

  const matchingId = (body as Record<string, unknown>).matchingId;
  if (typeof matchingId !== 'string' || matchingId.length === 0) {
    return jsonResponse({ error: 'Missing matching reference.', code: 'server_error' }, 400);
  }

  // 2) Ownership + queue state check.

  const { data: matching, error: fetchError } = await getJobMatchingById(matchingId);
  if (fetchError || !matching) {
    return jsonResponse(
      { error: fetchError ?? 'Matching not found.', code: 'server_error' },
      404
    );
  }

  if (matching.match_score !== null) {
    // Already completed (e.g. double-trigger) - not an error for the user.
    return jsonResponse({ status: 'already_completed' }, 200);
  }

  const currentDetails = matching.matching_details;
  if (
    isProcessingMarker(currentDetails) &&
    Date.now() - Date.parse((currentDetails as { claimed_at: string }).claimed_at) <=
      STALE_CLAIM_MS
  ) {
    // Another worker run is actively processing this row.
    return jsonResponse({ status: 'already_claimed' }, 202);
  }

  const claim = await claimQueuedJobMatching(matchingId);
  if (claim.error) {
    return jsonResponse({ error: claim.error, code: 'server_error' }, 500);
  }
  if (!claim.claimed) {
    // Lost the claim race (or the row is not actually queued).
    return jsonResponse({ status: 'not_claimed' }, 409);
  }

  const claimedAt = new Date().toISOString();

  // 3) Resolve the CV text (parsed_content first, on-the-fly extraction else).

  try {
    void updateMatchingStage(matchingId, claimedAt, 'extracting');

    const resumeResult = await getResumeById(matching.resume_id);
    if (resumeResult.error || !resumeResult.data) {
      throw new Error(resumeResult.error ?? 'Resume not found.');
    }
    const resume = resumeResult.data;

    let resumeText = resume.parsed_content?.raw_text?.trim() ?? '';
    if (resumeText.length === 0) {
      const download = await downloadResumeFile(resume.file_path);
      if (download.error || !download.data) {
        throw new Error(download.error ?? 'Failed to download the resume file.');
      }
      const extracted = await extractResumeText(download.data, resume.file_name);
      if (extracted.error || extracted.text.trim().length === 0) {
        throw new Error(extracted.error ?? 'Aucun texte exploitable extrait de ce CV.');
      }
      resumeText = extracted.text;
    }

    const pipelineResult = await analyzeJobMatch({
      resumeText,
      jobTitle: matching.job_title,
      jobDescription: matching.job_description,
      company: matching.company,
      location: matching.location,
      onStage: (stage) => {
        void updateMatchingStage(matchingId, claimedAt, stage);
      },
    });

    if (!pipelineResult.ok) {
      // Echec terminal du pipeline (CV sans texte, offre invalide, LLM
      // indisponible...) - la ligne en attente est supprimee pour que l'UI
      // ne reste jamais bloquee; l'utilisateur relance simplement.
      await deleteQueuedJobMatching(matchingId);
      const { error } = pipelineResult;
      return jsonResponse(
        { error: error.message, code: error.code },
        error.httpStatus
      );
    }

    // 4) Persist the result (match_score null -> filled; the polling UI picks it up).
    const details: JobMatchingDetails = {
      source: 'llm',
      result: pipelineResult.result,
    };
    const completion = await completeJobMatching(
      matchingId,
      pipelineResult.result.overall,
      details
    );
    if (completion.error) {
      throw new Error(completion.error);
    }
    if (!completion.completed) {
      // Lost a race against another run - not an error for the user.
      return jsonResponse({ status: 'already_completed' }, 200);
    }

    console.info(
      `[matching] ✅ Matching ${matchingId} completed - score=${pipelineResult.result.overall}`
    );
    return jsonResponse(
      { status: 'completed', source: pipelineResult.source, score: pipelineResult.result.overall },
      200
    );
  } catch (error) {
    // Anti-deadlock: drop the still-queued row so the UI never hangs forever.
    const cleanup = await deleteQueuedJobMatching(matchingId);
    console.error(
      `[matching] ❌ Matching ${matchingId} failed (queued row removed=${cleanup.deleted}):`,
      error
    );
    const message =
      error instanceof Error ? error.message : 'The matching pipeline failed unexpectedly.';
    return jsonResponse(
      {
        error: message,
        code: 'server_error',
      },
      500
    );
  }
}
