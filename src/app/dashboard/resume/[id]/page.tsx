import Link from 'next/link';
import { notFound } from 'next/navigation';
import EmptyState from '@/components/ui/EmptyState';
import {
  createResumeSignedUrl,
  getLatestResumeAnalysis,
  getResumeById,
} from '@/lib/supabase/resumes';
import AnalyzeResumeButton from './AnalyzeResumeButton';
import LatestAnalysisCard from './LatestAnalysisCard';

export const metadata = {
  title: 'Resume preview | ForPro AI',
};

interface ResumePreviewPageProps {
  params: Promise<{ id: string }>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function ResumePreviewPage({ params }: ResumePreviewPageProps) {
  const { id } = await params;
  const { data: resume } = await getResumeById(id);

  // Unknown id, or a resume not owned by the caller (filtered by RLS) -> 404.
  if (!resume) {
    notFound();
  }

  const [{ data: signedUrl }, { data: latestAnalysis }] = await Promise.all([
    createResumeSignedUrl(resume.file_path),
    getLatestResumeAnalysis(resume.id),
  ]);

  const isPdf = resume.file_name.toLowerCase().endsWith('.pdf');

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard/resume"
              className="text-sm font-medium text-orange-700 transition-colors hover:text-orange-800"
            >
              &larr; Back to my resumes
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-navy-900">
                {resume.file_name}
              </h1>
              {resume.is_primary && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-3 w-3"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  CV principal
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  resume.parsed_content
                    ? 'bg-green-100 text-green-700'
                    : 'bg-navy-100 text-navy-600'
                }`}
              >
                {resume.parsed_content ? 'Validated · Parsed' : 'Uploaded · Pending parse'}
              </span>
            </div>
            {resume.label && <p className="mt-1 text-sm text-navy-500">{resume.label}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Document preview */}
          <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-navy-900">Document preview</h2>
            <div className="mt-4">
              {isPdf ? (
                signedUrl ? (
                  <iframe
                    src={signedUrl}
                    title={`Preview of ${resume.file_name}`}
                    className="h-[600px] w-full rounded-lg border border-navy-100"
                  />
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    The preview could not be loaded. You can still open the document from your
                    catalogue once parsing completes.
                  </p>
                )
              ) : resume.parsed_content ? (
                <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg border border-navy-100 bg-navy-50 p-4 text-xs text-navy-700">
                  {resume.parsed_content.raw_text}
                </pre>
              ) : (
                <EmptyState
                  icon="document"
                  title="Aperçu texte en attente"
                  description="Le texte de ce document sera disponible dès que le pipeline de parsing l’aura traité. Vous pouvez déjà lancer une analyse ou ouvrir le fichier depuis le catalogue."
                />
              )}
            </div>
          </div>

          {/* Metadata + actions sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-navy-900">Details</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-navy-500">Uploaded</dt>
                  <dd className="text-right text-navy-900">
                    {formatDateTime(resume.created_at)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-navy-500">Format</dt>
                  <dd className="text-navy-900">{isPdf ? 'PDF' : 'TXT'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-navy-500">Label</dt>
                  <dd className="text-right text-navy-900">{resume.label ?? 'None'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-navy-500">Validation</dt>
                  <dd className="text-navy-900">
                    {resume.parsed_content ? 'Parsed' : 'Pending parse'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-navy-900">Next steps</h2>
              <div className="mt-4 space-y-3">
                <AnalyzeResumeButton resumeId={resume.id} />
                <button
                  type="button"
                  disabled
                  title="Available in an upcoming sprint"
                  className="w-full cursor-not-allowed rounded-md border border-navy-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-600 opacity-60"
                >
                  Compare with a job offer
                </button>
                <button
                  type="button"
                  disabled
                  title="Available in an upcoming sprint"
                  className="w-full cursor-not-allowed rounded-md border border-navy-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-600 opacity-60"
                >
                  Prepare an interview
                </button>
                <p className="text-xs text-navy-500">
                  Job matching and interview simulations arrive in the next sprint.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Latest analysis — full-width section below the preview: shows the
            queued status chip while the pipeline runs, then the complete
            report (score ring, per-dimension breakdown, strengths/weaknesses,
            recommendations, expert advice) as soon as the result is polled. */}
        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900">Latest analysis</h2>
          <LatestAnalysisCard
            key={latestAnalysis?.id ?? 'none'}
            resumeId={resume.id}
            initialAnalysis={latestAnalysis}
          />
        </div>
      </div>
    </div>
  );
}