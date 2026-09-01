/**
 * Shimmer skeleton primitive — mirrors the exact shape of incoming content
 * blocks (CV score cards, analysis breakdown) instead of generic spinners.
 * Uses the shared `animate-shimmer` utility (navy-tinted sweep) from
 * globals.css. Compose several <Skeleton />s to sketch the loading layout.
 */

interface SkeletonProps {
  /** Shape classes: h-*, w-*, rounded-* (rounded-lg by default). */
  className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-shimmer rounded-lg ${className}`}
    />
  );
}
