import Link from 'next/link';

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
export default function Pagination({
  page,
  totalPages,
  totalItems,
  buildHref,
}: PaginationProps) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const baseBtn =
    'inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors';
  const disabledBtn =
    'inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-400';

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-500">
        Page <span className="font-medium text-slate-700">{page}</span>{' '}
        of <span className="font-medium text-slate-700">{totalPages}</span> —{' '}
        <span className="font-medium text-slate-700">{totalItems}</span> results
      </p>
      <nav className="flex items-center gap-2">
        {canPrev ? (
          <Link href={buildHref(page - 1)} className={baseBtn}>
            Previous
          </Link>
        ) : (
          <span className={disabledBtn} aria-disabled>
            Previous
          </span>
        )}
        <Link
          href={buildHref(page + 1)}
          className={canNext ? baseBtn : disabledBtn}
          aria-disabled={!canNext}
        >
          Next
        </Link>
      </nav>
    </div>
  );
}
