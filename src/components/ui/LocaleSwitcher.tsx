'use client';

import { useRef, useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useLocaleSwitcher } from '@/i18n/provider';
import { routing, LOCALE_LABELS, type AppLocale } from '@/i18n/routing';

/**
 * Compact locale dropdown wired to the reactive `LocaleProvider`: picking a
 * language re-renders every translated component instantly and persists the
 * choice to `localStorage` (+ `NEXT_LOCALE` cookie). No server round-trip.
 */
export default function LocaleSwitcher() {
  const current = useLocale() as AppLocale;
  const { setLocale } = useLocaleSwitcher();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const select = (next: AppLocale) => {
    setLocale(next);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={LOCALE_LABELS[current]}
        className="inline-flex items-center gap-1 rounded-lg border border-navy-100/70 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-navy-700 shadow-sm transition-colors hover:border-orange hover:bg-orange-50 hover:text-orange-800"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-3.5 w-3.5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="uppercase tracking-wide">{current}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="animate-fade-up absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-navy-100 bg-white py-1 shadow-lg shadow-navy-900/10"
        >
          {routing.locales.map((locale) => (
            <li key={locale}>
              <button
                type="button"
                onClick={() => select(locale)}
                disabled={locale === current}
                role="option"
                aria-selected={locale === current}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  locale === current
                    ? 'bg-orange-50 font-semibold text-orange-800'
                    : 'text-navy-700 hover:bg-navy-50'
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                <span>{LOCALE_LABELS[locale]}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-navy-400">
                  {locale}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}