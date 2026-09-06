import { redirect } from 'next/navigation';

/**
 * @deprecated The legacy resume catalogue was replaced by the template
 * standard CV library at /dashboard/cvs (4 KPI cards, drag & drop upload,
 * native preview modal). This page only exists to permanently redirect
 * stale links and bookmarks.
 */
export default function LegacyResumeCataloguePage() {
  redirect('/dashboard/cvs');
}
