import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  buildProfileExtractionPrompt,
  coerceProfileImportExtraction,
  extractDocumentText,
} from '@/lib/profile-import/extract';

vi.mock('@/lib/analysis/pipeline', () => ({
  inferDocumentKind: vi.fn(),
}));
vi.mock('@/lib/quick-test/pdf-extract', () => ({
  extractPdfText: vi.fn(),
  PdfExtractionError: class PdfExtractionError extends Error {},
}));
vi.mock('@/lib/quick-test/docx-extract', () => ({
  extractDocxText: vi.fn(),
  DocxExtractionError: class DocxExtractionError extends Error {},
}));

import { inferDocumentKind } from '@/lib/analysis/pipeline';
import { extractPdfText, PdfExtractionError } from '@/lib/quick-test/pdf-extract';
import { extractDocxText, DocxExtractionError } from '@/lib/quick-test/docx-extract';

const inferDocumentKindMock = inferDocumentKind as Mock;
const extractPdfTextMock = extractPdfText as Mock;
const extractDocxTextMock = extractDocxText as Mock;

describe('coerceProfileImportExtraction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null for a non-object payload', () => {
    expect(coerceProfileImportExtraction(null)).toBeNull();
    expect(coerceProfileImportExtraction('nope')).toBeNull();
    expect(coerceProfileImportExtraction([])).toBeNull();
  });

  it('coerces a well-formed payload and caps section sizes', () => {
    const experiences = Array.from({ length: 12 }, (_, i) => ({
      company: `C${i}`,
      role: 'Engineer',
    }));
    const skills = Array.from({ length: 30 }, (_, i) => ({ skill_name: `S${i}` }));
    const raw = {
      full_name: '  Jean Dupont  ',
      headline: 'Lead Engineer',
      bio: 'Architect systèmes.',
      location: 'Paris',
      experiences,
      skills,
      educations: [{ institution: 'ENS' }],
      certifications: [{ name: 'AWS' }],
    };
    const result = coerceProfileImportExtraction(raw);
    expect(result).not.toBeNull();
    expect(result!.full_name).toBe('Jean Dupont');
    expect(result!.experiences).toHaveLength(8);
    expect(result!.skills).toHaveLength(16);
    expect(result!.educations).toHaveLength(1);
    expect(result!.certifications).toHaveLength(1);
  });

  it('drops section entries missing their required field', () => {
    const raw = {
      full_name: null,
      experiences: [
        { company: 'Google', role: 'SRE' },
        { company: '', role: 'Broken' },
        { role: 'NoCompany' },
      ],
      skills: [
        { skill_name: 'TypeScript', level: 'advanced' },
        { skill_name: '' },
      ],
      educations: [
        { institution: 'MIT' },
        { institution: 42 },
      ],
      certifications: [
        { name: 'PMP' },
        { name: null },
      ],
    };
    const result = coerceProfileImportExtraction(raw);
    expect(result).not.toBeNull();
    expect(result!.experiences).toEqual([
      expect.objectContaining({ company: 'Google', role: 'SRE' }),
    ]);
    expect(result!.skills).toEqual([
      expect.objectContaining({ skill_name: 'TypeScript', level: 'advanced' }),
    ]);
    expect(result!.educations).toEqual([expect.objectContaining({ institution: 'MIT' })]);
    expect(result!.certifications).toEqual([expect.objectContaining({ name: 'PMP' })]);
    expect(result!.full_name).toBeNull();
  });
});
describe('extractDocumentText', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extracts PDF text and caps it', async () => {
    inferDocumentKindMock.mockReturnValue('pdf');
    extractPdfTextMock.mockReturnValue({ text: 'A'.repeat(600_000), pageCount: 3 });
    const result = await extractDocumentText(Buffer.from('x'), 'cv.pdf');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text.length).toBe(500_000);
  });

  it('maps an encrypted PDF to unreadable_document', async () => {
    inferDocumentKindMock.mockReturnValue('pdf');
    extractPdfTextMock.mockImplementation(() => {
      throw new PdfExtractionError('Encrypted PDF');
    });
    const result = await extractDocumentText(Buffer.from('x'), 'cv.pdf');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unreadable_document');
  });

  it('extracts DOCX text via mammoth', async () => {
    inferDocumentKindMock.mockReturnValue('docx');
    extractDocxTextMock.mockResolvedValue({ text: 'Hello world', messages: [] });
    const result = await extractDocumentText(Buffer.from('x'), 'cv.docx');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe('Hello world');
  });

  it('maps a corrupted DOCX to unreadable_document', async () => {
    inferDocumentKindMock.mockReturnValue('docx');
    extractDocxTextMock.mockImplementation(() => {
      throw new DocxExtractionError('Broken archive');
    });
    const result = await extractDocumentText(Buffer.from('x'), 'cv.docx');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unreadable_document');
  });

  it('reads TXT buffers directly', async () => {
    inferDocumentKindMock.mockReturnValue('txt');
    const result = await extractDocumentText(Buffer.from('Salut', 'utf8'), 'cv.txt');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe('Salut');
  });

  it('rejects unsupported kinds', async () => {
    inferDocumentKindMock.mockReturnValue(null);
    const result = await extractDocumentText(Buffer.from('x'), 'cv.png');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_document');
  });
});

describe('buildProfileExtractionPrompt', () => {
  it('embeds the document text and requires strict JSON output', () => {
    const prompt = buildProfileExtractionPrompt('CV de test');
    expect(prompt).toContain('CV de test');
    expect(prompt).toContain('UNIQUEMENT un JSON valide');
    expect(prompt).toContain('"experiences"');
    expect(prompt).toContain('"skills"');
  });
});