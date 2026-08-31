import type { RoleFilter, UserRole } from '@/types/admin';

/**
 * Pure helpers shared by the admin server components, data layer and actions.
 * Kept free of any Supabase/Next.js dependency so they are trivially testable.
 */

/** Parses a `?page=` search param into a positive integer clamped to `max`. */
export function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  max = 100000
): number {
  if (!value || value.trim().length === 0) {
    return fallback;
  }
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }
  return Math.min(n, max);
}

/** Parses a `?role=` filter into 'user' | 'admin' | null (no filter). */
export function parseRoleFilter(value: string | undefined): RoleFilter {
  if (value === 'user' || value === 'admin') {
    return value;
  }
  return null;
}

/** Validates an arbitrary role string against the profiles role whitelist. */
export function toUserRole(value: string | null | undefined): UserRole | null {
  if (value === 'user' || value === 'admin') {
    return value;
  }
  return null;
}

/** Clamps a desired page into the valid [1, totalPages] range. */
export function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page) || !Number.isFinite(totalPages) || totalPages < 1) {
    return 1;
  }
  return Math.min(Math.max(page, 1), totalPages);
}

/**
 * Computes part/total rounded to one decimal (0–100).
 * Returns null when the total is <= 0 (division by zero / "no data yet").
 */
export function computePercent(part: number, total: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return null;
  }
  return Math.round((part / total) * 1000) / 10;
}

/** Formats a percent (or the "no data yet" em-dash placeholder). */
export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

/** Formats an ISO timestamp for the admin tables (medium date + short time). */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Truncates long text for compact table cells (keeps full value for title). */
export function truncateMiddle(text: string, maxLength = 14): string {
  if (text.length <= maxLength) {
    return text;
  }
  const half = Math.floor((maxLength - 1) / 2);
  return `${text.slice(0, half)}…${text.slice(-half)}`;
}

/** Builds the query-string portion shared by all users-list links. */
export function buildUsersQuery(query: string | null, role: RoleFilter): string {
  const params = new URLSearchParams();
  if (query && query.trim().length > 0) {
    params.set('q', query.trim());
  }
  if (role) {
    params.set('role', role);
  }
  return params.toString();
}