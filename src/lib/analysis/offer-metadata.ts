/**
 * analysis/offer-metadata.ts — lightweight metadata extraction from a
 * normalized job-offer text (Chart 8 follow-up).
 *
 * When the user does not type the job title / company, the queue action pulls
 * them straight from the offer itself (uploaded document, fetched URL page or
 * raw pasted text) so the diagnostic headline and the history render a
 * meaningful label. Heuristics are deliberately conservative: labeled fields
 * first (« Poste : », « Entreprise : », « Job title », « Company »…), then the
 * leading title line / « chez X » / « À propos de X » patterns. The LLM
 * pipeline refines both values at completion time anyway (see
 * `completeJobMatching` metadata overrides).
 *
 * Pure module: no I/O, safe for unit tests and reusable server-side.
 */

/** Canonical fallback title used when nothing can be extracted (FR-first). */
export const GENERIC_JOB_TITLE = 'Offre d’emploi';

const MAX_METADATA_CHARS = 120;
/** Leading lines considered for the implicit-title heuristic. */
const MAX_SCAN_LINES = 25;

/** Strips bullets / markdown noise around a captured value, then bounds it. */
function cleanCapture(raw: string): string | null {
  const value = raw
    .replace(/^[\s*•·\-–—>#]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:]+$/, '')
    .trim();
  if (value.length < 2 || value.length > MAX_METADATA_CHARS) {
    return null;
  }
  return value;
}

/** Splits the text into bounded, non-empty lines for pattern scanning. */
function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, MAX_SCAN_LINES);
}

/** « Intitulé du poste : », « Poste — », « Job title: », « Position »… */
const TITLE_LABELLED =
  /^(?:intitul[ée]\s*du\s*poste|poste(?:\s*(?:à|a)\s*pourvoir|\s*propos[ée]e?)?|titre\s*du\s*poste|job\s*title|position(?:\s+title)?|role)\s*[:\-–—]\s*(.+)$/i;

/** « Entreprise : », « Société — », « Company: », « Employer »… */
const COMPANY_LABELLED =
  /^(?:entreprise|soci[ée]t[ée](?:\s+recruteuse)?|employeur|company|employer|organisation|organization)\s*[:\-–—]\s*(.+)$/i;

/** « … chez Wave Mobile Money » / « … at Paystack » (title-case capture). */
const COMPANY_CHEZ =
  /\b(?:chez|at|join(?:ing)?)\s+([A-Z0-9][\w&'’.\-]*(?:\s+[A-Z0-9][\w&’'.\-]*){0,3})/;

/** « À propos de Wave » / « About Paystack » section heading. */
const COMPANY_ABOUT = /^(?:à\s*propos(?:\s+de)?|about(?:\s+the\s+company)?)\s*:?\s*(.+)$/i;

/** Noise lines that must never become the implicit job title. */
const TITLE_LINE_NOISE =
  /^(?:offre\s+d['’]emploi|fiche\s+de\s+poste|job\s*(?:posting|offer|description)|announcement|description\s+du\s+poste)\b[:\-–— ]*/i;

/** Intro / boilerplate openers that disqualify a leading line as a title. */
const TITLE_LINE_INTRO =
  /^(?:nous|we|you|vous|avec|at\s+|rejoignez|join|cher|dear|about|à\s*propos|postuler|apply|salaire|salary|lieu|location|type\s+de\s+contrat|contract)\b/i;

/**
 * Extracts the job title / company from a normalized offer text.
 * Returns null values when nothing reliable is found — the caller decides the
 * fallback (generic title label, or LLM refinement at completion time).
 */
export function extractOfferMetadata(text: string): {
  jobTitle: string | null;
  company: string | null;
} {
  const scanned = lines(text);

  // --- Job title -----------------------------------------------------------
  let jobTitle: string | null = null;
  for (const line of scanned) {
    const labelled = line.match(TITLE_LABELLED);
    if (labelled) {
      jobTitle = cleanCapture(labelled[1]);
      if (jobTitle) break;
    }
  }
  if (!jobTitle) {
    // Implicit heuristic: in most postings the title is the leading line.
    for (const line of scanned.slice(0, 8)) {
      // A sentence (trailing . ! ?) is prose, never a job title.
      if (/[.!?]$/.test(line)) {
        continue;
      }
      const candidate = cleanCapture(line.replace(TITLE_LINE_NOISE, ''));
      if (
        candidate &&
        candidate.length <= 90 &&
        candidate.length >= 3 &&
        !candidate.endsWith(':') &&
        !COMPANY_LABELLED.test(line) &&
        !COMPANY_ABOUT.test(line) &&
        !TITLE_LINE_INTRO.test(candidate)
      ) {
        jobTitle = candidate;
        break;
      }
    }
  }

  // --- Company -------------------------------------------------------------
  let company: string | null = null;
  for (const line of scanned) {
    const labelled = line.match(COMPANY_LABELLED);
    if (labelled) {
      company = cleanCapture(labelled[1]);
      if (company) break;
    }
  }
  if (!company) {
    for (const line of scanned) {
      const about = line.match(COMPANY_ABOUT);
      const candidate = about ? cleanCapture(about[1]) : null;
      // Guard: « À propos de l'offre » / « About the role » are not companies.
      if (
        candidate &&
        !/^(?:l['’]?offre|du\s+poste|the\s+(?:company|role|offer)|nous|us)\b/i.test(candidate)
      ) {
        company = candidate;
        break;
      }
    }
  }
  if (!company) {
    for (const line of scanned) {
      const chez = line.match(COMPANY_CHEZ);
      if (chez) {
        company = cleanCapture(chez[1]);
        if (company) break;
      }
    }
  }

  return { jobTitle, company };
}