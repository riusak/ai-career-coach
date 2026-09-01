'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';

/**
 * Shared shell for the ForPro AI auth pages: decorative navy/orange backdrop
 * (engineering grid + floating brand orbs), an animated entrance on every
 * page load / refresh, and a floating glass card carrying the official brand
 * mark. Presentational only — rendered inside the `use client` auth pages, so
 * it is itself a Client Component and reads translations via the
 * `useTranslations` hook (from the root NextIntlClientProvider) instead of the
 * server-only `getTranslations`.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-bg px-4 py-12 sm:px-6 lg:px-8">
      {/* Decorative backdrop */}
      <div
        aria-hidden="true"
        className="bg-grid-navy pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="animate-float-slow pointer-events-none absolute -top-24 right-[-5rem] h-96 w-96 rounded-full bg-gradient-to-br from-orange-200/50 to-orange-100/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="animate-float-slow pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-gradient-to-br from-navy-200/40 to-navy-100/10 blur-3xl [animation-delay:4s]"
      />

      {/* Ghost "FP" monogram outlines — same visual language as the landing
          hero backdrop (HeroBackdrop.tsx) but slightly larger, gracefully
          framing the form card on either side. Purely decorative: transparent
          text with a navy stroke, ≤ 8% opacity, pointer-events-none, and the
          shared `animate-drift` keyframes. The left instance hides on small
          screens so it never collides with the centered card. */}
      <span className="animate-drift pointer-events-none absolute left-[2%] top-[16%] hidden font-sans text-[11rem] font-extrabold leading-none tracking-tight text-transparent opacity-[0.08] [-webkit-text-stroke:2.5px_#101F32] [animation-duration:26s] lg:block">
        FP
      </span>
      <span className="animate-drift pointer-events-none absolute right-[3%] bottom-[8%] hidden font-sans text-[9rem] font-extrabold leading-none tracking-tight text-transparent opacity-[0.07] [-webkit-text-stroke:2.5px_#101F32] [animation-delay:7s] [animation-duration:30s] lg:block">
        FP
      </span>
      {/* Smaller top-right instance — keeps the brand presence on tablets. */}
      <span className="animate-drift pointer-events-none absolute right-[4%] top-[10%] hidden font-sans text-[7.5rem] font-extrabold leading-none tracking-tight text-transparent opacity-[0.06] [-webkit-text-stroke:2px_#101F32] [animation-delay:3s] [animation-duration:24s] md:block lg:hidden">
        FP
      </span>

      {/* Floating "Return to Home" glassmorphism pill — smooth arrow glide
          on hover (BkIt/Kokonut-inspired micro-interaction). */}
      <Link
        href="/"
        className="group fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-4 py-2 text-sm font-semibold text-navy-800 shadow-md shadow-navy-900/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-white/85 hover:text-navy-900 hover:shadow-lg sm:left-6 sm:top-6 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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
          className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {tNav('home')}
      </Link>

      {/* Language switcher — instant, persisted (localStorage + cookie) */}
      <div className="fixed right-4 top-4 z-[60] sm:right-6 sm:top-6">
        <LocaleSwitcher />
      </div>

      {/* Animated entrance (page refresh / first navigation) */}
      <div className="animate-fade-up relative w-full max-w-md">
        <div className="rounded-2xl border border-navy-100/80 bg-white/85 p-8 shadow-2xl shadow-navy-900/10 backdrop-blur-xl">
          {/* Brand header — official logo per src/assets/branding specs */}
          <div className="mb-6 flex flex-col items-center">
            <Image
              src="/branding/logo-contracted-light.png"
              alt={`${tCommon('appName')} logo`}
              width={44}
              height={44}
              priority
              className="h-11 w-auto rounded-xl object-contain"
            />
            <div
              aria-hidden="true"
              className="mt-3 h-1 w-12 rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
