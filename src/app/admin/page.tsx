import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MessageSquare } from 'lucide-react';
import BarChart from '@/components/admin/BarChart';
import StatCard from '@/components/admin/StatCard';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { getAdminStats } from '@/lib/admin/stats';
import { getFeedbackSummaryStats } from '@/lib/feedback/actions';
import { formatDateTime, formatPercent, truncateMiddle } from '@/lib/admin/utils';
import { QUICK_TEST_EVENT_TYPES, type QuickTestEventType } from '@/types/admin';



export const metadata = {
  title: 'Overview — Admin Dashboard | ForPro AI',
  description: 'Live metrics, user management and audit trail.',
};

const TABLE_TH =
  'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-navy-500';
const TABLE_TD = 'px-4 py-2 text-sm align-top';

/** Label + count + proportional bar cell for the funnel breakdown. */
function FunnelItem({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="rounded-xl border border-navy-100 bg-brand-bg p-3">
      <p className="text-xs uppercase tracking-wide text-navy-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-navy-900">{value}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-100">
        <div
          className="animate-grow-y h-full origin-left rounded-full bg-orange"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const [stats, feedbackStats, t] = await Promise.all([
    getAdminStats(),
    getFeedbackSummaryStats(),
    getTranslations('admin'),
  ]);

  const eventLabel = (eventType: QuickTestEventType): string =>
    t(`eventTypes.${eventType}`);

  if (!stats) {
    return (
      <ErrorState
        title={t('overview.metricsUnavailable')}
        description={t('overview.metricsUnavailableDesc')}
      >
        <Link
          href="/admin"
          className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
        >
          {t('overview.refresh')}
        </Link>
      </ErrorState>
    );
  }

  const funnelMax = Math.max(1, ...Object.values(stats.eventsByType));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-navy-600">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/feedback"
            className="flex items-center gap-2 rounded-md border border-navy-200 bg-white px-3.5 py-2 text-sm font-semibold text-navy-800 shadow-sm hover:bg-navy-50"
          >
            <MessageSquare className="h-4 w-4 text-orange" />
            <span>Retours ({feedbackStats.newCount} nouv.)</span>
          </Link>
          <Link
            href="/admin/users"
            className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600"
          >
            {t('overview.manageUsers')}
          </Link>
        </div>
      </div>

      {/* Feedback banner if there are new items */}
      {feedbackStats.newCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
            <p className="text-sm font-medium text-amber-900">
              <strong>{feedbackStats.newCount} nouveau(x) retour(s) utilisateur(s)</strong> en attente de traitement.
            </p>
          </div>
          <Link
            href="/admin/feedback?status=new"
            className="rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-2xs"
          >
            Voir les retours
          </Link>
        </div>
      )}

      {/* 1. KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent
          label={t('overview.registeredUsers')}
          value={stats.totalUsers}
          hint={t('overview.users30d', { count: stats.users30d })}
        />
        <StatCard
          label={t('overview.quickTests')}
          value={stats.totalEvents}
          hint={t('overview.events30d', { count: stats.events30d })}
        />
        <StatCard
          label={t('overview.analysesCompleted')}
          value={stats.analysesCompleted}
          hint="LLM + heuristic"
        />
        <StatCard
          label={t('overview.conversionRate')}
          value={formatPercent(stats.conversionRate)}
          hint={
            stats.signupRate30d === null
              ? '—'
              : `≈ ${formatPercent(stats.signupRate30d)}`
          }
        />
      </div>

      {/* 2. 14-day activity charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-navy-900">{t('overview.quickTestActivity')}</h2>
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-navy-400">
              {t('overview.last14Days')}
            </span>
          </div>
          <div className="mt-4">
            <BarChart
              data={stats.dailyEvents}
              tone="orange"
              ariaLabel={t('overview.dailyQtEvents')}
            />
          </div>
        </div>

        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-navy-900">{t('overview.newAccounts')}</h2>
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-navy-400">
              {t('overview.last14Days')}
            </span>
          </div>
          <div className="mt-4">
            <BarChart
              data={stats.dailyUsers}
              tone="navy"
              ariaLabel={t('overview.dailySignups')}
            />
          </div>
        </div>
      </div>

      {/* 3. Quick Test funnel */}
      <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900">{t('overview.funnel')}</h2>
        <p className="mt-1 text-sm text-navy-500">
          {t('overview.funnelDesc')}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_TEST_EVENT_TYPES.map((eventType) => (
            <FunnelItem
              key={eventType}
              label={eventLabel(eventType)}
              value={stats.eventsByType[eventType] ?? 0}
              max={funnelMax}
            />
          ))}
        </div>
      </div>

            {/* 3. Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 3a. Recent visitor Quick Test events */}
        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900">{t('overview.recentEvents')}</h2>
          {stats.recentEvents.length === 0 ? (
            <EmptyState
              icon="chart"
              title={t('overview.noEvents')}
              description=""
            />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={TABLE_TH}>{t('overview.date')}</th>
                    <th className={TABLE_TH}>{t('overview.action')}</th>
                    <th className={TABLE_TH}>{t('overview.source')}</th>
                    <th className={TABLE_TH}>{t('overview.score')}</th>
                    <th className={TABLE_TH} title={t('overview.ipHash')}>
                      {t('overview.visitor')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.recentEvents.map((event) => (
                    <tr key={event.id}>
                      <td className={TABLE_TD}>
                        <span className="whitespace-nowrap text-navy-500">
                          {formatDateTime(event.created_at)}
                        </span>
                      </td>
                      <td className={TABLE_TD}>
                        <span className="font-medium">{event.event_type}</span>
                      </td>
                      <td className={TABLE_TD}>{event.source}</td>
                      <td className={TABLE_TD}>{event.score ?? '—'}</td>
                      <td className={TABLE_TD} title="Privacy-preserving IP hash">
                        {truncateMiddle(event.ip_hash, 12)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3b. Recent audit log entries */}
        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900">{t('overview.recentAudit')}</h2>
          {stats.recentAuditLogs.length === 0 ? (
            <EmptyState
              icon="users"
              title={t('overview.noAuditEntries')}
              description={t('overview.noAuditDesc')}
            />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={TABLE_TH}>{t('overview.date')}</th>
                    <th className={TABLE_TH}>{t('overview.actor')}</th>
                    <th className={TABLE_TH}>{t('overview.action')}</th>
                    <th className={TABLE_TH}>{t('overview.target')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.recentAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className={TABLE_TD}>
                        <span className="whitespace-nowrap text-navy-500">
                          {formatDateTime(log.created_at)}
                        </span>
                      </td>
                      <td className={TABLE_TD}>
                        {log.actor_full_name
                          ? log.actor_full_name
                          : log.actor_id
                            ? `${log.actor_id.slice(0, 8)}…`
                            : '—'}
                      </td>
                      <td className={TABLE_TD}>
                        <span className="font-medium text-navy-900">{log.action}</span>
                      </td>
                      <td
                        className={TABLE_TD}
                        title={log.payload ? JSON.stringify(log.payload) : undefined}
                      >
                        {log.target_type
                          ? `${log.target_type}${
                              log.target_id ? ` / ${truncateMiddle(log.target_id)}` : ''
                            }`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 text-right">
            <Link
              href="/admin/audit"
              className="text-xs font-medium text-orange-700 hover:text-orange-800"
            >
              {t('overview.viewFullAudit')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
