/**
 * Shared, client-safe validation rules for IMAGE uploads (profile avatar /
 * banner). Dependency-free and server-authoritative: the client-supplied MIME
 * type and file extension are both spoofable, so the actual byte signature is
 * verified before anything reaches the (public) Storage buckets.
 */

import { formatBytes } from '@/lib/resume-validation';

export const MAX_AVATAR_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_BANNER_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** Detects the real image type from the byte signature — never from metadata. */
export function detectImageMimeType(buffer: Buffer): AllowedImageMimeType | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    PNG_MAGIC.every((byte, index) => buffer[index] === byte)
  ) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // WebP: 'RIFF' + 4-byte size + 'WEBP'
  if (
    buffer.length >= 12 &&
    buffer.toString('latin1', 0, 4) === 'RIFF' &&
    buffer.toString('latin1', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export interface ImageValidationResult {
  ok: boolean;
  /** Real MIME type detected from the bytes (null when invalid). */
  mimeType: AllowedImageMimeType | null;
  error: string | null;
}

/**
 * Server-authoritative image validation (size + magic bytes).
 * The returned `mimeType` is the ONLY trusted value for storage metadata —
 * never reuse the client-reported content type.
 */
export function validateImageBuffer(buffer: Buffer, maxBytes: number): ImageValidationResult {
  if (buffer.length === 0) {
    return { ok: false, mimeType: null, error: "L'image est vide." };
  }

  if (buffer.length > maxBytes) {
    return {
      ok: false,
      mimeType: null,
      error: `Image trop volumineuse (${formatBytes(buffer.length)}). Maximum : ${formatBytes(maxBytes)}.`,
    };
  }

  const mimeType = detectImageMimeType(buffer);
  if (!mimeType) {
    return {
      ok: false,
      mimeType: null,
      error:
        "Ce fichier n'est pas une véritable image PNG, JPEG ou WebP (signature invalide).",
    };
  }

  return { ok: true, mimeType, error: null };
}

/** Canonical storage extension for a trusted image MIME type. */
export function imageExtensionForMimeType(mimeType: AllowedImageMimeType): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
  }
}
