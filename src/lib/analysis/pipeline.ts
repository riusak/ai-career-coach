/**
 * analysis/pipeline.ts — THE single CV-analysis pipeline.
 *
 * Every document analysed by ForPro AI — the anonymous visitor Quick Test
 * (POST /api/quick-test) and the authenticated deep analysis
 * (POST /api/resume/analyze) — flows through THIS module. It is the ONLY
 * implementation of the ingestion → validation → text extraction → multimodal
 * conversion → LLM call → semantic CV-gate stages.
 *
 * Why it exists (architecture): the two HTTP routes previously duplicated the
 * validation and error rules, so the codebases drifted apart — a file could
 * pass one pipeline and fail the other (e.g. a 502 on the public quick-test
 * for a document the main pipeline accepted). With a single implementation,
 * every document gets the exact same stable logic.
 *
 * The HTTP routes are now thin adapters: they keep their transport concerns
 * (auth/ownership, queue claim, anonymous rate-limit + tracking) and map the
 * machine-readable outcome below to their own response shapes.
 *
 * Principles (inherited from the LLM module):
 *  - PDF → sent NATIVE to Gemini (inline_data base64) so the model evaluates
 *    the real layout (columns, sidebars, hierarchy) — scanned PDFs included;
 *  - DOCX/TXT → pre-extracted text embedded in the prompt (Gemini cannot read
 *    these formats natively);
 *  - NO silent heuristic fallback: a failed LLM call is a visible error
 *    (`llm_failed`, HTTP 502), never a fake score;
 *  - the semantic « is this a CV? » guardrail is MERGED into the single LLM
 *    call (`is_cv` field of the responseSchema).
 */

import { PdfExtractionError, countWords, extractPdfText, isPdfBuffer } from '@/lib/quick-test/pdf-extract';
import { DocxExtractionError, extractDocxText, isDocxBuffer } from '@/lib/quick-test/docx-extract';
import { analyzeWithGemini, isLlmConfigured } from '@/lib/quick-test/llm';
import type { AnalysisDocumentMimeType } from '@/lib/quick-test/llm';
import type { QuickTestDocumentKind, QuickTestErrorCode } from '@/lib/quick-test/error-codes';
import { MAX_RESUME_FILE_SIZE_BYTES, MAX_RESUME_TEXT_CHARS, formatBytes } from '@/lib/resume-validation';
import type { QuickTestAnalysis, QuickTestSource } from '@/types/quick-test';

/** All document kinds understood by the pipeline. */
export const ALL_DOCUMENT_KINDS: readonly QuickTestDocumentKind[] = ['pdf', 'docx', 'txt'];

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Machine-readable error carried by a pipeline failure. */
export interface UnifiedAnalysisError {
  /**
   * Stable machine-readable code — the client renders localized messages from
   * it (see QUICK_TEST_ERROR_CODES); the message below is only a fallback.
   */
  code: QuickTestErrorCode;
  /** HTTP status to surface for this failure. */
  httpStatus: number;
  /** Human-readable fallback message (French — the product's default locale). */
  message: string;
  /** LLM-detected document type for `not_a_cv` rejections (e.g. 'invoice'). */
  documentType?: string;
  /** Which representation was analyzed (pdf native vs docx/txt text path). */
  documentKind?: QuickTestDocumentKind;
}

/** Pipeline stages exposed to server-adapters so callers can drive a live
 * waiting-ticket UI in lockstep with the actual work: multimodal reading →
 * LLM analysis (semantic parsing + scoring) → report composition. The order
 * mirrors the client step list. */
export type AnalysisStage = 'reading' | 'analyzing' | 'reporting';

export interface UnifiedAnalysisInput {
  /** Raw document bytes (uploaded or downloaded from storage). */
  buffer: Buffer;
  /** Original file name — the extension drives the authoritative kind. */
  fileName: string;
  /** Client/hint-reported MIME type, used only as a fallback for the kind. */
  declaredMimeType?: string;
  /**
   * Restrict which kinds this entry point accepts. default: all kinds.
   * The public quick-test funnel is PDF/DOCX only; the authenticated storage
   * pipeline additionally accepts TXT.
   */
  allowedDocumentKinds?: readonly QuickTestDocumentKind[];
  /**
   * Optional progress hook invoked synchronously around each stage boundary
   * (see {@link AnalysisStage}). Lets the visitor funnel advance its waiting
   * ticket with the real pipeline work instead of a blind timer. Omitted on the
   * authenticated deep route (fire-and-forget queue worker).
   */
  onStage?: (stage: AnalysisStage) => void;
}

export interface UnifiedAnalysisSuccess {
  ok: true;
  analysis: QuickTestAnalysis;
  source: QuickTestSource;
  /** Extracted (and capped) text — used for persisted parsed_content. */
  text: string;
  pageCount: number;
  wordCount: number;
}

export interface UnifiedAnalysisFailure {
  ok: false;
  error: UnifiedAnalysisError;
}

export type UnifiedAnalysisResult = UnifiedAnalysisSuccess | UnifiedAnalysisFailure;

/**
 * Infers the canonical document kind from the file name first (the
 * server-authoritative signal used by the storage pipeline) and falls back to
 * the declared MIME type only when the extension is not recognized.
 */
export function inferDocumentKind(
  fileName: string,
  declaredMimeType?: string
): QuickTestDocumentKind | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || declaredMimeType === 'application/pdf') {
    return 'pdf';
  }
  if (lower.endsWith('.docx') || declaredMimeType === DOCX_MIME) {
    return 'docx';
  }
  if (lower.endsWith('.txt') || declaredMimeType === 'text/plain') {
    return 'txt';
  }
  return null;
}

/** Maps a canonical kind to the MIME type sent to the LLM. */
export function inferMimeTypeForKind(kind: QuickTestDocumentKind): AnalysisDocumentMimeType {
  switch (kind) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return DOCX_MIME;
    case 'txt':
      return 'text/plain';
  }
}

function failure(
  code: QuickTestErrorCode,
  httpStatus: number,
  message: string,
  documentKind?: QuickTestDocumentKind,
  documentType?: string
): UnifiedAnalysisFailure {
  return {
    ok: false,
    error: {
      code,
      httpStatus,
      message,
      ...(documentType ? { documentType } : {}),
      ...(documentKind ? { documentKind } : {}),
    },
  };
}

/** A plain-text file must not contain binary content (NUL bytes head guard). */
function hasBinaryContent(buffer: Buffer): boolean {
  return buffer.subarray(0, 1024).includes(0);
}

/**
 * Runs the whole CV-analysis pipeline on a document buffer. This is the ONLY
 * place where validation, extraction and LLM communication happen — both HTTP
 * routes delegate to it.
 */
export async function analyzeCvDocument(
  input: UnifiedAnalysisInput
): Promise<UnifiedAnalysisResult> {
    const { buffer, fileName, declaredMimeType, onStage } = input;

  // 1) Canonical kind + per-entry-point format allow-list.
  const kind = inferDocumentKind(fileName, declaredMimeType);
  if (!kind) {
    return failure(
      'unsupported_format',
      415,
      'Type de fichier non supporté. Formats acceptés : PDF (.pdf), Word (.docx) et texte (.txt).'
    );
  }
  const allowedKinds = input.allowedDocumentKinds ?? ALL_DOCUMENT_KINDS;
  if (!(allowedKinds as readonly string[]).includes(kind)) {
    return failure(
      'unsupported_format',
      415,
      'Type de fichier non supporté pour ce parcours. Formats acceptés : PDF (.pdf) et Word (.docx).',
      kind
    );
  }

  // 2) Empty + size guards (mirror resume-validation, before magic bytes so a
  //    0-byte file gets a meaningful `file_empty` instead of `invalid_*`).
  if (buffer.length === 0) {
    return failure('file_empty', 400, 'Le fichier est vide.', kind);
  }
  if (buffer.length > MAX_RESUME_FILE_SIZE_BYTES) {
    return failure(
      'file_too_large',
      413,
      `Fichier trop volumineux (${formatBytes(buffer.length)}). Maximum : ${formatBytes(
        MAX_RESUME_FILE_SIZE_BYTES
      )}.`,
      kind
    );
  }

  // 3) Server-authoritative magic-byte validation — the declared MIME type and
  //    extension can both be spoofed, so the actual byte content is checked.
  if (kind === 'pdf' && !isPdfBuffer(buffer)) {
    return failure(
      'invalid_pdf',
      422,
      "Le fichier n'est pas un véritable PDF (signature invalide).",
      kind
    );
  }
  if (kind === 'docx' && !isDocxBuffer(buffer)) {
    return failure(
      'invalid_docx',
      422,
      "Le fichier n'est pas un véritable document Word (.docx) (signature invalide).",
      kind
    );
  }
  if (kind === 'txt' && hasBinaryContent(buffer)) {
    return failure(
      'invalid_txt',
      422,
      "Ce fichier n'est pas un document texte valide (contenu binaire détecté).",
      kind
    );
  }

    // 4) Light text extraction — metadata (pageCount, wordCount, parsed_content)
  //    and the DOCX/TXT LLM input. The PDF itself travels NATIVE to the model,
  //    so a scanned/image-only PDF (empty extraction) stays analyzable.
  // 4a) Stage boundary — post-validation; multimodal reading phase begins.
  onStage?.('reading');
  let text = '';
  let pageCount = 0;
  try {
    if (kind === 'pdf') {
      const extraction = extractPdfText(buffer);
      text = extraction.text;
      pageCount = extraction.pageCount;
    } else if (kind === 'docx') {
      const extraction = await extractDocxText(buffer);
      text = extraction.text;
      pageCount = 1;
    } else {
      text = buffer.toString('utf8');
      pageCount = 1;
    }
  } catch (error) {
    if (kind === 'docx') {
      return failure(
        'docx_unreadable',
        422,
        error instanceof DocxExtractionError
          ? error.message
          : 'Impossible de lire ce document. Il est peut-être corrompu.',
        'docx'
      );
    }
    if (error instanceof PdfExtractionError) {
      // Structurally unreadable (e.g. encrypted) — the model cannot read it
      // either; fail explicitly.
      return failure('invalid_pdf', 422, error.message, 'pdf');
    }
    console.warn(
      '[analysis] PDF text extraction failed — continuing with the native document for the multimodal analysis:',
      (error as Error)?.message
    );
  }

  // 5) Decompression-bomb / memory guard: cap the extracted text.
  if (text.length > MAX_RESUME_TEXT_CHARS) {
    console.warn(`[analysis] Extracted text capped: ${text.length} → ${MAX_RESUME_TEXT_CHARS} chars.`);
    text = text.slice(0, MAX_RESUME_TEXT_CHARS);
  }

  // 6) LLM — document-native, NO heuristic fallback.
  if (!isLlmConfigured()) {
    console.error(
      '[analysis] GEMINI_API_KEY non configurée — analyse impossible (pas de fallback heuristique).'
    );
    return failure(
      'llm_unavailable',
      503,
      "Le service d'analyse IA est momentanément indisponible (configuration serveur incomplète).",
      kind
    );
  }

  const mimeType = inferMimeTypeForKind(kind);
  // Stage boundary — extraction done; semantic parsing & scoring by the LLM.
  onStage?.('analyzing');
  console.time('[analysis] LLM analysis');
  const llmResult = await analyzeWithGemini({ buffer, mimeType, text });
  console.timeEnd('[analysis] LLM analysis');

  if (!llmResult) {
    // Explicit failure — never a fake heuristic score.
    console.error(
      `[analysis] LLM analysis FAILED for a valid upload (${buffer.length} bytes, pages: ${pageCount}).`
    );
    return failure(
      'llm_failed',
      502,
      "L'analyse IA n'a pas abouti après plusieurs tentatives (service momentanément saturé ou indisponible). Veuillez relancer l'analyse.",
      kind
    );
  }

  if (!llmResult.gate.isCv) {
    console.warn(
      `[analysis] ❌ Non-CV rejeté par le guardrail LLM (type=${llmResult.gate.documentType}, langue=${llmResult.gate.detectedLanguage})`
    );
    return failure(
      'not_a_cv',
      422,
      `Ce document ne semble pas être un CV (type détecté : ${llmResult.gate.documentType}). Veuillez télécharger un curriculum vitæ valide.`,
      kind,
      llmResult.gate.documentType
    );
  }

  // Stage boundary — LLM call + CV-gate passed; compose the final report.
  onStage?.('reporting');
  return {
    ok: true,
    analysis: llmResult.analysis,
    source: 'llm',
    text,
    pageCount,
    wordCount: countWords(text),
  };
}