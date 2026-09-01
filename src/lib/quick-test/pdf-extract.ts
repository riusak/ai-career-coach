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
 * (WinAnsi ≈ CP-1252 is assumed for literal strings), no support for
 * encrypted documents, and no OCR — scanned PDFs yield an empty string that
 * callers must handle. Binary streams (embedded font files, images) are
 * filtered out so they never pollute the extracted text.
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
      out += mapWinAnsi(char);
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
      out += mapWinAnsi(String.fromCharCode(parseInt(octal, 8)));
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
      out += escapes[next] ?? mapWinAnsi(next);
      i += 1;
    }
  }
  return out;
}

/**
 * WinAnsi (CP-1252) high-byte map — the default encoding for literal strings
 * in the vast majority of text PDFs. Without it, bytes 0x80–0x9F (curly
 * quotes, en/em dashes, ellipsis, euro…) decode as invisible C1 control
 * characters, which litters French CV text with "mojibake" the guardrail
 * rightly rejects. Undefined slots (0x81, 0x8D, 0x8F, 0x90, 0x9D) map to ''.
 */
const WINANSI_HIGH: Record<string, string> = {
  '\u0080': '€',
  '\u0082': '‚',
  '\u0083': 'ƒ',
  '\u0084': '„',
  '\u0085': '…',
  '\u0086': '†',
  '\u0087': '‡',
  '\u0088': 'ˆ',
  '\u0089': '‰',
  '\u008A': 'Š',
  '\u008B': '‹',
  '\u008C': 'Œ',
  '\u008D': '',
  '\u008E': 'Ž',
  '\u008F': '',
  '\u0090': '',
  '\u0091': '’',
  '\u0092': '’',
  '\u0093': '“',
  '\u0094': '”',
  '\u0095': '•',
  '\u0096': '–',
  '\u0097': '—',
  '\u0098': '˜',
  '\u0099': '™',
  '\u009A': 'š',
  '\u009B': '›',
  '\u009C': 'œ',
  '\u009D': '',
  '\u009E': 'ž',
  '\u009F': 'Ÿ',
};

function mapWinAnsi(char: string): string {
  return WINANSI_HIGH[char] ?? char;
}

/** Ratio of human-readable characters in a string (0–1). */
function printableRatio(s: string): number {
  if (s.length === 0) {
    return 0;
  }
  let printable = 0;
  for (let i = 0; i < s.length; i += 1) {
    const code = s.charCodeAt(i);
    if (
      code === 9 ||
      code === 10 ||
      code === 13 ||
      (code >= 32 && code < 127) ||
      code >= 160
    ) {
      printable += 1;
    }
  }
  return printable / s.length;
}

/**
 * Heuristic filter separating real page-content streams from the binary
 * streams embedded by most PDF generators (FontFile2/3 TrueType subsets,
 * image XObjects…). Those binaries contain `(str)` / `<hex>`-looking token
 * sequences that used to be extracted as garbage text — the "mojibake" the
 * CV guardrail rejected. A genuine content stream always shows text with
 * BT…ET blocks using Tj/TJ operators and is almost entirely printable.
 */
function isLikelyTextContent(content: string): boolean {
  if (!/\bT[jJ]\b/.test(content) || !/\bBT\b[\s\S]*\bET\b/.test(content)) {
    return false;
  }
  return printableRatio(content) >= 0.85;
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
      const literal = decodePdfEscapes(match[1]);
      // UTF-16BE literal strings start with the \376\377 BOM (latin1: "þÿ").
      if (literal.startsWith('\u00FE\u00FF')) {
        let utf16 = '';
        const rest = literal.slice(2);
        for (let i = 0; i + 1 < rest.length; i += 2) {
          utf16 += String.fromCharCode(
            (rest.charCodeAt(i) << 8) | rest.charCodeAt(i + 1)
          );
        }
        text += utf16;
      } else {
        text += literal;
      }
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
      const content = inflated.toString('latin1');
      // Only content streams (BT…ET + Tj/TJ operators, printable) carry text.
      // Font binaries and image data are skipped instead of being mined for
      // garbage tokens.
      if (isLikelyTextContent(content)) {
        text += extractTextFromContent(content);
        text += '\n';
      }
    }
    streamRegex.lastIndex = endMarker;
  }

  return {
    text: text
      // Strip any surviving control characters (C0/C1/DEL) — real line breaks
      // and tabs are preserved; the rest is decode noise that reads as
      // binary corruption downstream.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0080-\u009F]/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    pageCount,
  };
}

/** Counts words in extracted text (whitespace-separated tokens with letters). */
export function countWords(text: string): number {
  const tokens = text.split(/\s+/).filter((token) => /\p{L}/u.test(token));
  return tokens.length;
}