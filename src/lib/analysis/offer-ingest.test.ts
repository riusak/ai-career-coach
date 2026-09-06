import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/lib/quick-test/pdf-extract', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/quick-test/pdf-extract')>();
  return { ...actual, extractPdfText: vi.fn() };
});

vi.mock('@/lib/quick-test/docx-extract', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/quick-test/docx-extract')>();
  return { ...actual, extractDocxText: vi.fn() };
});

import {
  MAX_OFFER_TEXT_CHARS,
  decodeHtmlEntities,
  extractOfferTextFromFile,
  extractOfferTextFromUrl,
  htmlToPlainText,
  ingestOfferText,
  isBlockedHost,
  sanitizeOfferText,
} from '@/lib/analysis/offer-ingest';
import { extractDocxText } from '@/lib/quick-test/docx-extract';
import { extractPdfText } from '@/lib/quick-test/pdf-extract';

const extractPdfTextMock = extractPdfText as Mock;
const extractDocxTextMock = extractDocxText as Mock;

const OFFER_TEXT =
  'Titre : Ingénieur Logiciel. Mission : concevoir des API robustes. ' +
  "Profil : 5 ans d'expérience, TypeScript, React et Node.js requis.";

let fetchMock: Mock;

/** Builds a minimal fake fetch Response (environment-agnostic). */
function fakeResponse(init: {
  status?: number;
  contentType?: string | null;
  body?: string | Buffer;
  location?: string | null;
}): Response {
  const body = init.body ?? '';
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => {
        const lower = name.toLowerCase();
        if (lower === 'content-type') return init.contentType ?? null;
        if (lower === 'location') return init.location ?? null;
        return null;
      },
    },
    arrayBuffer: async () =>
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer,
    body: null,
  } as unknown as Response;
}

function makeFile(content: string | Uint8Array, name: string, type = ''): File {
  return new File([content as BlobPart], name, { type });
}

describe('sanitizeOfferText', () => {
  it('normalizes newlines, strips control chars and collapses whitespace', () => {
    expect(sanitizeOfferText('Poste :  Développeur\r\n\r\n\r\nLieu : Paris\u0007')).toBe(
      'Poste : Développeur\n\nLieu : Paris'
    );
  });

  it('trims outer whitespace and blank lines', () => {
    expect(sanitizeOfferText('  \n  Hello   \n\n\n\n  World \n ')).toBe('Hello\n\nWorld');
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes named, decimal and hexadecimal entities', () => {
    expect(
      decodeHtmlEntities('R&amp;D &lt;tags&gt; &quot;X&quot; &#39;ok&#39; &#233; &#x00E9; &eacute;')
    ).toBe(`R&D <tags> "X" 'ok' é é é`);
  });

  it('passes unknown entities and non-entities through untouched', () => {
    expect(decodeHtmlEntities('&unknown; &amp')).toBe('&unknown; &amp');
  });
});

describe('htmlToPlainText', () => {
  it('strips scripts, styles, tags and decodes entities', () => {
    const html =
      '<html><head><style>.a{}</style><script>evil()</script></head>' +
      '<body><h1>Titre</h1><p>Ligne&nbsp;une &amp; deux</p><br/><p>Fin</p></body></html>';
    const text = htmlToPlainText(html);
    expect(text).toContain('Titre');
    expect(text).toContain('Ligne une & deux');
    expect(text).toContain('Fin');
    expect(text).not.toContain('evil()');
    expect(text).not.toContain('<');
  });
});

describe('isBlockedHost (SSRF guard)', () => {
  it('blocks loopback, private, link-local and site-internal hosts', () => {
    const blocked = [
      'localhost',
      'sub.localhost',
      'app.local',
      'srv.internal',
      '127.0.0.1',
      '10.0.0.5',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254', // cloud metadata endpoint
      '100.64.0.1', // CGNAT
      '0.0.0.0',
      '224.0.0.1',
      '::1',
      'fd00::1',
      'fe80::1',
    ];
    blocked.forEach((host) => expect(isBlockedHost(host)).toBe(true));
  });

  it('allows public hosts', () => {
    ['example.com', 'jobs.lever.co', 'welcometothejungle.com', '8.8.8.8', '172.32.0.1'].forEach(
      (host) => expect(isBlockedHost(host)).toBe(false)
    );
  });
});

describe('extractOfferTextFromFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unsupported extensions', async () => {
    const result = await extractOfferTextFromFile(makeFile('x', 'offre.doc'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('non supporté');
    }
  });

  it('extracts text from a PDF via extractPdfText', async () => {
    extractPdfTextMock.mockReturnValue({ text: OFFER_TEXT, pageCount: 1 });
    const result = await extractOfferTextFromFile(
      makeFile('%PDF-1.4 minimal', 'offre.pdf', 'application/pdf')
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toContain('Ingénieur Logiciel');
      expect(result.fileName).toBe('offre.pdf');
    }
  });

  it('extracts text from a DOCX via extractDocxText', async () => {
    extractDocxTextMock.mockResolvedValue({ text: OFFER_TEXT, messages: [] });
    const zipSignature = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const result = await extractOfferTextFromFile(makeFile(zipSignature, 'offre.docx'));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toContain('TypeScript');
      expect(result.fileName).toBe('offre.docx');
    }
  });

  it('reads txt files directly without an extractor', async () => {
    const result = await extractOfferTextFromFile(makeFile(OFFER_TEXT, 'offre.txt', 'text/plain'));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toContain('Node.js requis');
    }
  });

  it('rejects oversized files (5 MB cap)', async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    const result = await extractOfferTextFromFile(makeFile(big, 'offre.pdf', 'application/pdf'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('trop volumineux');
    }
  });

  it('rejects files whose bytes do not match the declared kind (magic bytes)', async () => {
    const result = await extractOfferTextFromFile(
      makeFile('pas un pdf', 'offre.pdf', 'application/pdf')
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('signature');
    }
  });

  it('rejects files with no extractable text (scanned PDF)', async () => {
    extractPdfTextMock.mockReturnValue({ text: '   \n   ', pageCount: 1 });
    const result = await extractOfferTextFromFile(makeFile('%PDF-1.4 blank', 'offre.pdf'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Aucun texte exploitable');
    }
  });
});

describe('extractOfferTextFromUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects invalid URLs and non-http(s) protocols', async () => {
    expect((await extractOfferTextFromUrl('pas une url')).ok).toBe(false);
    expect((await extractOfferTextFromUrl('ftp://example.com/offre')).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects private/internal hosts before any network call (SSRF guard)', async () => {
    const result = await extractOfferTextFromUrl('http://localhost:3000/offre');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('non autorisée');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the copy-paste fallback error when the page is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const result = await extractOfferTextFromUrl('https://jobs.example.com/offre');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Texte brut');
    }
  });

  it('follows redirects and extracts the final page text', async () => {
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({ status: 301, location: 'https://jobs.example.com/offre-2' })
      )
      .mockResolvedValueOnce(
        fakeResponse({
          contentType: 'text/html; charset=utf-8',
          body: `<html><body><h1>Offre</h1><p>${OFFER_TEXT}</p></body></html>`,
        })
      );
    const result = await extractOfferTextFromUrl('https://jobs.example.com/offre');
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    if (result.ok) {
      expect(result.text).toContain('Ingénieur Logiciel');
      // Provenance = the FINAL URL after the redirect chain was followed.
      expect(result.url).toBe('https://jobs.example.com/offre-2');
    }
  });

  it('returns an explicit error on HTTP 999 (LinkedIn-style blocking)', async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({ status: 999, contentType: 'text/html', body: 'blocked' })
    );
    const result = await extractOfferTextFromUrl('https://www.linkedin.com/jobs/view/123');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('HTTP 999');
    }
  });

  it('rejects pages whose text is too short to be an offer', async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({ contentType: 'text/html', body: '<html><body><p>404</p></body></html>' })
    );
    const result = await extractOfferTextFromUrl('https://jobs.example.com/offre');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('trop court');
    }
  });

  it('parses remote PDFs served with an application/pdf content type', async () => {
    extractPdfTextMock.mockReturnValue({ text: OFFER_TEXT, pageCount: 1 });
    fetchMock.mockResolvedValueOnce(
      fakeResponse({ contentType: 'application/pdf', body: Buffer.from('%PDF-1.4 remote') })
    );
    const result = await extractOfferTextFromUrl('https://jobs.example.com/offre.pdf');
    expect(result.ok).toBe(true);
    expect(extractPdfTextMock).toHaveBeenCalledTimes(1);
  });

  it('caps extracted text to MAX_OFFER_TEXT_CHARS', async () => {
    const huge = `Offre ${OFFER_TEXT} `.repeat(500);
    fetchMock.mockResolvedValueOnce(fakeResponse({ contentType: 'text/plain', body: huge }));
    const result = await extractOfferTextFromUrl('https://jobs.example.com/offre.txt');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text.length).toBe(MAX_OFFER_TEXT_CHARS);
    }
  });
});

describe('ingestOfferText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the uploaded file first (sourceType: file)', async () => {
    extractPdfTextMock.mockReturnValue({ text: OFFER_TEXT, pageCount: 1 });
    const formData = new FormData();
    formData.set('offerFile', makeFile('%PDF-1.4 x', 'offre.pdf', 'application/pdf'));
    formData.set('offerUrl', 'https://jobs.example.com/other');
    formData.set('jobDescription', 'texte collé');
    const result = await ingestOfferText(formData);
    expect(result.sourceType).toBe('file');
    expect(result.offerFileName).toBe('offre.pdf');
    expect(result.sourceUrl).toBeNull();
    expect(result.error).toBeNull();
    expect(result.text).toContain('Ingénieur Logiciel');
  });

  it('falls back to the URL when no file is present (sourceType: url)', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ contentType: 'text/plain', body: OFFER_TEXT }));
    const formData = new FormData();
    formData.set('offerUrl', 'https://jobs.example.com/offre');
    const result = await ingestOfferText(formData);
    expect(result.sourceType).toBe('url');
    expect(result.sourceUrl).toBe('https://jobs.example.com/offre');
    expect(result.offerFileName).toBeNull();
    expect(result.text).toContain('Ingénieur Logiciel');
  });

  it('propagates file errors and keeps the offending file name', async () => {
    const formData = new FormData();
    formData.set('offerFile', makeFile('x', 'offre.exe'));
    const result = await ingestOfferText(formData);
    expect(result.sourceType).toBe('file');
    expect(result.offerFileName).toBe('offre.exe');
    expect(result.error).not.toBeNull();
    expect(result.text).toBe('');
  });

  it('defaults to the pasted text (sanitized) when no file or URL is given', async () => {
    const formData = new FormData();
    formData.set('jobDescription', '  Offre  \r\n\r\n\r\n  Test  ');
    const result = await ingestOfferText(formData);
    expect(result.sourceType).toBe('text');
    expect(result.sourceUrl).toBeNull();
    expect(result.offerFileName).toBeNull();
    expect(result.error).toBeNull();
    expect(result.text).toBe('Offre\n\nTest');
  });

  it('returns empty text with no input at all (action shows its own message)', async () => {
    const result = await ingestOfferText(new FormData());
    expect(result.sourceType).toBe('text');
    expect(result.text).toBe('');
    expect(result.error).toBeNull();
  });
});



