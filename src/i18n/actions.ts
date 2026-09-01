'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LOCALE_COOKIE, routing, type AppLocale } from '@/i18n/routing';

/**
 * Set the active UI locale via the `NEXT_LOCALE` cookie then bounce back to
 * the caller-supplied URL. Safe to invoke from a `<form action={…}>` in the
 * navbar language switcher — no client JS required.
 */
export async function switchLocaleAction(formData: FormData) {
  const next = formData.get('next')?.toString() || '/';
  const requested = formData.get('locale')?.toString();

  if (requested && (routing.locales as readonly string[]).includes(requested)) {
    const store = await cookies();
    store.set({
      name: LOCALE_COOKIE,
      value: requested,
      path: '/',
      sameSite: 'lax',
      maxAge: routing.localeCookie && typeof routing.localeCookie !== 'boolean'
        ? routing.localeCookie.maxAge ?? 60 * 60 * 24 * 365
        : 60 * 60 * 24 * 365,
    });
  }

  const url = next.startsWith('/') ? next : '/';
  redirect(url);
}

export type { AppLocale };