import Link from 'next/link';
import StatCard from '@/components/admin/StatCard';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { getAdminStats } from '@/lib/admin/stats';
import { formatDateTime, formatPercent, truncateMiddle } from '@/lib/admin/utils';
import { QUICK_TEST_EVENT_TYPES, type QuickTestEventType } from '@/types/admin';



export const metadata = {
  title: 'Overview — Admin Dashboard | AI Career Coach',
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
  'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500';
const TABLE_TD = 'px-4 py-2 text-sm align-top';

/** Small label + count cell for the funnel breakdown. */
function FunnelItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#FAFAFA] p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
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
          className="rounded-md bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:from-gold-500 hover:to-gold-600"
        >
          Refresh
        </Link>
      </ErrorState>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live metrics, user management and the audit trail for AI Career Coach.
          </p>
        </div>
        <Link
          href="/admin/users"
          className="rounded-md bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:from-gold-500 hover:to-gold-600"
        >
          Manage users
        </Link>
      </div>

      {/* 1. KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
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

      {/* 2. Quick Test funnel */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Quick Test funnel</h2>
        <p className="mt-1 text-sm text-slate-500">
          Anonymous visitor events (privacy-preserving: IPs are HMAC-hashed).
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_TEST_EVENT_TYPES.map((eventType) => (
            <FunnelItem
              key={eventType}
              label={EVENT_LABELS[eventType]}
              value={stats.eventsByType[eventType] ?? 0}
            />
          ))}
        </div>
      </div>

            {/* 3. Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 3a. Recent visitor Quick Test events */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent visitor tests</h2>
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
                        <span className="whitespace-nowrap text-slate-500">
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
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent audit activity</h2>
          {stats.recentAuditLogs.length === 0 ? (
            <EmptyState
              icon="sparkles"
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
                        <span className="whitespace-nowrap text-slate-500">
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
                        <span className="font-medium text-slate-900">{log.action}</span>
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
              className="text-xs font-medium text-gold-700 hover:text-gold-800"
            >
              View full audit log →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
