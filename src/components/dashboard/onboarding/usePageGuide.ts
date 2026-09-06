'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  readPageGuideVisible,
  writePageGuideVisible,
  type PageGuideKey,
} from '@/lib/dashboard/page-guide';

interface PageGuideState {
  /** Whether the guide banner is currently shown (hidden by default). */
  visible: boolean;
  /** Reveals the guide and persists the choice. */
  show: () => void;
  /** Hides the guide (same as dismissing the banner) and persists it. */
  hide: () => void;
  /** Header-toggle handler: flips visibility and persists the choice. */
  toggle: () => void;
}

/**
 * Reusable state helper for the dashboard pages' onboarding guides
 * (Chart 7). Guides are hidden by default in day-to-day usage — the first
 * client render always matches the server render (hidden) — and the reveal
 * choice survives reloads through localStorage. Pair with PageGuideToggle
 * (header trigger) and PageOnboardingGuide (banner).
 */
export function usePageGuide(page: PageGuideKey): PageGuideState {
  const [visible, setVisible] = useState(false);

  // Hydrate the persisted preference once after mount. Only an explicit
  // stored « 1 » reveals the guide, so first visits stay hidden by default.
  useEffect(() => {
    if (readPageGuideVisible(page)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
  }, [page]);

  const show = useCallback(() => {
    setVisible(true);
    writePageGuideVisible(page, true);
  }, [page]);

  const hide = useCallback(() => {
    setVisible(false);
    writePageGuideVisible(page, false);
  }, [page]);

  const toggle = useCallback(() => {
    const next = !visible;
    setVisible(next);
    writePageGuideVisible(page, next);
  }, [page, visible]);

  return { visible, show, hide, toggle };
}
