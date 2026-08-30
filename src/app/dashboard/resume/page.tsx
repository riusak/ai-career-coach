import Link from 'next/link';
import ResumeUploader from './ResumeUploader';
import ConfirmSubmitButton from './ConfirmSubmitButton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import {
  deleteResumeAction,
  setPrimaryResumeAction,
  unsetPrimaryResumeAction,
  updateResumeLabelAction,
} from './actions';
import { getUserResumes } from '@/lib/supabase/resumes';
import type { Resume } from '@/types/resume';

export const metadata = {
  title: 'My Resume | AI Career Coach',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function ResumeCard({ resume }: { resume: Resume }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{resume.file_name}</p>
            {resume.is_primary && (
              <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-800">
                ⭐ Primary
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                resume.parsed_content
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {resume.parsed_content ? 'Parsed' : 'Pending parse'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Uploaded {formatDateTime(resume.created_at)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {resume.label ? `Label: ${resume.label}` : 'No label yet.'}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/resume/${resume.id}`}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-800"
          >
            Open preview
          </Link>
          {resume.is_primary ? (
            <form action={unsetPrimaryResumeAction}>
              <input type="hidden" name="resumeId" value={resume.id} />
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                Remove primary
              </button>
            </form>
          ) : (
            <form action={setPrimaryResumeAction}>
              <input type="hidden" name="resumeId" value={resume.id} />
              <button
                type="submit"
                className="rounded-md border border-gold-400 bg-gold-50 px-3 py-1.5 text-xs font-semibold text-gold-800 shadow-sm transition-colors hover:bg-gold-100"
              >
                Set as primary ⭐
              </button>
            </form>
          )}
          <form action={deleteResumeAction}>
            <input type="hidden" name="resumeId" value={resume.id} />
            <ConfirmSubmitButton
              label="Delete"
              confirmMessage={`Delete "${resume.file_name}"? Its analysis history will be removed too.`}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            />
          </form>
        </div>
      </div>

      <form
        action={updateResumeLabelAction}
        className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center"
      >
        <input type="hidden" name="resumeId" value={resume.id} />
        <label
          htmlFor={`label-${resume.id}`}
          className="shrink-0 text-xs font-medium text-slate-600"
        >
          Label / category
        </label>
        <input
          id={`label-${resume.id}`}
          name="label"
          type="text"
          maxLength={80}
          defaultValue={resume.label ?? ''}
          placeholder="e.g. Backend roles — FR"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600 sm:flex-1"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-800"
        >
          Save label
        </button>
      </form>
    </li>
  );
}

export default async function ResumePage() {
  const { data: resumes, error } = await getUserResumes();
  const resumeList = resumes ?? [];

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Resume
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your CV catalogue, choose your primary CV (⭐), and analyze it when you are
            ready.
          </p>
        </div>

        {error && (
          <ErrorState
            title="Impossible de charger vos CVs"
            description={error}
          >
            <Link
              href="/dashboard/resume"
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
            >
              Réessayer
            </Link>
          </ErrorState>
        )}

        <div id="upload" className="scroll-mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Upload a resume
          </h2>
          <p className="mt-1 mb-6 text-sm text-slate-600">
            Accepted formats: PDF or TXT, up to 5 MB. Files are stored privately and only visible
            to you. You will be able to preview it before launching any analysis.
          </p>
          <ResumeUploader />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Resume catalogue
            </h2>
            <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-800">
              {resumeList.length} {resumeList.length === 1 ? 'CV' : 'CVs'}
            </span>
          </div>
          {resumeList.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {resumeList.map((resume) => (
                <ResumeCard key={resume.id} resume={resume} />
              ))}
            </ul>
          ) : error ? (
            <p className="mt-4 text-sm text-slate-500">Resumes could not be loaded.</p>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon="document"
                title="Votre catalogue est vide"
                description="Téléversez votre premier CV (PDF ou TXT, 5 Mo max) pour le prévisualiser, le désigner comme CV par défaut et lancer une analyse complète quand vous êtes prêt."
                action={
                  <Link
                    href="#upload"
                    className="rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600"
                  >
                    Ajouter mon premier CV
                  </Link>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
