import Link from 'next/link';
import BarChart from '@/components/admin/BarChart';
import StatCard from '@/components/admin/StatCard';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { getAdminStats } from '@/lib/admin/stats';
import { formatDateTime, formatPercent, truncateMiddle } from '@/lib/admin/utils';
import { QUICK_TEST_EVENT_TYPES, type QuickTestEventType } from '@/types/admin';



export const metadata = {
  title: 'Overview — Admin Dashboard | ForPro AI',
  description: 'Live metrics, user management and audit trail.',
};

const EVENT_LABELS: Record<QuickTestEventType, string> = {
  upload: 'Uploads',
  analysis_success: 'Analyses (LLM)',
  analysis_fallback: 'Analyses (heuristic)',
  conversion_cta: 'Signup CTA clicks',
  rejected_non_cv: 'Rejected (non-CV)',
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
  const stats = await getAdminStats();

  if (!stats) {
    return (
      <ErrorState
        title="Metrics unavailable"
        description="The analytics backend could not be reached. Try refreshing the page."
      >
        <Link
          href="/admin"
          className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
        >
          Refresh
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
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-navy-600">
            Live metrics, user management and the audit trail for ForPro AI.
          </p>
        </div>
        <Link
          href="/admin/users"
          className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600"
        >
          Manage users
        </Link>
      </div>

      {/* 1. KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent
          label="Registered users"
          value={stats.totalUsers}
          hint={`+${stats.users30d} over the last 30 days`}
        />
        <StatCard
          label="Quick tests run"
          value={stats.totalEvents}
          hint={`${stats.events30d} over the last 30 days`}
        />
        <StatCard
          label="Analyses completed"
          value={stats.analysesCompleted}
          hint="LLM + heuristic combined"
        />
        <StatCard
          label="Test → CTA conversion"
          value={formatPercent(stats.conversionRate)}
          hint={
            stats.signupRate30d === null
              ? 'No visitor traffic yet'
              : `≈ ${formatPercent(stats.signupRate30d)} signup proxy (30d)`
          }
        />
      </div>

      {/* 2. 14-day activity charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-navy-900">Quick Test activity</h2>
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-navy-400">
              14 derniers jours
            </span>
          </div>
          <div className="mt-4">
            <BarChart
              data={stats.dailyEvents}
              tone="orange"
              ariaLabel="Événements Quick Test quotidiens sur les 14 derniers jours"
            />
          </div>
        </div>

        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-navy-900">Nouveaux comptes</h2>
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-navy-400">
              14 derniers jours
            </span>
          </div>
          <div className="mt-4">
            <BarChart
              data={stats.dailyUsers}
              tone="navy"
              ariaLabel="Nouvelles inscriptions quotidiennes sur les 14 derniers jours"
            />
          </div>
        </div>
      </div>

      {/* 3. Quick Test funnel */}
      <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900">Quick Test funnel</h2>
        <p className="mt-1 text-sm text-navy-500">
          Anonymous visitor events (privacy-preserving: IPs are HMAC-hashed).
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_TEST_EVENT_TYPES.map((eventType) => (
            <FunnelItem
              key={eventType}
              label={EVENT_LABELS[eventType]}
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
          <h2 className="text-lg font-semibold text-navy-900">Recent visitor tests</h2>
          {stats.recentEvents.length === 0 ? (
            <EmptyState
              icon="chart"
              title="No tests yet"
              description="The Quick Test funnel has no recorded events."
            />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={TABLE_TH}>Date</th>
                    <th className={TABLE_TH}>Type</th>
                    <th className={TABLE_TH}>Source</th>
                    <th className={TABLE_TH}>Score</th>
                    <th className={TABLE_TH}>Visitor</th>
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
          <h2 className="text-lg font-semibold text-navy-900">Recent audit activity</h2>
          {stats.recentAuditLogs.length === 0 ? (
            <EmptyState
              icon="users"
              title="No audit entries yet"
              description="Privileged admin actions (role changes, deletions) will be recorded here."
            />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={TABLE_TH}>Date</th>
                    <th className={TABLE_TH}>Actor</th>
                    <th className={TABLE_TH}>Action</th>
                    <th className={TABLE_TH}>Target</th>
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
              View full audit log →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
