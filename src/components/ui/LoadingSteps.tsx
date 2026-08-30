'use client';

/**
 * "Billet d'attente" — step-by-step progress feedback for long operations
 * (perceived performance pattern). Completed steps show a gold check, the
 * active step pulses with a spinner, upcoming steps stay dimmed. A gold
 * progress bar reinforces the sense of forward motion.
 */

interface LoadingStepsProps {
  steps: readonly string[];
  activeIndex: number;
  label?: string;
}

export default function LoadingSteps({ steps, activeIndex, label }: LoadingStepsProps) {
  const progress = Math.round(((activeIndex + 1) / steps.length) * 100);

  return (
    <div aria-live="polite" className="w-full">
      {label && (
        <p className="text-center text-sm font-semibold text-slate-900">{label}</p>
      )}

      {/* Progress bar */}
      <div
        className="mx-auto mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gold-100"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-500 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="mx-auto mt-5 max-w-xs space-y-2.5 text-left">
        {steps.map((step, index) => {
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;
          return (
            <li key={step} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                  isDone
                    ? 'bg-gold-500 text-slate-950'
                    : isActive
                      ? 'bg-gold-100 text-gold-700'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? (
                  '✓'
                ) : isActive ? (
                  <svg
                    className="h-3 w-3 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-90"
                      fill="currentColor"
                      d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={`text-sm transition-colors ${
                  isDone
                    ? 'text-slate-400 line-through decoration-gold-300'
                    : isActive
                      ? 'font-semibold text-slate-900'
                      : 'text-slate-400'
                }`}
              >
                {step}
                {isActive && <span className="animate-pulse">…</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}