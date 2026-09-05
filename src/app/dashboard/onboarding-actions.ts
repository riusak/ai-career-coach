'use server';

import { cookies } from 'next/headers';
import { ONBOARDING_COOKIE } from '@/app/dashboard/onboarding-config';

/**
 * Onboarding persistence for the dashboard (Phase 3). Replaces the template's
 * localStorage with a lightweight cookie so the first-connection welcome /
 * product tour appears exactly once per browser, with no database write.
 */

/** Marks the onboarding as seen (called when the user closes or finishes it). */
export async function completeOnboardingAction(): Promise<void> {
  const store = await cookies();
  store.set(ONBOARDING_COOKIE, '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    ...(process.env.NODE_ENV === 'production' ? { secure: true } : {}),
  });
}

/** Removes the marker (used for demos/tests — not exposed in the UI). */
export async function resetOnboardingAction(): Promise<void> {
  const store = await cookies();
  store.delete(ONBOARDING_COOKIE);
}