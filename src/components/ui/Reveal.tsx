'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Scroll-driven reveal (Reactbits.dev-inspired): fades/slides its children in
 * the first time they enter the viewport, with an optional stagger delay.
 * Pure CSS transition + IntersectionObserver — no external animation library.
 * Honors prefers-reduced-motion via motion-reduce utilities.
 */

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in milliseconds (100 → .animation-delay-100 utility). */
  delay?: 0 | 100 | 200 | 300 | 400;
  /** Extra classes forwarded to the wrapper (layout helpers like col-span). */
  className?: string;
}

export default function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    // SSR / very old browsers: show content immediately (async so the render
    // pass stays pure — react-hooks/set-state-in-effect compliant).
    if (typeof IntersectionObserver === 'undefined') {
      const fallback = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(fallback);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${delay > 0 ? `animation-delay-${delay}` : ''} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
