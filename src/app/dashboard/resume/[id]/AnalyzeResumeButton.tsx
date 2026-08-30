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
          className="w-full rounded-md bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Queueing analysis...' : 'Analyze my CV'}
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