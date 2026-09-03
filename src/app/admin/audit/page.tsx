import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import Pagination from '@/components/admin/Pagination';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { listAuditLogs } from '@/lib/admin/audit';
import { formatDateTime, truncateMiddle } from '@/lib/admin/utils';
import { parsePositiveInt } from '@/lib/admin/utils';

export const metadata = {
  title: 'Audit log — Admin | ForPro AI',
  description: 'Full history of privileged admin actions.',
};

const PAGE_SIZE = 25;

const TH =
  'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-navy-500';
const TD = 'px-4 py-2 align-top text-sm text-navy-900';

interface AdminAuditPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Renders the structured audit payload as a compact, readable JSON snippet. */
function PayloadPreview({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload || Object.keys(payload).length === 0) {
    return <span className="text-navy-400">—</span>;
  }
  const text = JSON.stringify(payload);
  const isLong = text.length > 240;

  return (
    <pre
      className="max-w-xs max-w-[220px] overflow-x-auto rounded-md border border-navy-100 bg-brand-bg px-2 py-1.5 text-xs text-navy-800"
      title={text}
    >
      {isLong ? `${text.slice(0, 234)}…` : text}
    </pre>
  );
}

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  const [sp, t] = await Promise.all([searchParams, getTranslations('admin')]);
  const page = parsePositiveInt(
    typeof sp.page === 'string' ? sp.page : undefined,
    1,
    10000
  );

  const result = await listAuditLogs({ page, pageSize: PAGE_SIZE });

  if (!result) {
    return (
      <ErrorState
        title={t('audit.loadError')}
        description={t('audit.loadErrorDesc')}
      >
        <Link
          href="/admin/audit"
          className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
        >
          {t('common.retry')}
        </Link>
      </ErrorState>
    );
  }

  const buildHref = (nextPage: number) => `/admin/audit?page=${nextPage}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            {t('audit.title')}
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            {t('audit.subtitle', { total: result.total, page: result.page, totalPages: result.totalPages })}
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-md border border-navy-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 shadow-sm transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-800"
        >
          {t('users.back')}
        </Link>
      </div>

      {result.logs.length === 0 ? (
        <EmptyState
          icon="users"
          title={t('audit.noEntries')}
          description={t('audit.noEntriesDesc')}
        />
      ) : (
        <div className="-mx-1 overflow-x-auto rounded-xl border border-navy-100 bg-white">
          <table className="w-full">
            <thead className="bg-navy-50">
              <tr>
                <th className={TH}>{t('audit.date')}</th>
                <th className={TH}>{t('audit.actor')}</th>
                <th className={TH}>{t('audit.action')}</th>
                <th className={TH}>{t('audit.target')}</th>
                <th className={TH}>{t('audit.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {result.logs.map((log) => (
                <tr key={log.id}>
                  <td className={TD}>
                    <span className="whitespace-nowrap text-navy-500">
                      {formatDateTime(log.created_at)}
                    </span>
                  </td>
                  <td className={TD}>
                    {log.actor_full_name
                      ? log.actor_full_name
                      : log.actor_id
                        ? `${log.actor_id.slice(0, 8)}…`
                        : '—'}
                  </td>
                  <td className={TD}>
                    <span className="font-medium text-navy-900">{log.action}</span>
                  </td>
                  <td className={TD}>
                    {log.target_type
                      ? `${log.target_type}${
                          log.target_id ? ` / ${truncateMiddle(log.target_id)}` : ''
                        }`
                      : '—'}
                  </td>
                  <td className={TD}>
                    <PayloadPreview payload={log.payload} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        totalItems={result.total}
        buildHref={buildHref}
      />
    </div>
  );
}
