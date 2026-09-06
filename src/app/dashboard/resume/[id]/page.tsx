import { redirect } from 'next/navigation';

/**
 * @deprecated The standalone resume detail view was removed — CV previews now
 * open in the native CVPreviewModal overlay directly inside the CV library
 * (/dashboard/cvs). This page only exists to permanently redirect stale
 * deep links and bookmarks.
 */
export default function LegacyResumeDetailPage() {
  redirect('/dashboard/cvs');
}
