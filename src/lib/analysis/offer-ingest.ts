/**
 * analysis/offer-ingest.ts — multimodal job-offer ingestion.
 *
 * The Job-Matching service accepts a job offer in THREE formats:
 *   1. FILE — a PDF / Word (.docx) / text (.txt) document (drag & drop);
 *   2. URL  — a public job-posting link (LinkedIn, Welcome to the Jungle…)
 *             fetched server-side and reduced to readable plain text;
 *   3. TEXT — direct copy-paste (legacy behavior, default tab).
 *
 * Every format is normalized by THIS module into a single clean
 * `job_description` string before the Gemini matching pipeline
 * (`analyzeJobMatch`) ever sees it. The only production caller is the
 * queueing server action (`queueJobMatchingAction`).
 *
 * Robustness contract (mirrors the product's « no silent fallback » rule):
 *  - extraction failures surface a French, actionable error message that
 *    directs the user to the « Texte brut » tab — never a fake offer text;
 *  - fetched HTML is stripped to readable text (scripts/styles/comments and
 *    tags removed, entities decoded, whitespace normalized) and capped to
 *    MAX_OFFER_TEXT_CHARS;
 *  - URL fetching is SSRF-guarded: only public http(s) origins are accepted,
 *    private / loopback / link-local hosts are rejected at EVERY redirect
 *    hop, the redirect chain and the download size / wall clock are bounded.
 */

import { DocxExtractionError, extractDocxText } from '@/lib/quick-test/docx-extract';
import { PdfExtractionError, extractPdfText } from '@/lib/quick-test/pdf-extract';
import { formatBytes, validateResumeBuffer } from '@/lib/resume-validation';

/** Hard cap of the normalized offer text (aligned with the queue action). */
export const MAX_OFFER_TEXT_CHARS = 12_000;

/** Minimum readable text expected from a fetched job-posting page. */
const MIN_URL_TEXT_CHARS = 80;

/** Download cap for remote offer pages (HTML is verbose; 2 MB is plenty). */
const OFFER_FETCH_MAX_BYTES = 2 * 1024 * 1024;

/** Wall-clock budget for a single HTTP hop. */
const OFFER_FETCH_TIMEOUT_MS = 12_000;

/** Bounded redirect chain (job boards chain 2–3 hops in practice). */
const MAX_REDIRECTS = 5;

/** Some job boards reject non-browser agents outright; identify politely. */
const BROWSER_LIKE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type OfferSourceType = 'file' | 'url' | 'text';

export interface OfferIngestion {
  /** Clean raw text ready for `job_description` (empty when error). */
  text: string;
  sourceType: OfferSourceType;
  sourceUrl: string | null;
  offerFileName: string | null;
  /** French, user-actionable error message (null on success). */
  error: string | null;
}

export type OfferFileIngestion =
  | { ok: true; text: string; fileName: string }
  | { ok: false; error: string };

export type OfferUrlIngestion =
  | { ok: true; text: string; url: string }
  | { ok: false; error: string };

type OfferDocumentKind = 'pdf' | 'docx' | 'txt';

/** Infers the offer document kind from the extension first, then the MIME. */
function inferOfferKind(fileName: string, declaredMimeType?: string): OfferDocumentKind | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || declaredMimeType === 'application/pdf') {
    return 'pdf';
  }
  if (lower.endsWith('.docx') || declaredMimeType === DOCX_MIME) {
    return 'docx';
  }
  if (lower.endsWith('.txt') || declaredMimeType === 'text/plain') {
    return 'txt';
  }
  return null;
}

/**
 * Normalizes raw extracted text into a clean, LLM-ready description:
 * unified newlines, control characters stripped, blank-line runs collapsed,
 * trailing/leading whitespace trimmed.
 */
export function sanitizeOfferText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    // C0 control characters (except \n already unified) + DEL.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[\t\u00A0 ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  laquo: '«',
  raquo: '»',
  agrave: 'à',
  acirc: 'â',
  ccedil: 'ç',
  eacute: 'é',
  egrave: 'è',
  ecirc: 'ê',
  euml: 'ë',
  icirc: 'î',
  iuml: 'ï',
  ocirc: 'ô',
  ograve: 'ò',
  ugrave: 'ù',
  ucirc: 'û',
  euro: '€',
  deg: '°',
  middot: '·',
  bull: '•',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

/** Decodes named + numeric (decimal/hex) HTML entities; unknown pass through. */
export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/**
 * Reduces an HTML page to readable plain text: comments, script/style/noscript
 * blocks and tags are removed; block boundaries become newlines; entities are
 * decoded. Callers still run {@link sanitizeOfferText} afterwards.
 */
export function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(
        /<\/(?:p|div|section|article|main|aside|header|footer|li|tr|table|ul|ol|dl|dd|dt|h[1-6]|blockquote|figcaption|form)\s*>/gi,
        '\n'
      )
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

/**
 * SSRF guard: rejects loopback, private, link-local (cloud metadata), CGNAT,
 * multicast/reserved and site-internal host names at every redirect hop.
 */
export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '').replace(/^\[/, '').replace(/\]$/, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((octet) => octet > 255)) {
      return true;
    }
    const [a, b] = octets;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT range.
      (a === 169 && b === 254) || // Link-local (incl. cloud metadata endpoint).
      (a === 172 && b >= 16 && b <= 31) || // Private range.
      (a === 192 && b === 168) || // Private range.
      a >= 224 // Multicast + reserved.
    );
  }

  // IPv6 loopback, unspecified, unique-local (fc00::/7) and link-local (fe80::/10).
  return host === '::' || host === '::1' || /^(f[cd]|fe80)/.test(host);
}

/** Extracts clean text from an uploaded offer document (PDF / DOCX / TXT). */
export async function extractOfferTextFromFile(file: File): Promise<OfferFileIngestion> {
  const kind = inferOfferKind(file.name, file.type);
  if (!kind) {
    return {
      ok: false,
      error: `Type de fichier non supporté « ${file.name} ». Formats acceptés : PDF (.pdf), Word (.docx) et texte (.txt).`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Server-authoritative guard: empty file, size cap and magic bytes.
  const bufferError = validateResumeBuffer(file.name, buffer);
  if (bufferError) {
    return { ok: false, error: bufferError };
  }

  let rawText: string;
  try {
    if (kind === 'pdf') {
      rawText = extractPdfText(buffer).text;
    } else if (kind === 'docx') {
      rawText = (await extractDocxText(buffer)).text;
    } else {
      rawText = buffer.toString('utf8');
    }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof PdfExtractionError || err instanceof DocxExtractionError
          ? err.message
          : 'Impossible de lire ce document (fichier corrompu ?).',
    };
  }

  const text = sanitizeOfferText(rawText).slice(0, MAX_OFFER_TEXT_CHARS);
  if (text.length === 0) {
    return {
      ok: false,
      error:
        'Aucun texte exploitable n’a été extrait de ce fichier (PDF scanné ou vide ?). Utilisez l’onglet « Texte brut ».',
    };
  }
  return { ok: true, text, fileName: file.name };
}

/** Minimal response shape consumed below (keeps tests environment-agnostic). */
interface OfferFetchResponse {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
  body?: { cancel(): Promise<unknown> } | null;
}

/** Parses one fetched response into clean offer text. */
async function readOfferFromResponse(
  response: OfferFetchResponse,
  url: string
): Promise<OfferUrlIngestion> {
  let buffer: Buffer;
  try {
    buffer = Buffer.from(await response.arrayBuffer());
  } catch {
    return { ok: false, error: 'Impossible de télécharger le contenu de cette page.' };
  }
  if (buffer.length === 0) {
    return { ok: false, error: 'La page distante est vide.' };
  }
  if (buffer.length > OFFER_FETCH_MAX_BYTES) {
    return {
      ok: false,
      error: `La page distante est trop volumineuse (${formatBytes(buffer.length)}). Maximum : ${formatBytes(OFFER_FETCH_MAX_BYTES)}.`,
    };
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  const head = buffer.toString('latin1', 0, 1024);
  const looksLikePdf = head.includes('%PDF-');
  const startsWithMarkup = buffer.toString('utf8', 0, 512).trimStart().startsWith('<');
  const isHtml = contentType.includes('html') || (!contentType && startsWithMarkup);

  let rawText: string;
  try {
    if (contentType.includes('application/pdf') || (!contentType && looksLikePdf)) {
      rawText = extractPdfText(buffer).text;
    } else if (contentType.includes('text/plain')) {
      rawText = buffer.toString('utf8');
    } else if (isHtml) {
      rawText = htmlToPlainText(buffer.toString('utf8'));
    } else {
      // Unknown content type: sniff — HTML pages start with a tag, else the
      // payload is treated as plain text.
      const asText = buffer.toString('utf8');
      rawText = startsWithMarkup ? htmlToPlainText(asText) : asText;
    }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof PdfExtractionError
          ? err.message
          : 'Le contenu de cette page n’est pas exploitable.',
    };
  }

  const clean = sanitizeOfferText(rawText).slice(0, MAX_OFFER_TEXT_CHARS);
  if (clean.length < MIN_URL_TEXT_CHARS) {
    return {
      ok: false,
      error:
        'Le contenu récupéré est trop court pour être une offre d’emploi (page protégée ou vide ?). Copiez-collez le texte de l’offre dans l’onglet « Texte brut ».',
    };
  }
  return { ok: true, text: clean, url };
}

/**
 * Fetches a public job-posting URL and reduces it to clean offer text.
 * Robust fallback handling: any unreachable/protected/too-thin page returns
 * an explicit French error pointing the user to the « Texte brut » tab.
 */
export async function extractOfferTextFromUrl(rawUrl: string): Promise<OfferUrlIngestion> {
  let target: URL;
  try {
    target = new URL(rawUrl.trim());
  } catch {
    return {
      ok: false,
      error: 'Le lien de l’offre est invalide. Vérifiez l’URL complète (https://…).',
    };
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return { ok: false, error: 'Seuls les liens http et https sont pris en charge.' };
  }

  let current = target;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (isBlockedHost(current.hostname)) {
      return { ok: false, error: 'Ce lien pointe vers une adresse non autorisée.' };
    }

    let response: OfferFetchResponse | null = null;
    try {
      response = (await fetch(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(OFFER_FETCH_TIMEOUT_MS),
        headers: {
          'user-agent': BROWSER_LIKE_UA,
          accept: 'text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.8',
          'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
      })) as OfferFetchResponse;
    } catch {
      response = null;
    }

    if (!response) {
      return {
        ok: false,
        error:
          'Impossible de joindre cette page. Vérifiez le lien ou copiez-collez le texte de l’offre dans l’onglet « Texte brut ».',
      };
    }

    // Manual redirect loop: every hop is SSRF-checked before being followed.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return {
          ok: false,
          error: 'Le lien de l’offre a répondu par une redirection invalide.',
        };
      }
      try {
        current = new URL(location, current);
      } catch {
        return {
          ok: false,
          error: 'Le lien de l’offre a répondu par une redirection invalide.',
        };
      }
      void response.body?.cancel()?.catch(() => undefined);
      continue;
    }

    if (!response.ok) {
      return {
        ok: false,
        error: `La page a répondu avec une erreur (HTTP ${response.status}). Certaines plateformes bloquent la lecture automatique : copiez-collez le texte de l’offre dans l’onglet « Texte brut ».`,
      };
    }

    return readOfferFromResponse(response, current.toString());
  }

  return {
    ok: false,
    error:
      'Trop de redirections sur ce lien. Copiez-collez le texte de l’offre dans l’onglet « Texte brut ».',
  };
}

/**
 * Single entry point used by the queueing server action: reads the offer
 * from whichever format was submitted (file → url → text) and returns the
 * normalized description + provenance metadata. On a file/URL failure the
 * `error` message is user-actionable and `text` is empty.
 */
export async function ingestOfferText(formData: FormData): Promise<OfferIngestion> {
  // 1) FILE — an uploaded offer document takes precedence.
  const fileEntry = formData.get('offerFile');
  if (fileEntry instanceof File && fileEntry.size > 0) {
    const result = await extractOfferTextFromFile(fileEntry);
    return result.ok
      ? {
          text: result.text,
          sourceType: 'file',
          sourceUrl: null,
          offerFileName: result.fileName,
          error: null,
        }
      : {
          text: '',
          sourceType: 'file',
          sourceUrl: null,
          offerFileName: fileEntry.name,
          error: result.error,
        };
  }

  // 2) URL — a public job-posting link to fetch and parse.
  const urlEntry = formData.get('offerUrl');
  if (typeof urlEntry === 'string' && urlEntry.trim().length > 0) {
    const trimmed = urlEntry.trim();
    const result = await extractOfferTextFromUrl(trimmed);
    return result.ok
      ? {
          text: result.text,
          sourceType: 'url',
          sourceUrl: trimmed,
          offerFileName: null,
          error: null,
        }
      : {
          text: '',
          sourceType: 'url',
          sourceUrl: trimmed,
          offerFileName: null,
          error: result.error,
        };
  }

  // 3) TEXT — direct copy-paste (default tab, legacy behavior).
  const textEntry = formData.get('jobDescription');
  const raw = typeof textEntry === 'string' ? textEntry : '';
  return {
    text: sanitizeOfferText(raw).slice(0, MAX_OFFER_TEXT_CHARS),
    sourceType: 'text',
    sourceUrl: null,
    offerFileName: null,
    error: null,
  };
}




