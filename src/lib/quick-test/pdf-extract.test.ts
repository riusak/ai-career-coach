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

  it('maps WinAnsi high bytes (0x80-0x9F) instead of emitting control characters', () => {
    // \222 = 0x92 = right single quotation mark in WinAnsi (Word exports).
    const result = extractPdfText(buildPdf(['L\\222apostrophe typographique']));
    expect(result.text).toContain('L’apostrophe typographique');
    // No raw C1 control character survived.
    expect(result.text).not.toMatch(/[\u0080-\u009F]/);
  });

  it('decodes UTF-16BE literal strings carrying the FEFF BOM', () => {
    const pdf = buildPdf(['\\376\\377\\000H\\000i\\000!']);
    const result = extractPdfText(pdf);
    expect(result.text).toContain('Hi!');
  });

  it('ignores embedded binary streams (font files) instead of mining garbage tokens', () => {
    // Simulates a FontFile2 subset: deflate-compressed binary junk that
    // contains string-looking tokens but no BT…ET text operators.
    const garbage = Buffer.from(
      '(\\226mojibake\\001\\002junk) Tj <FFFE0102> d0 [ 1 2 3 ]',
      'latin1'
    );
    const binaryTail = Buffer.from([0x00, 0x01, 0x02, 0xc8, 0xc9, 0xca, 0xff]);
    const fontPayload = deflateSync(Buffer.concat([garbage, binaryTail]));
    const fontObject = Buffer.concat([
      Buffer.from(
        `\n6 0 obj\n<< /Length ${fontPayload.length} /Length1 4096 /Filter /FlateDecode >>\nstream\n`,
        'latin1'
      ),
      fontPayload,
      Buffer.from('\nendstream\nendobj\n', 'latin1'),
    ]);

    const result = extractPdfText(Buffer.concat([buildPdf(['CV valide']), fontObject]));
    expect(result.text).toContain('CV valide');
    expect(result.text).not.toContain('mojibake');
    expect(result.text).not.toContain('junk');
  });
});