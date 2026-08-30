import { describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import { PdfExtractionError, extractPdfText, isPdfBuffer } from '@/lib/quick-test/pdf-extract';

/** Builds a minimal PDF whose content stream shows the given lines of text. */
function buildPdf(lines: string[], flate = true): Buffer {
  const content = `BT /F1 12 Tf 72 720 Td 14 TL\n${lines
    .map((line, i) => `${i === 0 ? '' : 'T* '}(${line}) Tj`)
    .join('\n')}\nET`;
  const payload = flate ? deflateSync(Buffer.from(content, 'latin1')) : Buffer.from(content);

  const header = Buffer.from('%PDF-1.4\n', 'latin1');
  const objects = [
    Buffer.from(
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      'latin1'
    ),
    Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n', 'latin1'),
    Buffer.from('3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n', 'latin1'),
    Buffer.concat([
      Buffer.from(
        `4 0 obj\n<< /Length ${payload.length} ${
          flate ? '/Filter /FlateDecode ' : ''
        }>>\nstream\n`,
        'latin1'
      ),
      payload,
      Buffer.from('\nendstream\nendobj\n', 'latin1'),
    ]),
  ];

  return Buffer.concat([header, ...objects]);
}

describe('isPdfBuffer', () => {
  it('accepts a buffer starting with the PDF magic header', () => {
    expect(isPdfBuffer(buildPdf(['Hello']))).toBe(true);
  });

  it('rejects non-PDF buffers', () => {
    expect(isPdfBuffer(Buffer.from('plain text file'))).toBe(false);
  });
});

describe('extractPdfText', () => {
  it('extracts text from a Flate-compressed content stream', () => {
    const result = extractPdfText(buildPdf(['Bonjour, voici mon CV.']));
    expect(result.text).toContain('Bonjour, voici mon CV.');
    expect(result.pageCount).toBe(1);
  });

  it('extracts text from an uncompressed content stream', () => {
    const result = extractPdfText(buildPdf(['Experience: Chef de projet'], false));
    expect(result.text).toContain('Experience: Chef de projet');
  });

  it('inserts line breaks on text-positioning operators (T*)', () => {
    const result = extractPdfText(buildPdf(['Ligne une', 'Ligne deux']));
    expect(result.text).toContain('Ligne une\nLigne deux');
  });

  it('counts multiple page objects', () => {
    const pdf = buildPdf(['Page']);
    const extraPage = Buffer.from(
      '\n5 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n',
      'latin1'
    );
    const withExtraPage = Buffer.concat([pdf, extraPage]);
    expect(extractPdfText(withExtraPage).pageCount).toBe(2);
  });

  it('throws for non-PDF input', () => {
    expect(() => extractPdfText(Buffer.from('not a pdf'))).toThrow(PdfExtractionError);
  });

  it('throws for encrypted PDFs', () => {
    const encrypted = Buffer.concat([
      buildPdf(['secret']),
      Buffer.from('\n/Encrypt 9 0 R\n', 'latin1'),
    ]);
    expect(() => extractPdfText(encrypted)).toThrow(/Encrypted/);
  });
});