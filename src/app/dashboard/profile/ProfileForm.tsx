'use client';

import { useActionState } from 'react';
import type { Profile } from '@/types/profile';
import { updateProfileAction, type ProfileFormState } from './actions';

interface ProfileFormProps {
  initialProfile: Profile | null;
}

export default function ProfileForm({ initialProfile }: ProfileFormProps) {
  const initialState: ProfileFormState = {
    success: false,
    message: null,
    data: initialProfile,
  };

  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  const profile = state.data ?? initialProfile;

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div
          role={state.success ? 'status' : 'alert'}
          className={`rounded-lg border p-4 text-sm ${
            state.success
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {state.message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-slate-900"
          >
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            defaultValue={profile?.full_name ?? ''}
            disabled={isPending}
            placeholder="e.g. Alex Johnson"
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600 disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="headline"
            className="block text-sm font-medium text-slate-900"
          >
            Professional Headline
          </label>
          <input
            type="text"
            id="headline"
            name="headline"
            defaultValue={profile?.headline ?? ''}
            disabled={isPending}
            placeholder="e.g. Senior Software Engineer specializing in Distributed Systems"
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600 disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-slate-900"
          >
            Bio & Background
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={5}
            defaultValue={profile?.bio ?? ''}
            disabled={isPending}
            placeholder="Briefly describe your career journey, key achievements, and future ambitions..."
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
}
