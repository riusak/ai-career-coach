/**
 * Chart 3 — Dynamic company logos (no DB binary storage).
 *
 * Company logos are NEVER persisted in Supabase storage. Instead, a logo URL
 * is derived on-the-fly from the company name using the Clearbit Logo API
 * (https://logo.clearbit.com/<domain>). When no domain can be guessed or the
 * logo fails to load, the UI falls back to a deterministic initials tile
 * (professional vector placeholder) — so the roadmap / experience views stay
 * clean offline, behind the firewall, or for local companies Clearbit has no
 * entries for.
 *
 * All helpers are pure and server/client safe (no DOM, no fetch).
 */

const CLEARBIT_LOGO_BASE_URL = 'https://logo.clearbit.com';

/**
 * Well-known companies mapped to their canonical public domains so the
 * heuristic never has to guess for them (e.g. "Datadog" → datadoghq.com).
 * Keys are matched on the exact trimmed company string.
 */
export const COMPANY_DOMAIN_OVERRIDES: Record<string, string> = {
  'Wave Mobile Money': 'wave.com',
  'Ecobank Transnational': 'ecobank.com',
  'Alan Health': 'alan.com',
  'Paystack (Stripe Africa)': 'paystack.com',
  'Orange Middle East & Africa': 'orange.com',
  'Datadog EMEA': 'datadoghq.com',
  'Upwork Global': 'upwork.com',
  'GVA Group': 'gva-group.com',
  'Moov Africa': 'moov-africa.com',
};

/**
 * Words that carry no brand signal when deriving a plausible domain.
 * e.g. "DevLab Studio" → devlab.com, "TogoTech Solutions" → togotech.com.
 */
const DOMAIN_NOISE_WORDS = new Set([
  'the',
  'group',
  'global',
  'international',
  'emea',
  'europe',
  'africa',
  'middle',
  'east',
  'inc',
  'llc',
  'ltd',
  'limited',
  'gmbh',
  'ag',
  'sa',
  'sarl',
  'sas',
  'bv',
  'plc',
  'corp',
  'corporation',
  'company',
  'co',
  'holdings',
  'holding',
  'partners',
  'partner',
  'solutions',
  'systems',
  'services',
  'technology',
  'technologies',
  'tech',
  'labs',
  'lab',
  'digital',
  'software',
  'consulting',
  'consultants',
  'health',
  'transnational',
]);

/** Smaller stop list for the initials fallback (legal suffixes only). */
const INITIALS_NOISE_WORDS = new Set([
  'the',
  'inc',
  'llc',
  'ltd',
  'limited',
  'gmbh',
  'ag',
  'sa',
  'sas',
  'sarl',
  'bv',
  'plc',
  'corp',
  'corporation',
  'company',
  'co',
  'holdings',
  'group',
  'and',
]);

/**
 * Deterministic professional palette for the initials fallback tile. Kept in
 * the navy / slate / deep-orange family of the dashboard so the placeholder
 * blends with the existing roadmap styling.
 */
const FALLBACK_PALETTE = [
  '#0F172A',
  '#1E3A5F',
  '#0B2545',
  '#334155',
  '#4F46E5',
  '#1E40AF',
  '#155E75',
  '#0E7490',
  '#7C2D12',
  '#9A3412',
];

/** Stable ASCII-folded lowercase key used for hashing / matching. */
function foldAccents(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function significantWords(input: string, noise: Set<string>): string[] {
  const folded = foldAccents(input).toLowerCase();
  return folded.split(/[^a-z0-9]+/).filter((word) => word.length > 0 && !noise.has(word));
}

/**
 * Derives a plausible public domain from a company name (exact override wins,
 * then the first significant word + `.com`). Returns null when nothing usable
 * can be inferred (empty, numeric, single letter, …).
 */
export function companyDomain(company: string): string | null {
  const trimmed = company.trim();
  if (!trimmed) return null;

  const exactOverride = COMPANY_DOMAIN_OVERRIDES[trimmed];
  if (exactOverride) return exactOverride;

  const words = significantWords(trimmed, DOMAIN_NOISE_WORDS);
  const candidate = words[0] ?? null;
  if (!candidate || candidate.length < 2 || candidate.length > 30) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(candidate)) return null;
  // A purely numeric token (e.g. "123") is not a brand — never guess a domain.
  if (!/[a-z]/.test(candidate)) return null;

  return `${candidate}.com`;
}

/**
 * Clearbit Logo API URL for the company (null when the domain is unknown —
 * callers must render the initials fallback in that case).
 */
export function getCompanyLogoUrl(company: string): string | null {
  const domain = companyDomain(company);
  return domain ? `${CLEARBIT_LOGO_BASE_URL}/${domain}` : null;
}

/**
 * Deterministic initials for the fallback tile: first letters of the first two
 * significant words (e.g. "Wave Mobile Money" → "WM"), or the first three
 * letters of a single-word name (e.g. "Upwork" → "UPW").
 */
export function companyInitials(company: string): string {
  const trimmed = company.trim();
  if (!trimmed) return '';

  const words = significantWords(trimmed, INITIALS_NOISE_WORDS);
  const source = words.length > 0 ? words : [trimmed[0].toLowerCase()];

  if (source.length >= 2) {
    const first = source[0].charAt(0).toUpperCase();
    const second = source[1].charAt(0).toUpperCase();
    return `${first}${second}`;
  }

  return source[0].slice(0, 3).toUpperCase();
}

/** Deterministic stable color for the initials tile of a company name. */
export function fallbackColorFor(company: string): string {
  const key = foldAccents(company.trim()).toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

/** Everything the CompanyLogo component needs, precomputed and memoizable. */
export interface CompanyLogoSource {
  /** Clearbit logo URL when a domain could be derived, else null. */
  url: string | null;
  /** Deterministic initials fallback ('' only for empty company names). */
  initials: string;
  /** Deterministic professional tile color for the initials fallback. */
  color: string;
}

/** One-stop helper consumed by the CompanyLogo React component. */
export function getCompanyLogoSource(company: string): CompanyLogoSource {
  return {
    url: getCompanyLogoUrl(company),
    initials: companyInitials(company),
    color: fallbackColorFor(company),
  };
}
