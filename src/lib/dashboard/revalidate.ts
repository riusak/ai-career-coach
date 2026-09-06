import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Chart 4 — centralized revalidation for every dashboard mutation.
 *
 * All dashboard segments are DYNAMIC (cookies-based auth through Supabase
 * SSR), so the server always renders fresh data per request and the Full
 * Route Cache is never populated for them. What CAN go stale is the
 * client-side Router Cache: the prefetched RSC payloads of previously
 * visited segments. `revalidatePath` purges exactly those entries — which is
 * what makes a mutation feel instantaneous (the current view refreshes via
 * the server action) AND consistent on the next client-side navigation
 * (no stale roadmap/analytics/CV grid).
 *
 * Before this module, each action revalidated a different subset of paths,
 * so e.g. an experience edit left /dashboard/analytics and /dashboard/timeline
 * with stale prefetched payloads. Every mutation now invalidates the full
 * dashboard surface through this single entry point.
 *
 * `revalidateTag(DASHBOARD_CACHE_TAG)` is the forward-compatible hook: once
 * Cache Components are enabled in next.config ('use cache' + cacheTag on the
 * Supabase loaders), every cached read will carry this tag and this call
 * becomes the one-stop invalidation for them. Under pure dynamic rendering
 * it is a harmless no-op — intentionally kept so the invalidation strategy
 * survives the future caching migration unchanged.
 */

export const DASHBOARD_CACHE_TAG = 'dashboard-data';

/** Every dashboard segment consuming the shared view model or its mutations. */
const DASHBOARD_PATHS = [
  '/dashboard',
  '/dashboard/analytics',
  '/dashboard/cvs',
  '/dashboard/matching',
  '/dashboard/mock',
  '/dashboard/profile',
  '/dashboard/settings',
  '/dashboard/timeline',
] as const;

/**
 * Purges the Router Cache of every dashboard segment (plus the cache-tag
 * hook). Call this from any server action that mutates profile data, CVs,
 * analyses, matchings or the roadmap.
 */
export function revalidateDashboardData(): void {
  for (const path of DASHBOARD_PATHS) {
    revalidatePath(path);
  }
  // Next 16 signature: the "max" profile serves stale content while the
  // revalidation runs in the background (stale-while-revalidate) — the right
  // semantics for user-scoped dashboard data once tags become active.
  revalidateTag(DASHBOARD_CACHE_TAG, 'max');
}
