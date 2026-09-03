import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  resumeContentTypeForExtension,
  sanitizeFileName,
  validateResumeBuffer,
  validateResumeFile,
  MAX_RESUME_FILE_SIZE_BYTES,
} from '@/lib/resume-validation';

describe('validateResumeFile', () => {
  const base = { name: 'cv.pdf', size: 1024, type: 'application/pdf' };

  it('accepts a valid PDF file', () => {
    expect(validateResumeFile(base)).toBeNull();
  });

  it('rejects unsupported extensions', () => {
    expect(validateResumeFile({ ...base, name: 'photo.jpg', type: 'image/jpeg' })).toContain(
      'Type de fichier non supporté'
    );
    expect(validateResumeFile({ ...base, name: 'no-extension' })).toContain(
      'Type de fichier non supporté'
    );
  });

  it('rejects disallowed MIME types (empty MIME falls back to the extension)', () => {
    expect(validateResumeFile({ ...base, type: 'application/zip' })).toContain(
      'Type de contenu non supporté'
    );
    expect(validateResumeFile({ ...base, type: '' })).toBeNull();
  });

  it('rejects empty and oversized files', () => {
    expect(validateResumeFile({ ...base, size: 0 })).toContain('empty');
    expect(
      validateResumeFile({ ...base, size: MAX_RESUME_FILE_SIZE_BYTES + 1 })
    ).toContain('too large');
  });
});

describe('validateResumeBuffer', () => {
  it('accepts a buffer starting with the %PDF- magic', () => {
    const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(256, 'a')]);
    expect(validateResumeBuffer('cv.pdf', pdf)).toBeNull();
  });

  it('accepts a %PDF- header preceded by junk (tolerant magic scan)', () => {
    const pdf = Buffer.concat([Buffer.from('\uFEFFjunk\n'), Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 'b')]);
    expect(validateResumeBuffer('cv.pdf', pdf)).toBeNull();
  });

  it('rejects a .pdf-named buffer without the PDF signature', () => {
    const html = Buffer.from('<html><script>alert(1)</script></html>');
    expect(validateResumeBuffer('evil.pdf', html)).toContain('n\'est pas un véritable PDF');
  });

  it('accepts a buffer with the DOCX ZIP signature', () => {
    const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(128, 'x')]);
    expect(validateResumeBuffer('cv.docx', docx)).toBeNull();
  });

  it('rejects a .docx-named buffer without the ZIP signature', () => {
    expect(validateResumeBuffer('evil.docx', Buffer.from('not a zip'))).toContain(
      'n\'est pas un véritable document Word'
    );
  });

  it('accepts plain text and rejects binary content posing as .txt', () => {
    expect(validateResumeBuffer('cv.txt', Buffer.from('Mon CV texte, lignes et mots.'))).toBeNull();
    const binary = Buffer.concat([Buffer.alloc(16, 0x41), Buffer.from([0x00, 0x01, 0x02])]);
    expect(validateResumeBuffer('evil.txt', binary)).toContain('contenu binaire');
  });

  it('rejects empty buffers, oversized buffers and unknown extensions', () => {
    expect(validateResumeBuffer('cv.pdf', Buffer.alloc(0))).toContain('vide');
    expect(validateResumeBuffer('cv.pdf', Buffer.alloc(MAX_RESUME_FILE_SIZE_BYTES + 1))).toContain(
      'trop volumineux'
    );
    expect(validateResumeBuffer('cv.exe', Buffer.from('MZ'))).toContain('non supporté');
  });
});

describe('resumeContentTypeForExtension', () => {
  it('maps the three supported extensions to their MIME type', () => {
    expect(resumeContentTypeForExtension('.pdf')).toBe('application/pdf');
    expect(resumeContentTypeForExtension('.docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    expect(resumeContentTypeForExtension('.txt')).toBe('text/plain');
    expect(resumeContentTypeForExtension('.exe')).toBeNull();
  });
});

describe('sanitizeFileName', () => {
  it('strips path traversal sequences and unsafe characters', () => {
    expect(sanitizeFileName('../../etc/passwd')).not.toContain('/');
    expect(sanitizeFileName('..\\..\\windows\\system32')).not.toContain('\\');
    expect(sanitizeFileName('cv éàü.png')).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it('replaces every unsafe character with an underscore (no empty result)', () => {
    expect(sanitizeFileName('///')).toBe('___');
    expect(sanitizeFileName('a/b\\c:d*e?f')).toBe('a_b_c_d_e_f');
  });
});

describe('formatBytes', () => {
  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
