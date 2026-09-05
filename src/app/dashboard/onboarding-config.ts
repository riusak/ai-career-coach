/**
 * Shared config for the dashboard first-connection onboarding flow.
 * Kept OUT of the 'use server' module (Next.js forbids non-function exports
 * from server-action files) so both server components and actions can
 * reference the cookie name.
 */
export const ONBOARDING_COOKIE = 'forpro_onboarding_seen';