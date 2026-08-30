import { inflateRawSync, inflateSync } from 'node:zlib';

/**
 * Dependency-free, ephemeral PDF text extraction for the visitor Quick Test.
 *
 * Strategy (covers the vast majority of text-based CVs):
 *  1. Count page objects to build lightweight metadata.
 *  2. Locate every `stream ... endstream` payload, inflating FlateDecode ones.
 *  3. Pull literal `(string)` / `<hex>` tokens out of content streams, treating
 *     text-positioning operators as line breaks.
 *
 * Known limitations (accepted for the MVP): no ToUnicode CMap resolution
 * (WinAnsi ≈ latin-1 is assumed), no support for encrypted documents, and no
 * OCR — scanned PDFs yield an empty string that callers must handle.
 */

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
}

export class PdfExtractionError extends Error {}

/** Detects the `%PDF-` magic header, tolerating a leading BOM/junk. */
export function isPdfBuffer(data: Buffer): boolean {
  const magicIndex = data.subarray(0, 1024).toString('latin1').indexOf('%PDF-');
  return magicIndex !== -1;
}

function countPages(raw: string): number {
  const matches = raw.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
  return matches ? matches.length : 0;
}

function isFlateEncoded(raw: string, streamStart: number): boolean {
  const dictStart = Math.max(0, streamStart - 600);
  const dict = raw.slice(dictStart, streamStart);
  return dict.includes('/FlateDecode');
}

function inflateStream(payload: Buffer, flate: boolean): Buffer {
  if (!flate) {
    return payload;
  }
  try {
    return inflateSync(payload);
  } catch {
    try {
      return inflateRawSync(payload);
    } catch {
      // Corrupt or filtered stream — skip it.
      return Buffer.alloc(0);
    }
  }
}

function decodePdfEscapes(body: string): string {
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (char !== '\\') {
      out += char;
      continue;
    }
    const next = body[i + 1];
    if (next === undefined) {
      break;
    }
    if (next >= '0' && next <= '7') {
      // Octal escape: 1 to 3 digits.
      let octal = next;
      i += 1;
      while (octal.length < 3 && body[i + 1] >= '0' && body[i + 1] <= '7') {
        octal += body[i + 1];
        i += 1;
      }
      out += String.fromCharCode(parseInt(octal, 8));
    } else if (next === '\r') {
      // Line continuation (handle \r\n too).
      if (body[i + 2] === '\n') {
        i += 1;
      }
      i += 1;
    } else if (next === '\n') {
      i += 1;
    } else {
      const escapes: Record<string, string> = {
        n: '\n',
        r: '\r',
        t: '\t',
        b: '\b',
        f: '\f',
      };
      out += escapes[next] ?? next;
      i += 1;
    }
  }
  return out;
}

function decodeHexString(hex: string): string {
  const cleaned = hex.replace(/[^0-9A-Fa-f]/g, '');
  const padded = cleaned.length % 2 === 0 ? cleaned : `${cleaned}0`;
  // UTF-16BE strings appear in generated PDFs; single-byte otherwise.
  if (padded.length >= 8 && padded.length % 4 === 0) {
    let utf16 = '';
    for (let i = 0; i < padded.length; i += 4) {
      utf16 += String.fromCharCode(parseInt(padded.slice(i, i + 4), 16));
    }
    if (!/[\u0000-\u0008\u000E-\u001F]/.test(utf16)) {
      return utf16;
    }
  }
  let latin = '';
  for (let i = 0; i < padded.length; i += 2) {
    latin += String.fromCharCode(parseInt(padded.slice(i, i + 2), 16));
  }
  return latin;
}

function extractTextFromContent(content: string): string {
  // Drop inline images before scanning for string tokens.
  const withoutImages = content.replace(/\bBI[\s\S]*?\bEI/g, ' ');

  const tokenRegex =
    /\(((?:\\[\s\S]|[^\\()])*)\)|<([0-9A-Fa-f\s]*)>|\b(BT|ET|Td|TD|Tm|TL)\b|\bT\*/g;

  let text = '';
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(withoutImages)) !== null) {
    if (match[1] !== undefined) {
      text += decodePdfEscapes(match[1]);
    } else if (match[2] !== undefined) {
      text += decodeHexString(match[2]);
    } else {
      // Positioning operator: hard line break for readability.
      text += '\n';
    }
  }
  return text;
}

/**
 * Extracts readable text from a PDF buffer. Throws {@link PdfExtractionError}
 * for encrypted documents. Returns an empty `text` when nothing could be
 * extracted (e.g. scanned/image-only PDF) — callers decide the UX.
 */
export function extractPdfText(data: Buffer): PdfExtractionResult {
  if (!isPdfBuffer(data)) {
    throw new PdfExtractionError('Not a PDF document.');
  }

  const raw = data.toString('latin1');

  if (raw.includes('/Encrypt')) {
    throw new PdfExtractionError('Encrypted PDF documents are not supported.');
  }

  const pageCount = countPages(raw);

  const streamRegex = /stream\r?\n?/g;
  let text = '';
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(raw)) !== null) {
    const payloadStart = match.index + match[0].length;
    const endMarker = raw.indexOf('endstream', payloadStart);
    if (endMarker === -1) {
      break;
    }
    const payload = data.subarray(payloadStart, endMarker);
    const inflated = inflateStream(payload, isFlateEncoded(raw, match.index));
    if (inflated.length > 0) {
      text += extractTextFromContent(inflated.toString('latin1'));
      text += '\n';
    }
    streamRegex.lastIndex = endMarker;
  }

  return {
    text: text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(),
    pageCount,
  };
}

/** Counts words in extracted text (whitespace-separated tokens with letters). */
export function countWords(text: string): number {
  const tokens = text.split(/\s+/).filter((token) => /\p{L}/u.test(token));
  return tokens.length;
}