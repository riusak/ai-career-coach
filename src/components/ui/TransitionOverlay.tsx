import BrandLoader from '@/components/ui/BrandLoader';

/**
 * Full-screen route-transition overlay (perceived performance pattern):
 * covers the page with a brand-themed scrim + BrandLoader while a client
 * navigation is in flight (e.g. after a successful login/signup, until the
 * next route renders). Purely presentational; mounted by client pages.
 */

interface TransitionOverlayProps {
  show: boolean;
  label?: string;
}

export default function TransitionOverlay({ show, label }: TransitionOverlayProps) {
  if (!show) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-up fixed inset-0 z-[100] flex flex-col items-center justify-center bg-navy-950/70 backdrop-blur-sm"
    >
      <div className="animate-fade-up rounded-3xl bg-navy-900/60 px-10 py-8 shadow-2xl ring-1 ring-white/10">
        <BrandLoader size={72} variant="onDark" label={label} />
      </div>
    </div>
  );
}
