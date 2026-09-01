'use client';

import { useActionState } from 'react';
import { analyzeResumeAction, type ResumeActionState } from '../actions';

interface AnalyzeResumeButtonProps {
  resumeId: string;
}

/**
 * Primary action of the preview view: explicitly queues a deep analysis for
 * the resume (nothing is analyzed automatically on upload).
 */
export default function AnalyzeResumeButton({ resumeId }: AnalyzeResumeButtonProps) {
  const initialState: ResumeActionState = { success: false, message: null };
  const [state, formAction, isPending] = useActionState(analyzeResumeAction, initialState);

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="resumeId" value={resumeId} />
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Queueing analysis…
            </>
          ) : (
            'Analyze my CV'
          )}
        </button>
      </form>
      {state.message && (
        <p
          role={state.success ? 'status' : 'alert'}
          className={`text-xs ${state.success ? 'text-green-700' : 'text-red-600'}`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}