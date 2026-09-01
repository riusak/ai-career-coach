import { cookies } from 'next/headers';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { LOCALE_COOKIE, routing, type AppLocale } from './routing';

/**
 * Server-side request config: resolves the active locale (cookie > default)
 * and loads the matching JSON dictionary. Used by every Server Component
 * calling `useTranslations` / `getTranslations`.
 */
async function resolveLocale(): Promise<AppLocale> {
  try {
    const store = await cookies();
    const cookieLocale = store.get(LOCALE_COOKIE)?.value;
    if (cookieLocale && hasLocale(routing.locales, cookieLocale)) {
      return cookieLocale as AppLocale;
    }
  } catch {
    // cookies() throws in some RSC contexts — fall back to default.
  }
  return routing.defaultLocale as AppLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`./messages/${locale}.json`)).default;
  return {
    locale,
    messages,
  };
});