import type { DailyCount } from '@/types/admin';

/**
 * Lightweight animated bar chart (pure CSS — zero chart library) for the
 * admin overview: one bar per day, orange brand tone, navy peak, hover
 * tooltips, `prefers-reduced-motion` respected.
 */

interface BarChartProps {
  /** Daily buckets, oldest → newest (typically 14 entries). */
  data: DailyCount[];
  /** Accessible description of what the chart shows. */
  ariaLabel: string;
  /** Bar tone: brand orange (default) or navy. */
  tone?: 'orange' | 'navy';
}

function dayLabel(iso: string, index: number): string {
  // Label every other day to avoid crowding on small screens.
  if (index % 2 !== 0) {
    return '';
  }
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export default function BarChart({ data, ariaLabel, tone = 'orange' }: BarChartProps) {
  const max = Math.max(1, ...data.map((point) => point.count));
  const barTone = tone === 'orange' ? 'bg-orange-500' : 'bg-navy-700';
  const peakTone = tone === 'orange' ? 'bg-orange-600' : 'bg-navy-900';

  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <div className="flex h-40 items-end gap-1.5 sm:gap-2">
        {data.map((point, index) => {
          const height = Math.round((point.count / max) * 100);
          const isPeak = point.count === max && point.count > 0;
          return (
            <div
              key={point.date}
              className="group relative flex h-full flex-1 flex-col justify-end"
            >
              {/* Hover tooltip */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded bg-navy-900 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              >
                {point.count}
              </span>
              <div
                style={{
                  height: `${Math.max(height, point.count > 0 ? 5 : 2)}%`,
                  animationDelay: `${index * 30}ms`,
                }}
                className={`animate-grow-y w-full origin-bottom rounded-t-sm transition-opacity duration-200 group-hover:opacity-80 motion-reduce:animate-none ${
                  isPeak ? peakTone : point.count > 0 ? barTone : 'bg-navy-100'
                }`}
              />
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-2 flex gap-1.5 sm:gap-2">
        {data.map((point, index) => (
          <span key={point.date} className="flex-1 text-center text-[10px] text-navy-400">
            {dayLabel(point.date, index)}
          </span>
        ))}
      </div>
    </div>
  );
}
