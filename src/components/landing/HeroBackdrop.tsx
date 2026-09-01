'use client';

import { useEffect, useRef } from 'react';

/**
 * Animated hero backdrop (ForPro AI « Navy & Orange »):
 * - Layer 0: static engineering grid.
 * - Layer 1 (deep parallax): ghost outlines of the contracted "FP" monogram
 *   and minimalist geometric nodes, slowly drifting via CSS keyframes.
 * - Layer 2 (soft parallax): the blurred brand orbs.
 *
 * Scroll-driven parallax is rAF-throttled and fully disabled under
 * `prefers-reduced-motion: reduce` (CSS drift keyframes are too — the global
 * stylesheet gates them behind a no-preference media query is not needed here
 * because the elements are purely decorative at ≤ 12% opacity).
 */
export default function HeroBackdrop() {
  const containerRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    /** Parallax only runs while the hero is (partially) on screen — the
     *  IntersectionObserver toggles this so the rAF loop stays idle once the
     *  section has scrolled away. */
    let inView = true;
    const apply = () => {
      if (!inView) return;
      const y = window.scrollY;
      if (midRef.current) {
        midRef.current.style.transform = `translate3d(0, ${(y * 0.16).toFixed(1)}px, 0)`;
      }
      if (frontRef.current) {
        frontRef.current.style.transform = `translate3d(0, ${(y * 0.07).toFixed(1)}px, 0)`;
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined' && containerRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          inView = entries.some((entry) => entry.isIntersecting);
          // Re-sync transforms immediately when the hero re-enters the view.
          if (inView) {
            onScroll();
          }
        },
        { threshold: 0 },
      );
      observer.observe(containerRef.current);
    }
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Layer 0 — static engineering grid */}
      <div className="bg-grid-navy absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />

      {/* Layer 1 — deep parallax: ghost "FP" monograms + geometric nodes */}
      <div ref={midRef} className="absolute inset-0 will-change-transform">
        <span className="animate-drift absolute left-[3%] top-24 font-sans text-[9rem] font-extrabold leading-none tracking-tight text-transparent opacity-[0.07] [-webkit-text-stroke:2px_#101F32] [animation-duration:22s]">
          FP
        </span>
        <span className="animate-drift absolute right-[8%] top-[30rem] hidden font-sans text-[7rem] font-extrabold leading-none tracking-tight text-transparent opacity-[0.06] [-webkit-text-stroke:2px_#101F32] [animation-delay:6s] [animation-duration:26s] lg:block">
          FP
        </span>
        {/* Concentric node — minimalist, stroke-only */}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          className="animate-drift absolute left-[16%] top-[36rem] h-28 w-28 text-navy-900 opacity-[0.08] [animation-delay:3s] [animation-duration:24s]"
        >
          <circle cx="50" cy="50" r="40" />
          <circle cx="50" cy="50" r="24" />
          <circle cx="50" cy="50" r="6" fill="currentColor" stroke="none" />
        </svg>
        {/* Rounded square node — echoes the brand's rounded containers */}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          className="animate-drift absolute right-[22%] top-40 h-20 w-20 text-orange-500 opacity-[0.14] [animation-delay:9s] [animation-duration:20s]"
        >
          <rect x="20" y="20" width="60" height="60" rx="14" />
          <circle cx="50" cy="50" r="6" fill="currentColor" stroke="none" />
        </svg>
      </div>

      {/* Layer 2 — soft parallax: brand orbs */}
      <div ref={frontRef} className="absolute inset-0 will-change-transform">
        <div className="animate-float-slow absolute -top-32 right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-orange-200/60 to-orange-100/10 blur-3xl" />
        <div className="animate-float-slow absolute -left-32 top-72 h-96 w-96 rounded-full bg-gradient-to-br from-navy-200/50 to-navy-100/10 blur-3xl [animation-delay:4s]" />
      </div>
    </div>
  );
}
