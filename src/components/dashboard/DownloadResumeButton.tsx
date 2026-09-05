'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { getResumeDownloadUrlAction } from '@/app/dashboard/resume/actions';

interface DownloadResumeButtonProps {
  resumeId: string;
  fileName: string;
  label: string;
  errorLabel: string;
  className: string;
}

/**
 * Fetches a short-lived signed URL through the server action and triggers the
 * browser download. Shared by the CV preview modal and the /dashboard/cvs
 * management page.
 */
export default function DownloadResumeButton({
  resumeId,
  fileName,
  label,
  errorLabel,
  className,
}: DownloadResumeButtonProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setError(null);
    const url = await getResumeDownloadUrlAction(resumeId);
    if (!url) {
      setError(errorLabel);
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" onClick={() => void handleDownload()} className={className}>
        <Download className="h-3.5 w-3.5" />
        {label}
      </button>
      {error && (
        <span role="alert" className="mt-1 text-[11px] font-medium text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}