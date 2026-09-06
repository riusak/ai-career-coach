'use client';

interface ScoreTier {
  label: string;
  count: number;
  color: string;
  bg: string;
}

interface ScoreDistributionChartProps {
  title: string;
  subtitle?: string;
  tiers: ScoreTier[];
  averageScore?: number | null;
  totalCount: number;
  className?: string;
}

export default function ScoreDistributionChart({
  title,
  subtitle,
  tiers,
  averageScore,
  totalCount,
  className = '',
}: ScoreDistributionChartProps) {
  const maxCount = Math.max(1, ...tiers.map((t) => t.count));

  return (
    <div className={`rounded-2xl border border-navy-100 bg-white p-5 sm:p-6 shadow-sm ${className}`}>
      <div className="flex items-start justify-between border-b border-navy-100/80 pb-3.5">
        <div>
          <h3 className="text-base font-bold text-navy-900">{title}</h3>
          {subtitle && <p className="text-xs text-navy-500 mt-0.5">{subtitle}</p>}
        </div>
        {typeof averageScore === 'number' && (
          <div className="text-right">
            <span className="text-xs text-navy-400 font-medium">Moyenne</span>
            <div className="text-lg font-extrabold text-navy-900">{averageScore} / 100</div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {tiers.map((tier) => {
          const percent = totalCount > 0 ? Math.round((tier.count / totalCount) * 100) : 0;
          const barWidth = Math.max(percent > 0 ? 8 : 2, Math.round((tier.count / maxCount) * 100));

          return (
            <div key={tier.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-navy-700">{tier.label}</span>
                <span className="font-mono text-navy-500">
                  {tier.count} <span className="text-[11px] text-navy-400">({percent}%)</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-navy-50">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%`, backgroundColor: tier.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
