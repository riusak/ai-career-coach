import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  /** Small decorative note under the value, e.g. a delta or icon. */
  hint?: ReactNode;
}

/**
 * Metric card for the admin overview, echoing the dashboard StatCard style in
 * the "Light & Gold" design system (clean white surface, subtle border).
 */
export default function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
