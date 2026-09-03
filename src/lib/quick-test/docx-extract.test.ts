import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DocxExtractionError, extractDocxText, isDocxBuffer } from '@/lib/quick-test/docx-extract';

// Mock mammoth
vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

import mammoth from 'mammoth';

const mockedMammoth = vi.mocked(mammoth);

describe('isDocxBuffer', () => {
  it('accepts a buffer with the ZIP/DOCX magic bytes (PK\\x03\\x04)', () => {
    const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00]);
    expect(isDocxBuffer(docxBuffer)).toBe(true);
  });

  it('rejects a buffer without the DOCX magic bytes', () => {
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
    expect(isDocxBuffer(pdfBuffer)).toBe(false);
  });

  it('rejects a plain text buffer', () => {
    const textBuffer = Buffer.from('plain text document');
    expect(isDocxBuffer(textBuffer)).toBe(false);
  });
});

describe('extractDocxText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws for non-DOCX input (missing ZIP signature)', async () => {
    const notDocx = Buffer.from('not a docx file');
    await expect(extractDocxText(notDocx)).rejects.toThrow(DocxExtractionError);
    await expect(extractDocxText(notDocx)).rejects.toThrow(/ZIP/);
  });

  it('extracts text from a valid DOCX buffer', async () => {
    mockedMammoth.extractRawText.mockResolvedValue({
      value: 'Contenu du CV en texte brut.',
      messages: [],
    });

    const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    const result = await extractDocxText(docxBuffer);

    expect(result.text).toBe('Contenu du CV en texte brut.');
    expect(result.messages).toEqual([]);
    expect(mockedMammoth.extractRawText).toHaveBeenCalledWith({ buffer: docxBuffer });
  });

  it('returns mammoth warnings in the messages array', async () => {
    mockedMammoth.extractRawText.mockResolvedValue({
      value: 'Texte extrait.',
      messages: [{ type: 'warning', message: 'Unknown style "Heading 4"' }],
    });

    const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    const result = await extractDocxText(docxBuffer);

    expect(result.text).toBe('Texte extrait.');
    expect(result.messages).toEqual(['Unknown style "Heading 4"']);
  });

  it('wraps mammoth errors in DocxExtractionError', async () => {
    mockedMammoth.extractRawText.mockRejectedValue(new Error('Corrupt ZIP'));

    const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    await expect(extractDocxText(docxBuffer)).rejects.toThrow(DocxExtractionError);
    await expect(extractDocxText(docxBuffer)).rejects.toThrow(/Corrupt ZIP/);
  });

  it('handles unknown errors gracefully', async () => {
    mockedMammoth.extractRawText.mockRejectedValue('string error');

    const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    await expect(extractDocxText(docxBuffer)).rejects.toThrow(DocxExtractionError);
    await expect(extractDocxText(docxBuffer)).rejects.toThrow(/Failed to extract/);
  });
});
