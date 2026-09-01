/**
 * Celebratory / reassuring confirmation banner shown when an operation
 * completes successfully. Server-component friendly.
 * "Navy & Orange" styling with a soft green accent for positive feedback.
 */

interface SuccessBannerProps {
  title: string;
  description?: string;
}

export default function SuccessBanner({ title, description }: SuccessBannerProps) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4"
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-slate-950 shadow-sm"
      >
        ✓
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      </div>
    </div>
  );
}