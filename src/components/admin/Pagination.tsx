import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  /** Builds the href for a given page number (preserving other query params). */
  buildHref: (page: number) => string;
}

/**
 * Server-component pagination bar (Next.js `<Link>` based → no JS required).
 * Disabled states are real, non-interactive `<span>`s so they cannot be
 * followed with an empty request.
 */
export default async function Pagination({
  page,
  totalPages,
  totalItems,
  buildHref,
}: PaginationProps) {
  const t = await getTranslations('admin.common');
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const baseBtn =
    'inline-flex items-center justify-center rounded-md border border-navy-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 shadow-sm transition-colors';
  const disabledBtn =
    'inline-flex items-center justify-center rounded-md border border-navy-100 bg-navy-50 px-3 py-1.5 text-sm font-medium text-navy-400';

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-navy-500">
        {t('pageOf', { page, totalPages, totalItems })}
      </p>
      <nav className="flex items-center gap-2">
        {canPrev ? (
          <Link href={buildHref(page - 1)} className={baseBtn}>
            {t('previous')}
          </Link>
        ) : (
          <span className={disabledBtn} aria-disabled>
            {t('previous')}
          </span>
        )}
        <Link
          href={buildHref(page + 1)}
          className={canNext ? baseBtn : disabledBtn}
          aria-disabled={!canNext}
        >
          {t('next')}
        </Link>
      </nav>
    </div>
  );
}
