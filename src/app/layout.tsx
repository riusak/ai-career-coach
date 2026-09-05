import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import { LocaleProvider } from '@/i18n/provider';
import type { AppLocale } from '@/i18n/routing';
import './globals.css';

/**
 * Inter is the exclusive typeface of ForPro AI (headings, body, buttons, UI).
 * Self-hosted via next/font: zero layout shift, no external requests.
 * The `variable` option exposes it as --font-inter, wired into the Tailwind
 * v4 `--font-sans` theme token in globals.css.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/**
 * Plus Jakarta Sans is the design-system font of the « Career Dashboard »
 * template (forpro-ai-career-User-dashboard). It is exposed as
 * --font-plus-jakarta and applied to the dashboard shell so every page of
 * that area renders with the exact template typography.
 */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ForPro AI',
  description:
    'ForPro AI — coach de carrière assisté par IA : analyse de CV, matching d’offres d’emploi et simulations d’entretien.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale resolved by src/i18n/request.ts (cookie > default). The client
  // LocaleProvider hydrates with this value, then applies the persisted
  // localStorage preference without a reload.
  const locale = (await getLocale()) as AppLocale;

  return (
    <html lang={locale} className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="bg-brand-bg font-sans text-navy antialiased">
        <LocaleProvider serverLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}