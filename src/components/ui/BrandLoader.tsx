import Image from 'next/image';

/**
 * Branded loading indicator — built to the ForPro AI design specifications:
 * an orange→navy gradient arc (brand colors #D88318 → #101F32) sweeping
 * around the official logo mark on a white tile. Replaces every generic
 * spinner across the app. Honors prefers-reduced-motion.
 */

interface BrandLoaderProps {
  /** Diameter in pixels (default 64). */
  size?: number;
  /** Optional helper text rendered below the mark. */
  label?: string;
  /** 'onDark' adapts track/label colors for dark overlays. */
  variant?: 'light' | 'onDark';
}

export default function BrandLoader({
  size = 64,
  label,
  variant = 'light',
}: BrandLoaderProps) {
  const trackClass = variant === 'onDark' ? 'stroke-white/20' : 'stroke-navy-100';
  const labelClass = variant === 'onDark' ? 'text-navy-100' : 'text-navy-600';

  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Soft brand-orange pulse glow behind the mark */}
        <div
          aria-hidden="true"
          className="animate-pulse absolute -inset-2 rounded-full bg-orange-300/30 blur-lg"
        />
        {/* Rotating brand gradient arc */}
        <svg
          viewBox="0 0 64 64"
          aria-hidden="true"
          className="animate-spin relative h-full w-full motion-reduce:animate-none"
          style={{ animationDuration: '1.4s' }}
        >
          <defs>
            <linearGradient id="forpro-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D88318" />
              <stop offset="100%" stopColor="#101F32" />
            </linearGradient>
          </defs>
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            strokeWidth="4"
            className={trackClass}
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            stroke="url(#forpro-ring-gradient)"
            strokeDasharray="132"
            strokeDashoffset="88"
          />
        </svg>
        {/* Monogram core — official logo on its white tile */}
        <div className="absolute inset-[20%] flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-navy-100">
          <Image
            src="/branding/logo-contracted-light.png"
            alt=""
            aria-hidden="true"
            width={28}
            height={28}
            priority
            className="h-full w-auto object-contain"
          />
        </div>
      </div>
      {label && <p className={`text-sm font-medium ${labelClass}`}>{label}</p>}
    </div>
  );
}
