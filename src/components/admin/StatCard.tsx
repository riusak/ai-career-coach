import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  /** Small decorative note under the value, e.g. a delta or icon. */
  hint?: ReactNode;
  /** Adds the orange gradient top accent bar (highlighted KPIs). */
  accent?: boolean;
}

/**
 * Metric card for the admin overview — ForPro AI « Navy & Orange » design:
 * white surface, navy border, orange hover glow, optional gradient accent.
 */
export default function StatCard({ label, value, hint, accent = false }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-navy-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange hover:shadow-lg hover:shadow-orange-500/10 motion-reduce:transition-none motion-reduce:transform-none">
      {accent && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600"
        />
      )}
      <p className="text-xs font-medium uppercase tracking-wide text-navy-500">
        {label}
      </p>
      <div className="mt-2 text-2xl font-bold text-navy-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-navy-500">{hint}</div>}
    </div>
  );
}
