import { defineRouting } from 'next-intl/routing';

/**
 * ForPro AI — supported locales.
 * - `fr` is the default UI (French-first product, per mvp.md).
 * - `en` and `de` are reactive client-side fallbacks (no URL prefix).
 *
 * Routing strategy: `localePrefix: 'never'` — the active locale lives only in
 * the `NEXT_LOCALE` cookie, so the existing URL scheme (`/`, `/dashboard`,
 * `/login`, etc.) is preserved and SEO/crawlers see a single canonical URL.
 */
export const routing = defineRouting({
  locales: ['fr', 'en', 'de'],
  defaultLocale: 'fr',
  localePrefix: 'never',
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365,
  },
});

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export type AppLocale = (typeof routing.locales)[number];

export const LOCALE_LABELS: Record<AppLocale, string> = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch',
};

export const LOCALE_FLAGS: Record<AppLocale, string> = {
  fr: 'FR',
  en: 'EN',
  de: 'DE',
};