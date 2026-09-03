/**
 * resume/analyze/route.ts — Deep-analysis pipeline for authenticated users.
 *
 * The "Analyze my CV" server action only inserts an append-only log row
 * (`resume_analyses`, score null = queued). This route is the worker that
 * drains the queue:
 *
 *   1) Authenticated request (Supabase session cookie) + ownership checks.
 *   2) Atomically claims the queued row (conditional UPDATE — two concurrent
 *      runs cannot process the same row; stale claims are reclaimed).
 *   3) Downloads the private resume file (PDF/DOCX/TXT).
 *   4) Calls Gemini Flash with the NATIVE document (PDF inline_data — the
 *      model sees the real layout) or the extracted text (DOCX/TXT); single
 *      synchronous call, strict responseSchema, bounded timeout with an
 *      explicit retry chain — well under the 60 s Vercel maxDuration.
 *   5) Persists {score, structured_output} — the client polling loop then
 *      transitions the UI from "Queued" to the completed score.
 *
 * Failure policy: on an unrecoverable error (unreadable file, non-CV
 * document, LLM failure after retries...) the queued row is DELETED so the
 * UI never hangs forever — the user can simply retry. There is NO heuristic
 * fallback: a transient LLM failure fails the run explicitly, never with a
 * fake score.
 */

import { PdfExtractionError, countWords, extractPdfText } from '@/lib/quick-test/pdf-extract';
import { DocxExtractionError, extractDocxText } from '@/lib/quick-test/docx-extract';
import { analyzeWithGemini } from '@/lib/quick-test/llm';
import type { AnalysisDocumentMimeType } from '@/lib/quick-test/llm';
import { MAX_RESUME_TEXT_CHARS } from '@/lib/resume-validation';
import {
  claimQueuedResumeAnalysis,
  completeResumeAnalysis,
  deleteQueuedResumeAnalysis,
  downloadResumeFile,
  getLatestResumeAnalysis,
  getResumeById,
  markResumeParsed,
} from '@/lib/supabase/resumes';
import type { DeepAnalysisProcessingMarker } from '@/types/resume';
import type { QuickTestAnalysis, QuickTestSource } from '@/types/quick-test';
import type { ParsedResumeContent } from '@/types/resume';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** A queued analysis whose source document is not a resume at all (422). */
class NotACvError extends Error {}

/** A claim older than this is considered abandoned and may be reclaimed. */
const STALE_CLAIM_MS = 90_000;

function jsonResponse(payload: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
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
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const resumeId =
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>).resumeId === 'string'
      ? ((body as Record<string, unknown>).resumeId as string)
      : '';

  if (resumeId.length === 0) {
    return jsonResponse({ error: 'Missing resumeId.' }, 400);
  }

  // 2) Ownership: both helpers run under the caller's session + RLS; a
  // resume the user does not own resolves to null.
  const { data: resume } = await getResumeById(resumeId);
  if (!resume) {
    return jsonResponse({ error: 'Resume not found.' }, 404);
  }

  const { data: latest, error: latestError } = await getLatestResumeAnalysis(resumeId);
  if (latestError) {
    return jsonResponse({ error: latestError }, 500);
  }
  if (!latest) {
    return jsonResponse({ error: 'No analysis has been queued for this resume.' }, 409);
  }
  if (latest.score !== null) {
    return jsonResponse({ status: 'already_completed', score: latest.score }, 200);
  }

  // 3) Atomic claim (idempotent re-trigger guard). If another run holds a
  // fresh claim, report "processing" and let its owner finish; a stale claim
  // (crashed run) is reclaimed so a queued row can never be stuck forever.
  const claim = await claimQueuedResumeAnalysis(latest.id);
  if (claim.error) {
    return jsonResponse({ error: claim.error }, 500);
  }

  if (!claim.claimed) {
    const { data: current } = await getLatestResumeAnalysis(resumeId);
    if (!current) {
      return jsonResponse({ error: 'The queued analysis no longer exists.' }, 409);
    }
    if (current.score !== null) {
      return jsonResponse({ status: 'already_completed', score: current.score }, 200);
    }
    const marker = current.structured_output;
    if (!isProcessingMarker(marker) || !isStaleClaim(marker)) {
      return jsonResponse({ status: 'processing' }, 202);
    }
    console.warn(
      `[analyze] Reclaiming stale claim on analysis ${latest.id} (claimed_at=${marker.claimed_at})`
    );
  }

  try {
    // 4) Download the resume file.
    const { data: buffer, error: downloadError } = await downloadResumeFile(resume.file_path);
    if (downloadError || !buffer) {
      throw new Error(downloadError ?? 'Failed to download the resume file.');
    }

    // 4b) Light text extraction — only for the persisted parsed_content +
    // word_count metadata. The analysis itself goes to the LLM as the NATIVE
    // document (PDF inline_data — the model sees the real layout, scanned
    // PDFs included). DOCX/TXT require the extracted text (Gemini cannot
    // read them natively).
    let text: string;
    const fileNameLower = resume.file_name.toLowerCase();
    const mimeType: AnalysisDocumentMimeType = fileNameLower.endsWith('.pdf')
      ? 'application/pdf'
      : fileNameLower.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'text/plain';

    if (mimeType === 'application/pdf') {
      try {
        text = extractPdfText(buffer).text;
      } catch (error) {
        if (error instanceof PdfExtractionError) {
          // Structurally unreadable (encrypted) — the model cannot read it
          // either; fail explicitly.
          throw new Error(error.message);
        }
        console.warn(
          '[analyze] PDF text extraction failed — continuing with the native document for the multimodal analysis:',
          (error as Error)?.message
        );
        text = '';
      }
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        text = (await extractDocxText(buffer)).text;
      } catch (error) {
        throw new Error(
          error instanceof DocxExtractionError
            ? error.message
            : 'Failed to extract text from the DOCX.'
        );
      }
    } else {
      text = buffer.toString('utf8');
    }

    if (mimeType !== 'application/pdf' && text.trim().length === 0) {
      throw new Error(
        'No extractable text — the analysis cannot run on this document.'
      );
    }

    // Decompression-bomb / memory guard: cap the extracted text (mirrors the
    // Quick Test pipeline; the LLM text input truncates at 12k chars anyway).
    if (text.length > MAX_RESUME_TEXT_CHARS) {
      console.warn(`[analyze] Extracted text capped: ${text.length} → ${MAX_RESUME_TEXT_CHARS} chars.`);
      text = text.slice(0, MAX_RESUME_TEXT_CHARS);
    }

    // 5) Gemini Flash — NATIVE document (PDF inline_data) or extracted text
    // (DOCX/TXT), strict responseSchema, explicit retry chain. NO heuristic
    // fallback: a failure here drops the queued row and the user retries —
    // never a fake score. The semantic CV gate (`is_cv`) is MERGED into the
    // same LLM call.
    const llmResult = await analyzeWithGemini({ buffer, mimeType, text });
    if (!llmResult) {
      throw new Error(
        'The AI analysis failed after several attempts (service temporarily unavailable). Please retry in a moment.'
      );
    }
    if (!llmResult.gate.isCv) {
      throw new NotACvError(
        `This document does not look like a resume (detected type: ${llmResult.gate.documentType}).`
      );
    }
    const analysis: QuickTestAnalysis = llmResult.analysis;
    const source: QuickTestSource = 'llm';

    // 6) Persist the result (score null → filled; the polling UI picks it up).
    const completion = await completeResumeAnalysis(latest.id, analysis.score, {
      source,
      analysis,
    });
    if (completion.error) {
      throw new Error(completion.error);
    }
    if (!completion.completed) {
      // Lost a race against another run — not an error for the user.
      return jsonResponse({ status: 'already_completed' }, 200);
    }

    // 7) Mark the resume as parsed so the catalogue UI shows "Analysé" instead
    // of "Analyse en attente" — keeps the parsed_content status in sync with
    // the latest completed analysis.
    const parsedContent: ParsedResumeContent = {
      raw_text: text,
      word_count: countWords(text),
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
      `[analyze] ✅ Analysis ${latest.id} completed — source=${source}, score=${analysis.score}`
    );
    return jsonResponse({ status: 'completed', source, score: analysis.score }, 200);
  } catch (error) {
    // Anti-deadlock: drop the still-queued row so the UI never hangs forever;
    // the user can simply retry from the "Analyze my CV" button.
    const cleanup = await deleteQueuedResumeAnalysis(latest.id);
    console.error(
      `[analyze] ❌ Analysis ${latest.id} failed (queued row removed=${cleanup.deleted}):`,
      error
    );
    const isNotACv = error instanceof NotACvError;
    const message =
      error instanceof Error ? error.message : 'The analysis pipeline failed unexpectedly.';
    return jsonResponse({ error: message }, isNotACv ? 422 : 500);
  }
}
