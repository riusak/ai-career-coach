/**
 * Shared, client-safe validation rules for CV uploads.
 * Used by both the upload UI (instant feedback) and the server
 * action / storage helper (authoritative security check).
 * Must stay dependency-free (no Supabase / server-only imports).
 */

export const MAX_RESUME_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_RESUME_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

export type AllowedResumeMimeType = (typeof ALLOWED_RESUME_MIME_TYPES)[number];

export const ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.docx', '.txt'] as const;

export const RESUME_ACCEPT_ATTRIBUTE = ALLOWED_RESUME_EXTENSIONS.join(',');

/** Hard cap on extracted document text (decompression-bomb / memory guard). */
export const MAX_RESUME_TEXT_CHARS = 500_000;

/** Minimal shape needed to validate a file. Compatible with the DOM File. */
export interface ResumeFileLike {
  name: string;
  size: number;
  type: string;
}

/**
 * Returns an error message when the file is invalid, or null when valid.
 */
export function validateResumeFile(file: ResumeFileLike): string | null {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

  if (!ALLOWED_RESUME_EXTENSIONS.includes(extension as (typeof ALLOWED_RESUME_EXTENSIONS)[number])) {
    return `Type de fichier non supporté "${extension || file.name}". Formats acceptés : PDF (.pdf), Word (.docx) et texte (.txt).`;
  }

  const mimeAllowed = (ALLOWED_RESUME_MIME_TYPES as readonly string[]).includes(file.type);
  // Some browsers report an empty MIME type; trust the extension in that case.
  if (file.type !== '' && !mimeAllowed) {
    return `Type de contenu non supporté "${file.type}". Formats acceptés : PDF (.pdf), Word (.docx) et texte (.txt).`;
  }

  if (file.size <= 0) {
    return 'The selected file is empty.';
  }

  if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
    return `File is too large (${formatBytes(file.size)}). Maximum size is ${formatBytes(
      MAX_RESUME_FILE_SIZE_BYTES
    )}.`;
  }

  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Sanitizes a filename so it is safe as a storage object key segment.
 */
export function sanitizeFileName(fileName: string): string {
  const base = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.length > 0 ? base : 'resume';
}

/** Maps a resume extension to the authoritative server-side content type. */
export function resumeContentTypeForExtension(extension: string): string | null {
  switch (extension) {
    case '.pdf':
      return 'application/pdf';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.txt':
      return 'text/plain';
    default:
      return null;
  }
}

/**
 * Server-authoritative magic-byte validation. The client-reported MIME type
 * AND file extension can both be spoofed, so the actual byte content is
 * verified before anything reaches Storage. Mirrors the Quick Test pipeline
 * (isPdfBuffer / isDocxBuffer) for PDF and DOCX; plain-text files are checked
 * for binary content (NUL bytes in the first chunk).
 * Returns an error message when the buffer is invalid, or null when valid.
 */
export function validateResumeBuffer(fileName: string, buffer: Buffer): string | null {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

  if (buffer.length === 0) {
    return 'Le fichier est vide.';
  }

  if (buffer.length > MAX_RESUME_FILE_SIZE_BYTES) {
    return `Fichier trop volumineux (${formatBytes(buffer.length)}). Maximum : ${formatBytes(
      MAX_RESUME_FILE_SIZE_BYTES
    )}.`;
  }

  if (extension === '.pdf') {
    if (buffer.subarray(0, 1024).toString('latin1').indexOf('%PDF-') === -1) {
      return 'Ce fichier n\'est pas un véritable PDF (signature invalide).';
    }
  } else if (extension === '.docx') {
    if (
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      return 'Ce fichier n\'est pas un véritable document Word (.docx) (signature invalide).';
    }
  } else if (extension === '.txt') {
    const head = buffer.subarray(0, 1024);
    if (head.includes(0)) {
      return 'Ce fichier n\'est pas un document texte valide (contenu binaire détecté).';
    }
  } else {
    return `Type de fichier non supporté "${extension || fileName}". Formats acceptés : PDF (.pdf), Word (.docx) et texte (.txt).`;
  }

  return null;
}
