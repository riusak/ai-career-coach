/**
 * quick-test/error-codes.ts — Machine-readable error contract for the CV
 * analysis pipelines (shared client + server).
 *
 * The API routes attach a stable `code` (and, for rejections, the LLM-detected
 * `documentType` + the `documentKind` that was analyzed) to every error
 * response so the client can render precise, LOCALIZED messages instead of
 * raw server strings:
 *
 *   { "error": "<human fallback message>", "code": "not_a_cv",
 *     "documentType": "invoice", "documentKind": "pdf" }
 *
 * `error` stays for backward compatibility (older clients / non-i18n callers);
 * the client always prefers `code`-driven i18n messages.
 *
 * Dependency-free and client-safe: importable from both the route handlers
 * and the UI components.
 */

export const QUICK_TEST_ERROR_CODES = [
  'unsupported_format',
  'invalid_pdf',
  'invalid_docx',
  'invalid_txt',
  'docx_unreadable',
  'file_too_large',
  'file_empty',
  'not_a_cv',
  'llm_unavailable',
  'llm_failed',
  'rate_limited',
  'server_error',
] as const;

export type QuickTestErrorCode = (typeof QUICK_TEST_ERROR_CODES)[number];

/** How the document traveled to the LLM (drives the rejection message). */
export type QuickTestDocumentKind = 'pdf' | 'docx' | 'txt';

/** Structured error payload returned by the analysis API routes. */
export interface QuickTestErrorPayload {
  /** Human-readable fallback message (French on the public funnel). */
  error: string;
  code: QuickTestErrorCode;
  /** LLM-detected document type for `not_a_cv` rejections (e.g. 'invoice'). */
  documentType?: string;
  /** Which representation was analyzed — drives typed vs generic rejection. */
  documentKind?: QuickTestDocumentKind;
}

/** Canonical document_type vocabulary enforced by the LLM responseSchema prompt. */
export const QUICK_TEST_DOCUMENT_TYPES = [
  'cv',
  'invoice',
  'payslip',
  'quote',
  'letter',
  'administrative_form',
  'generic_text',
  'empty',
  'other',
] as const;

export type QuickTestDocumentType = (typeof QUICK_TEST_DOCUMENT_TYPES)[number];

/**
 * Defensively parses an API error response body into the structured payload.
 * Returns null when the body is not an error object (e.g. a success response).
 */
export function parseQuickTestError(payload: unknown): QuickTestErrorPayload | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const error = record.error;
  if (typeof error !== 'string' || error.length === 0) {
    return null;
  }
  const code =
    typeof record.code === 'string' &&
    (QUICK_TEST_ERROR_CODES as readonly string[]).includes(record.code)
      ? (record.code as QuickTestErrorCode)
      : 'server_error';
  const documentType =
    typeof record.documentType === 'string' && record.documentType.length > 0
      ? record.documentType
      : undefined;
  const documentKind: QuickTestDocumentKind | undefined =
    record.documentKind === 'pdf' ||
    record.documentKind === 'docx' ||
    record.documentKind === 'txt'
      ? record.documentKind
      : undefined;
  return { error, code, documentType, documentKind };
}