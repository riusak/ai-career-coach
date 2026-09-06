import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  START_DASHBOARD_TOUR_EVENT,
  clearDashboardTourQueryParam,
  dispatchStartDashboardTour,
  hasDashboardTourQueryParam,
  startDashboardTour,
} from './tour-events';

describe('dashboard tour replay helpers', () => {
  afterEach(() => {
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('dispatches the replay event on the dashboard itself', () => {
    const listener = vi.fn();
    window.addEventListener(START_DASHBOARD_TOUR_EVENT, listener);
    startDashboardTour('/dashboard', vi.fn());
    window.removeEventListener(START_DASHBOARD_TOUR_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('routes to the ?tour=1 deep-link from any other page', () => {
    const navigate = vi.fn();
    startDashboardTour('/dashboard/matching', navigate);

    expect(navigate).toHaveBeenCalledWith('/dashboard?tour=1');
  });

  it('detects and clears the cross-page tour deep-link', () => {
    expect(hasDashboardTourQueryParam('?tour=1')).toBe(true);
    expect(hasDashboardTourQueryParam('')).toBe(false);
    expect(hasDashboardTourQueryParam('?other=1')).toBe(false);

    window.history.replaceState(null, '', '/dashboard?tour=1&cv=abc');
    clearDashboardTourQueryParam();
    expect(window.location.search).toBe('?cv=abc');
  });

  it('dispatchStartDashboardTour fires the event', () => {
    const listener = vi.fn();
    window.addEventListener(START_DASHBOARD_TOUR_EVENT, listener);
    dispatchStartDashboardTour();
    window.removeEventListener(START_DASHBOARD_TOUR_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
