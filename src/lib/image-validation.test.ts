import { describe, expect, it } from 'vitest';
import {
  detectImageMimeType,
  imageExtensionForMimeType,
  validateImageBuffer,
  MAX_AVATAR_FILE_SIZE_BYTES,
  MAX_BANNER_FILE_SIZE_BYTES,
} from '@/lib/image-validation';

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(128, 0x42),
]);
const JPEG_BYTES = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(128, 0x11),
]);
const WEBP_BYTES = Buffer.concat([
  Buffer.from('RIFF', 'latin1'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'latin1'),
  Buffer.alloc(64, 0x00),
]);

describe('detectImageMimeType', () => {
  it('detects PNG, JPEG and WebP signatures', () => {
    expect(detectImageMimeType(PNG_BYTES)).toBe('image/png');
    expect(detectImageMimeType(JPEG_BYTES)).toBe('image/jpeg');
    expect(detectImageMimeType(WEBP_BYTES)).toBe('image/webp');
  });

  it('rejects non-image payloads (HTML/SVG/text disguised as images)', () => {
    expect(detectImageMimeType(Buffer.from('<html><script>alert(1)</script>'))).toBeNull();
    expect(detectImageMimeType(Buffer.from('<?xml version="1.0"?><svg>...</svg>'))).toBeNull();
    expect(detectImageMimeType(Buffer.from('%PDF-1.4 fake'))).toBeNull();
    expect(detectImageMimeType(Buffer.alloc(0))).toBeNull();
  });
});

describe('validateImageBuffer', () => {
  it('accepts valid images under the size cap and returns the trusted MIME type', () => {
    const result = validateImageBuffer(PNG_BYTES, MAX_AVATAR_FILE_SIZE_BYTES);
    expect(result.ok).toBe(true);
    expect(result.mimeType).toBe('image/png');
    expect(result.error).toBeNull();
  });

  it('rejects spoofed content regardless of the claimed extension', () => {
    // An attacker naming a HTML payload "avatar.png" — validated by bytes only.
    const result = validateImageBuffer(
      Buffer.from('<html>payload</html>'),
      MAX_AVATAR_FILE_SIZE_BYTES
    );
    expect(result.ok).toBe(false);
    expect(result.mimeType).toBeNull();
    expect(result.error).toContain('signature invalide');
  });

  it('rejects empty and oversized images', () => {
    expect(validateImageBuffer(Buffer.alloc(0), MAX_AVATAR_FILE_SIZE_BYTES).error).toContain('vide');
    const oversized = Buffer.alloc(MAX_BANNER_FILE_SIZE_BYTES + 1, 0x42);
    expect(validateImageBuffer(oversized, MAX_BANNER_FILE_SIZE_BYTES).error).toContain(
      'trop volumineuse'
    );
  });
});

describe('imageExtensionForMimeType', () => {
  it('maps trusted MIME types to canonical extensions', () => {
    expect(imageExtensionForMimeType('image/png')).toBe('png');
    expect(imageExtensionForMimeType('image/jpeg')).toBe('jpg');
    expect(imageExtensionForMimeType('image/webp')).toBe('webp');
  });
});
