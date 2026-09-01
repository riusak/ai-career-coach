'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { LOCALE_COOKIE, routing } from '@/i18n/routing';
import type { AppLocale } from '@/i18n/routing';

import fr from '@/i18n/messages/fr.json';
import en from '@/i18n/messages/en.json';
import de from '@/i18n/messages/de.json';

/**
 * ForPro AI — reactive, persisted locale layer.
 *
 * next-intl remains the single translation engine (all `useTranslations`
 * hooks across the app stay untouched), but instead of receiving a frozen
 * `messages` object from the server layout, the `NextIntlClientProvider` is
 * re-fed from this client provider every time the active locale changes.
 *
 * - The first render matches the server locale (cookie resolution, default
 *   `fr`), so SSR/hydration never diverge (no flash of untranslated UI).
 * - Right after hydration an effect applies the persisted preference from
 *   `localStorage` (source of truth), falling back to the `NEXT_LOCALE`
 *   cookie — instantly translating the whole tree without a reload.
 * - `setLocale` swaps every bound `useTranslations` synchronously, writes
 *   the choice to `localStorage`, syncs the `NEXT_LOCALE` cookie (so future
 *   server renders — dashboard/admin/profile — stay aligned) and updates
 *   `<html lang>` for accessibility/SEO.
 */

export const LOCALE_STORAGE_KEY = 'forpro_locale';

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type Messages = typeof fr;

const DICTIONARIES: Record<AppLocale, Messages> = {
  fr,
  en: en as unknown as Messages,
  de: de as unknown as Messages,
};

const VALID_LOCALES = routing.locales as readonly string[];

function isAppLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value && VALID_LOCALES.includes(value));
}

function readStoredLocale(): AppLocale | null {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isAppLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

function readCookieLocale(): AppLocale | null {
  try {
    const match = document.cookie
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`));
    if (!match) {
      return null;
    }
    const value = match.slice(LOCALE_COOKIE.length + 1);
    return isAppLocale(value) ? value : null;
  } catch {
    return null;
  }
}

interface LocaleContextValue {
  /** Active UI locale (reactive). */
  locale: AppLocale;
  /** Switch locale instantly: re-renders the tree, persists to localStorage
   *  and syncs the `NEXT_LOCALE` cookie + `<html lang>`. */
  setLocale: (next: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  serverLocale,
  children,
}: {
  serverLocale: AppLocale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(serverLocale);

  const applyLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode / quota) — cookie still persists.
    }
    try {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    } catch {
      // Cookie blocked — locale still applies for this session.
    }
    document.documentElement.lang = next;
  }, []);

  const contextValue = useMemo(
    () => ({ locale, setLocale: applyLocale }),
    [locale, applyLocale]
  );

    // Handoff: after hydration, apply the persisted language. Runs once — on a
  // hard reload the server layout already re-rendered with the cookie locale,
  // so this only fires when the visitor's localStorage preference differs.
  useEffect(() => {
    const persisted = readStoredLocale() ?? readCookieLocale();
    if (persisted && persisted !== locale) {
      // After hydration we align the reactive client locale with the persisted
      // preference from localStorage. This single setState replaces the messages
      // fed to NextIntlClientProvider so the entire tree re-renders translated.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      applyLocale(persisted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LocaleContext.Provider value={contextValue}>
      <NextIntlClientProvider locale={locale} messages={DICTIONARIES[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocaleSwitcher(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocaleSwitcher must be used within <LocaleProvider>.');
  }
  return context;
}