/**
 * Durable page-guide visibility state (Chart 7 — onboarding widget).
 *
 * Page guides are HIDDEN BY DEFAULT in day-to-day usage; the discreet
 * « Guide de la page » toggle in each page header reveals them on demand.
 * The preference is persisted per page in localStorage so the guide never
 * nags twice — unlike the first-connection onboarding (cookie + DB flag),
 * this is a pure UI preference with no server counterpart.
 */

export type PageGuideKey = 'cvs' | 'matching' | 'mock' | 'timeline' | 'analytics';

const STORAGE_PREFIX = 'forpro_page_guide:';

/** Namespaced localStorage key per page guide. */
export function pageGuideStorageKey(page: PageGuideKey): string {
  return `${STORAGE_PREFIX}${page}`;
}

/** Hidden by default: only an explicitly stored « 1 » reveals the guide. */
export function readPageGuideVisible(page: PageGuideKey): boolean {
  try {
    return window.localStorage.getItem(pageGuideStorageKey(page)) === '1';
  } catch {
    // Storage unavailable (private mode / quota) — fall back to hidden.
    return false;
  }
}

/** Persists the reveal/hide choice. Hiding removes the stored marker. */
export function writePageGuideVisible(page: PageGuideKey, visible: boolean): void {
  try {
    if (visible) {
      window.localStorage.setItem(pageGuideStorageKey(page), '1');
    } else {
      window.localStorage.removeItem(pageGuideStorageKey(page));
    }
  } catch {
    // Storage unavailable — the preference stays session-only.
  }
}
