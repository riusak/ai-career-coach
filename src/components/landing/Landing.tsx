'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/landing/Navbar';
import HeroBackdrop from '@/components/landing/HeroBackdrop';
import QuickTestFunnel from '@/components/landing/QuickTestFunnel';
import Reveal from '@/components/ui/Reveal';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';

/**
 * Client-side landing page (ForPro AI « Navy & Orange » aesthetic).
 *
 * Rendered by the server shell `src/app/page.tsx`, which only resolves the
 * visitor's auth state. Every translatable string flows through the reactive
 * next-intl hooks (fed by `LocaleProvider`), so switching the language from
 * the navbar translates the entire page instantly — hero, services, pricing,
 * about and footer — without a reload.
 */

type ServiceIcon = 'scan' | 'target' | 'mic' | 'library';

const SERVICES: ReadonlyArray<{
  titleKey: string;
  descriptionKey: string;
  locked: boolean;
  icon: ServiceIcon;
  featured?: boolean;
}> = [
  {
    titleKey: 'servicesCards.analyzeTitle',
    descriptionKey: 'servicesCards.analyzeDesc',
    locked: false,
    icon: 'scan',
    featured: true,
  },
  {
    titleKey: 'servicesCards.matchingTitle',
    descriptionKey: 'servicesCards.matchingDesc',
    locked: true,
    icon: 'target',
  },
  {
    titleKey: 'servicesCards.interviewTitle',
    descriptionKey: 'servicesCards.interviewDesc',
    locked: true,
    icon: 'mic',
  },
  {
    titleKey: 'servicesCards.libraryTitle',
    descriptionKey: 'servicesCards.libraryDesc',
    locked: true,
    icon: 'library',
  },
];
const SERVICE_ICONS: Record<ServiceIcon, ReactNode> = {
  scan: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  ),
  target: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  mic: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
    </svg>
  ),
  library: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
};

/** Footer navigation mirrors the main navbar anchors + labels exactly. */
const FOOTER_NAV_KEYS = [
  { href: '#accueil', key: 'home' },
  { href: '#services', key: 'services' },
  { href: '#billing', key: 'billing' },
  { href: '#a-propos', key: 'about' },
] as const;

interface LandingProps {
  isAuthenticated: boolean;
}
export default function Landing({ isAuthenticated }: LandingProps) {
  const t = useTranslations('landing');
  const tNav = useTranslations('nav');
  const tFooter = useTranslations('footer');
  const tCommon = useTranslations('common');

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg text-navy-900">
      <Navbar isAuthenticated={isAuthenticated} />

      <main className="flex-1">
        {/* Hero — direct value proposition + Quick Test funnel */}
        <section id="accueil" className="relative overflow-hidden">
          {/* Decorative backdrop: grid + parallax FP monograms/nodes + orbs */}
          <HeroBackdrop />

          <div className="relative mx-auto grid max-w-7xl 2xl:max-w-screen-2xl items-center gap-12 px-4 pb-24 pt-32 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div className="text-center lg:text-left">
              <Reveal>
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-orange-800 shadow-sm backdrop-blur-sm">
                  <span aria-hidden="true" className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                  </span>
                  {t('badge')}
                </div>
              </Reveal>

              <Reveal delay={100}>
                <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-navy-900 sm:text-5xl xl:text-6xl xl:leading-[1.05]">
                  {t('title')}{' '}
                  <span className="animate-gradient-pan bg-gradient-to-r from-orange-500 via-orange-600 to-navy-700 bg-clip-text text-transparent">
                    {t('titleAccent')}
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={200}>
                <p className="mx-auto mt-6 max-w-xl text-base text-navy-600 sm:text-lg lg:mx-0">
                  {t('subtitle')}
                </p>
              </Reveal>

              <Reveal delay={300}>
                <ul className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-navy-600 lg:mx-0 lg:justify-start">
                  {(['noSignup', 'instant', 'private'] as const).map((key) => (
                    <li key={key} className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="h-4 w-4 text-orange-500"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {t(`valueItems.${key}`)}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <Reveal delay={200}>
              <QuickTestFunnel isAuthenticated={isAuthenticated} />
            </Reveal>
          </div>
        </section>

        {/* Quick Test results — content is portaled here by QuickTestFunnel
            (client-side) so the hero stays completely stable: skeleton while
            analyzing, then the full-width bento report. */}
        <div id="quick-test-results-root" />
{/* Services — bento grid */}
        <section
          id="services"
          className="scroll-mt-28 border-t border-navy-100 bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
        >
          <div className="mx-auto max-w-7xl 2xl:max-w-screen-2xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">
                {t('servicesEyebrow')}
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
                {t('servicesTitle')}
              </h2>
              <p className="mt-4 text-base text-navy-600">{t('servicesSubtitle')}</p>
            </Reveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map((service, index) => (
                <Reveal
                  key={service.titleKey}
                  delay={((index % 3) * 100) as 0 | 100 | 200}
                  className={`h-full ${
                    service.featured || index === 3 ? 'sm:col-span-2 lg:col-span-2' : ''
                  }`}
                >
                  <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange hover:shadow-xl hover:shadow-orange-500/10 motion-reduce:transition-none motion-reduce:transform-none">
                    {/* Glow accent revealed on hover */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-orange-100/0 blur-2xl transition-colors duration-500 group-hover:bg-orange-100/70"
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white shadow-md transition-colors duration-300 group-hover:bg-orange group-hover:shadow-lg group-hover:shadow-orange-500/25">
                        {SERVICE_ICONS[service.icon]}
                      </div>
                      {service.locked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-semibold text-navy-500">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className="h-3 w-3"
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          {t('comingSoon')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-800">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className="h-3 w-3"
                          >
                            <path d="M15 2v2M15 20v2M9 2v2M9 20v2M2 9h2M2 15h2M20 9h2M20 15h2M2 12h2M20 12h2M12 2v2M12 20v2" />
                            <rect x="4" y="4" width="16" height="16" rx="2" />
                            <rect x="9" y="9" width="6" height="6" />
                          </svg>
                          {t('servicesAiBadge')}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-navy-900">
                      {t(service.titleKey)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-navy-600">
                      {t(service.descriptionKey)}
                    </p>
                    {service.locked && (
                      <p className="mt-auto pt-4 text-xs font-medium text-orange-700">
                        {t('unlockedWithFreeAccount')}
                      </p>
                    )}
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
{/* Tarifs (labelled consistently with the navbar, never « Billing ») */}
        <section id="billing" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                {tNav('billing')}
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {t('billingTitle')}
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {/* Free plan */}
              <div className="rounded-2xl border border-orange-300 bg-white p-8 shadow-md">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold text-slate-900">{t('planFreeName')}</h3>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                    {t('planCurrent')}
                  </span>
                </div>
                <p className="mt-3 text-4xl font-extrabold">
                  0 €
                  <span className="ml-1 text-sm font-medium text-slate-500">
                    {t('planFreeForever')}
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-slate-600">
                  <li>{t('planFreeFeature1')}</li>
                  <li>{t('planFreeFeature2')}</li>
                  <li className="flex items-center gap-1.5">
                    <Link
                      href="/signup"
                      className="font-medium text-orange-700 underline decoration-orange-300 underline-offset-2"
                    >
                      {t('billingCreateAccount')}
                    </Link>
                    {t('planUnlockSuffix')}
                  </li>
                  <li className="text-slate-500">{t('planFreeFeature3')}</li>
                  <li className="text-slate-500">{t('planFreeFeature4')}</li>
                  <li className="text-slate-500">{t('planFreeFeature5')}</li>
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 block rounded-lg bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-center text-sm font-bold text-slate-950 shadow-md transition-all hover:from-orange-500 hover:to-orange-600"
                >
                  {t('planFreeCta')}
                </Link>
              </div>

              {/* Premium plan (teaser) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-900 p-8 text-white shadow-md ring-1 ring-orange-500/40">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold">{t('planPremiumName')}</h3>
                  <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-semibold text-orange-300">
                    {t('planPremiumSoon')}
                  </span>
                </div>
                <p className="mt-3 text-4xl font-extrabold">
                  —
                  <span className="ml-1 text-sm font-medium text-slate-400">
                    {t('planComing')}
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-slate-300">
                  <li>{t('planPremiumFeature1')}</li>
                  <li>{t('planPremiumFeature2')}</li>
                  <li>{t('planPremiumFeature3')}</li>
                  <li>{t('planPremiumFeature4')}</li>
                </ul>
                <p className="mt-8 rounded-lg border border-slate-700 px-6 py-3 text-center text-sm font-semibold text-slate-400">
                  {t('planPremiumNotify')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* À propos + final CTA */}
        <section
          id="a-propos"
          className="scroll-mt-24 border-t border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
              {t('aboutEyebrow')}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {t('aboutTitle')}
            </h2>
            <p className="mt-4 text-base text-slate-600">{t('aboutText')}</p>

            {/* Official principal logo — displayed directly on the background,
                no card container, sized for real brand presence */}
            <div className="mt-10 flex justify-center">
              <Image
                src="/branding/logo-primary-light.png"
                alt={t('aboutLogoAlt')}
                width={560}
                height={163}
                className="h-20 w-auto object-contain sm:h-28"
              />
            </div>

            <div className="mt-10 flex justify-center">
              <Link
                href="/signup"
                className="rounded-lg bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition-all hover:from-orange-500 hover:to-orange-600"
              >
                {t('aboutCta')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer tNav={tNav} tFooter={tFooter} tCommon={tCommon} />
    </div>
  );
}
/** Social micro-links shown in the footer brand column. */
const SOCIAL_LINKS: ReadonlyArray<{
  href: string;
  labelKey: string;
  icon: ReactNode;
}> = [
  {
    href: 'https://github.com/riusak/ai-career-coach',
    labelKey: 'socialGithub',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.66.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
      </svg>
    ),
  },
  {
    href: 'https://www.linkedin.com/',
    labelKey: 'socialLinkedin',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
      </svg>
    ),
  },
  {
    href: 'https://x.com/',
    labelKey: 'socialX',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
        <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82L5 21.75H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z" />
      </svg>
    ),
  },
];

interface FooterProps {
  tNav: (key: string) => string;
  tFooter: (key: string) => string;
  tCommon: (key: string) => string;
}
/**
 * ForPro AI footer — sleek multi-column SaaS layout over the navy background.
 * Uses the high-contrast white monochrome logo (never the light-background
 * mark, never a white box) and mirrors the main navbar anchors verbatim.
 */
function Footer({ tNav, tFooter, tCommon }: FooterProps) {
  return (
    <footer className="border-t border-white/10 bg-navy-950 text-navy-200">
      <div className="mx-auto max-w-7xl 2xl:max-w-screen-2xl px-4 pb-8 pt-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-5">
            <Link href="#accueil" className="group inline-flex items-center gap-2.5">
              <Image
                src="/branding/logo-contracted-white.png"
                alt=""
                aria-hidden="true"
                width={40}
                height={40}
                className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
              />
              <span className="text-lg font-bold tracking-tight text-white">
                {tCommon('appName')}
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-300">
              {tFooter('tagline')}
            </p>

            {/* Social micro-interactions */}
            <div className="mt-6 flex items-center gap-2.5">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.labelKey}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={tFooter(social.labelKey)}
                  title={tFooter(social.labelKey)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-navy-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-400/60 hover:bg-orange-500/10 hover:text-orange-300 motion-reduce:transform-none"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation — matches the main navbar anchors & labels */}
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-400">
              {tFooter('navTitle')}
            </p>
            <ul className="mt-4 space-y-2.5">
              {FOOTER_NAV_KEYS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-sm text-navy-300 transition-colors hover:text-white"
                  >
                    <span className="h-px w-0 bg-orange-400 transition-all duration-300 group-hover:w-3 motion-reduce:transition-none" />
                    {tNav(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-400">
              {tFooter('accountTitle')}
            </p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-1 text-sm text-navy-300 transition-colors hover:text-white"
                >
                  <span className="h-px w-0 bg-orange-400 transition-all duration-300 group-hover:w-3 motion-reduce:transition-none" />
                  {tNav('signIn')}
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-1 text-sm text-navy-300 transition-colors hover:text-white"
                >
                  <span className="h-px w-0 bg-orange-400 transition-all duration-300 group-hover:w-3 motion-reduce:transition-none" />
                  {tNav('signUp')}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center gap-1 text-sm text-navy-300 transition-colors hover:text-white"
                >
                  <span className="h-px w-0 bg-orange-400 transition-all duration-300 group-hover:w-3 motion-reduce:transition-none" />
                  {tNav('dashboard')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-400">
              {tFooter('contactTitle')}
            </p>
            <a
              href={`mailto:${tFooter('contactEmail')}`}
              className="mt-4 inline-flex items-center gap-2 text-sm text-navy-300 transition-colors hover:text-white"
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
                className="h-4 w-4 text-orange-400"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 6L2 7" />
              </svg>
              {tFooter('contactEmail')}
            </a>
            <p className="mt-4 text-sm leading-relaxed text-navy-400">{tFooter('taglineCta')}</p>
          </div>
        </div>
{/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-navy-400">
            &copy; {new Date().getFullYear()} {tFooter('brand')}. {tFooter('rights')}.
          </p>
          <div className="flex items-center gap-4">
            <LocaleSwitcher />
            <Link
              href="#accueil"
              className="group inline-flex items-center gap-1.5 text-xs font-medium text-navy-400 transition-colors hover:text-orange-300"
            >
              {tFooter('backToTop')}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transform-none"
              >
                <path d="m18 15-6-6-6 6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}