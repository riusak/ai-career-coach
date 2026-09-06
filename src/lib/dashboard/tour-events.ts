/**
 * Global dashboard tour replay (Chart 7). The spotlight tour targets
 * dashboard-only elements (sidebar entries, quick actions, roadmap…), so any
 * page can REQUEST it: on the dashboard it starts immediately through a
 * window event; elsewhere the visitor is routed to /dashboard?tour=1 and the
 * dashboard auto-starts the tour on arrival (and cleans the URL).
 */

export const START_DASHBOARD_TOUR_EVENT = 'forpro:start-dashboard-tour';

export const DASHBOARD_TOUR_QUERY_PARAM = 'tour';

/** Fires the in-page replay event consumed by the dashboard view. */
export function dispatchStartDashboardTour(): void {
  window.dispatchEvent(new CustomEvent(START_DASHBOARD_TOUR_EVENT));
}

/**
 * Single entry point behind every « Relancer le tour global » trigger
 * (header « Visite guidée » button, page guides' « Tour Global » button).
 * Works at any time — even long after the onboarding was completed.
 */
export function startDashboardTour(
  pathname: string,
  navigate: (href: string) => void
): void {
  if (pathname === '/dashboard') {
    dispatchStartDashboardTour();
    return;
  }
  navigate(`/dashboard?${DASHBOARD_TOUR_QUERY_PARAM}=1`);
}

/** True when the current URL carries the cross-page tour deep-link. */
export function hasDashboardTourQueryParam(search: string): boolean {
  return new URLSearchParams(search).get(DASHBOARD_TOUR_QUERY_PARAM) === '1';
}

/** Strips the tour deep-link from the URL without a navigation. */
export function clearDashboardTourQueryParam(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(DASHBOARD_TOUR_QUERY_PARAM)) {
      return;
    }
    url.searchParams.delete(DASHBOARD_TOUR_QUERY_PARAM);
    window.history.replaceState(null, '', url.toString());
  } catch {
    // URL manipulation unavailable — the harmless param simply stays.
  }
}
