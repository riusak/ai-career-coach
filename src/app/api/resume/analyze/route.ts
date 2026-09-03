/**
 * resume/analyze/route.ts — Deep-analysis worker pour les comptes authentifiés.
 *
 * ⚠️ ARCHITECTURE (2026-09) : cette route est désormais un ADAPTATEUR
 * HTTP mince autour du pipeline d'analyse UNIQUE. Toute la logique de
 * validation / extraction / conversion multimodale / appel LLM vit dans
 * `src/lib/analysis/pipeline.ts` — le même module partagé avec la route
 * publique `/api/quick-test`. Il n'y a qu'UN seul pipeline, donc chaque
 * document bénéficie exactement de la même logique stable, quelle que soit
 * sa provenance (visiteur anonyme ou utilisateur connecté).
 *
 * Responsibilities conservées ici (transport / file d'attente):
 *   1) Requête authentifiée (session Supabase) + ownership checks;
 *   2) Claim atomique de la ligne en attente (`resume_analyses`, score null)
 *      avec réclamation des claims périmés (crashs);
 *   3) Téléchargement du fichier privé (Storage) puis délégation au pipeline
 *      partagé (PDF/DOCX/TXT);
 *   4) Persistance {score, structured_output} + marquage `parsed_content`;
 *   5) Échec terminal → suppression de la ligne en attente (anti-blocage UI);
 *
 * Failure policy: toute erreur non récupérable (fichier illisible, non-CV,
 * échec LLM après retries...) supprime la ligne en attente — l'UI ne reste
 * jamais bloquée et l'utilisateur peut simplement relancer. Il n'y a AUCUN
 * fallback heuristique: un échec transitoire du LLM fait échouer
 * l'exécution explicitement, jamais avec un faux score. Le statut HTTP
 * renvoyé est celui du pipeline unifié (400/413/415/422/502/503 selon le
 * code machine), que le client (LatestAnalysisCard) sait surfacer.
 */

import { analyzeCvDocument } from '@/lib/analysis/pipeline';
import type { QuickTestErrorCode } from '@/lib/quick-test/error-codes';
import type { DeepAnalysisProcessingMarker, ParsedResumeContent } from '@/types/resume';
import {
  claimQueuedResumeAnalysis,
  completeResumeAnalysis,
  deleteQueuedResumeAnalysis,
  downloadResumeFile,
  getLatestResumeAnalysis,
  getResumeById,
  markResumeParsed,
  updateAnalysisStage,
} from '@/lib/supabase/resumes';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** A claim older than this is considered abandoned and may be reclaimed. */
const STALE_CLAIM_MS = 90_000;

function jsonResponse(payload: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function errorJsonResponse(message: string, status: number, code: QuickTestErrorCode): Response {
  return jsonResponse({ error: message, code }, status);
}

function isProcessingMarker(value: unknown): value is DeepAnalysisProcessingMarker {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.status === 'processing' && typeof record.claimed_at === 'string';
}

function isStaleClaim(marker: DeepAnalysisProcessingMarker): boolean {
  const claimedAt = Date.parse(marker.claimed_at);
  return Number.isFinite(claimedAt) && Date.now() - claimedAt > STALE_CLAIM_MS;
}

export async function POST(request: Request): Promise<Response> {
  // 1) Body parsing + validation.

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJsonResponse('Invalid JSON body.', 400, 'server_error');
  }

  const resumeId =
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>).resumeId === 'string'
      ? ((body as Record<string, unknown>).resumeId as string)
      : '';

  if (resumeId.length === 0) {
    return errorJsonResponse('Missing resumeId.', 400,'server_error');
  }

  // 2) Ownership: both helpers run under the caller's session + RLS; a
  // resume the user does not own resolves to null.

  const { data: resume } = await getResumeById(resumeId);
  if (!resume) {
    return errorJsonResponse('Resume not found.', 404,'server_error');
  }

  const { data: latest, error: latestError } = await getLatestResumeAnalysis(resumeId);
  if (latestError) {
    return errorJsonResponse(latestError, 500,'server_error');
  }
  if (!latest) {
    return errorJsonResponse('No analysis has been queued for this resume.', 409,'server_error');
  }
  if (latest.score !== null) {
    return jsonResponse({ status: 'already_completed', score: latest.score }, 200);
  }

  // 3) Atomic claim (idempotent re-trigger guard). If another run holds a
  // fresh claim, report "processing" and let its owner finish; a stale claim
  // (crashed run) is reclaimed so a queued row can never be stuck forever.
  // `claimedAt` alimente le marqueur de stade live écrit par le pipeline.

  let claimedAt = new Date().toISOString();
  const claim = await claimQueuedResumeAnalysis(latest.id);
  if (claim.error) {
    return errorJsonResponse(claim.error, 500,'server_error');
  }

  if (!claim.claimed) {
    const { data: current } = await getLatestResumeAnalysis(resumeId);
    if (!current) {
      return errorJsonResponse('The queued analysis no longer exists.', 409,'server_error');
    }
    if (current.score !== null) {
      return jsonResponse({ status: 'already_completed', score: current.score }, 200);
    }
    const marker = current.structured_output;
    if (!isProcessingMarker(marker) || !isStaleClaim(marker)) {
      return jsonResponse({ status: 'processing' }, 202);
    }
    claimedAt = marker.claimed_at;
    console.warn(
      `[analyze] Reclaiming stale claim on analysis ${latest.id} (claimed_at=${marker.claimed_at})`
    );
  }

  // 4) Téléchargement du fichier privé puis délégation au pipeline UNIQUE.

  try {
    const { data: buffer, error: downloadError } = await downloadResumeFile(resume.file_path);
    if (downloadError || !buffer) {
      throw new Error(downloadError ?? 'Failed to download the resume file.');
    }

    const pipelineResult = await analyzeCvDocument({
      buffer,
      fileName: resume.file_name,
      onStage: (stage) => {
        // Sync UI live : le marqueur transitoire porte le dernier stade RÉEL
        // du pipeline ; le polling du dashboard le traduit en progression du
        // ticket. Best-effort (jamais bloquant) — la complétion finale réécrit
        // `structured_output`, et le guard `score is null` garantit qu'un
        // résultat terminé n'est jamais écrasé par un marqueur tardif.
        void updateAnalysisStage(latest.id, claimedAt, stage);
      },
    });

    if (!pipelineResult.ok) {
      // Échec terminal du pipeline unifié (fichier illisible, non-CV, LLM
      // indisponible...) — la ligne en attente est supprimée pour que l'UI
      // ne reste jamais bloquée; l'utilisateur relance simplement.
      await deleteQueuedResumeAnalysis(latest.id);
      const { error } = pipelineResult;
      return jsonResponse(
        {
          error: error.message,
          code: error.code,
          ...(error.documentType ? { documentType: error.documentType } : {}),
          ...(error.documentKind ? { documentKind: error.documentKind } : {}),
        },
        error.httpStatus
      );
    }

    // 5) Persist the result (score null → filled; the polling UI picks it up).
    const completion = await completeResumeAnalysis(latest.id, pipelineResult.analysis.score, {
      source: pipelineResult.source,
      analysis: pipelineResult.analysis,
    });
    if (completion.error) {
      throw new Error(completion.error);
    }
    if (!completion.completed) {
      // Lost a race against another run — not an error for the user.
      return jsonResponse({ status: 'already_completed' }, 200);
    }

    // 6) Mark the resume as parsed so the catalogue UI shows "Analysé" instead
    // of "Analyse en attente" — keeps the parsed_content status in sync with the
    // latest completed analysis. The extracted text comes from the SAME unified
    // pipeline (never a second, divergent extraction).
    const parsedContent: ParsedResumeContent = {
      raw_text: pipelineResult.text,
      word_count: pipelineResult.wordCount,
      parsed_at: new Date().toISOString(),
    };
    const markResult = await markResumeParsed(resume.id, parsedContent);
    if (markResult.error) {
      console.warn(
        `[analyze] ⚠ Failed to mark resume ${resume.id} as parsed:`,
        markResult.error
      );
    }

    console.info(
      `[analyze] ✅ Analysis ${latest.id} completed — source=${pipelineResult.source}, score=${pipelineResult.analysis.score}`
    );
    return jsonResponse({ status: 'completed', source: pipelineResult.source, score: pipelineResult.analysis.score }, 200);
  } catch (error) {
    // Anti-deadlock: drop the still-queued row so the UI never hangs forever;
    // the user can simply retry from the "Analyze my CV" button.
    const cleanup = await deleteQueuedResumeAnalysis(latest.id);
    console.error(
      `[analyze] ❌ Analysis ${latest.id} failed (queued row removed=${cleanup.deleted}):`,
      error
    );
    const message =
      error instanceof Error ? error.message : 'The analysis pipeline failed unexpectedly.';
    return jsonResponse(
      {
        error: message,
        code: 'server_error',
      },
      500
    );
  }
}