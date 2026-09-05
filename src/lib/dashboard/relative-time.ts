/**
 * Pure client-safe helpers shared by the dashboard components.
 * (No 'use server' — must stay importable from client components.)
 */

const RELATIVE_CUTOFFS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 365 * 24 * 3600 * 1000 },
  { unit: 'month', ms: 30 * 24 * 3600 * 1000 },
  { unit: 'week', ms: 7 * 24 * 3600 * 1000 },
  { unit: 'day', ms: 24 * 3600 * 1000 },
  { unit: 'hour', ms: 3600 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
];

/**
 * Formats an ISO timestamp as a locale-aware relative time ("il y a 2 h",
 * "3 days ago"). Falls back to the numeric threshold when the Intl runtime
 * lacks a unit. Used by RecentActivity and the CV cards.
 */
export function formatRelativeTime(iso: string, locale: string, now = Date.now()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diff = date.getTime() - now;
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  for (const { unit, ms } of RELATIVE_CUTOFFS) {
    if (Math.abs(diff) >= ms) {
      return formatter.format(Math.round(diff / ms), unit);
    }
  }
  return formatter.format(Math.round(diff / (60 * 1000)), 'minute');
}

/**
 * Formats an ISO date as a short absolute date ("12 août 2026") — used by
 * the CV preview modal header. Returns an empty string on invalid input.
 */
export function formatShortDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Formats a decimal-year experience total as "4,5" / "4.5" per locale. */
export function formatYears(totalYears: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(totalYears);
}