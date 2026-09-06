import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MessageSquare } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import MultiModuleChart from '@/components/admin/MultiModuleChart';
import ScoreDistributionChart from '@/components/admin/ScoreDistributionChart';
import SecurityTelemetryCard from '@/components/admin/SecurityTelemetryCard';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { getAdminStats } from '@/lib/admin/stats';
import { getFeedbackSummaryStats } from '@/lib/feedback/actions';
import { formatDateTime, formatPercent, truncateMiddle } from '@/lib/admin/utils';
import { QUICK_TEST_EVENT_TYPES, type QuickTestEventType } from '@/types/admin';

export const metadata = {
  title: 'Overview — Admin Dashboard | ForPro AI',
  description: 'Live metrics, user analytics, security telemetry and audit trail.',
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
    <div className="rounded-xl border border-navy-100 bg-brand-bg p-3.5 shadow-2xs">
      <p className="text-xs uppercase tracking-wide text-navy-500">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-navy-900">{value}</p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-navy-100">
        <div
          className="animate-grow-y h-full origin-left rounded-full bg-[#FF7A00]"
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
    <div className="space-y-8 pb-10">
      {/* Top Header */}
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
            className="flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-800 shadow-xs hover:bg-navy-50 transition-colors"
          >
            <MessageSquare className="h-4 w-4 text-[#FF7A00]" />
            <span>Retours ({feedbackStats.newCount} nouv.)</span>
          </Link>
          <Link
            href="/admin/users"
            className="rounded-xl bg-[#FF7A00] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all hover:bg-orange-600"
          >
            {t('overview.manageUsers')}
          </Link>
        </div>
      </div>

      {/* Feedback banner if new items exist */}
      {feedbackStats.newCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
            <p className="text-sm font-medium text-amber-900">
              <strong>{feedbackStats.newCount} nouveau(x) retour(s) utilisateur(s)</strong> en attente.
              <span className="text-xs text-amber-700 ml-2 hidden sm:inline">
                (Transmis par email à effoeakolly@gmail.com & purge auto 7j)
              </span>
            </p>
          </div>
          <Link
            href="/admin/feedback?status=new"
            className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-2xs"
          >
            Consulter
          </Link>
        </div>
      )}

      {/* 1. Core High-Level KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent
          label={t('overview.registeredUsers')}
          value={stats.totalUsers}
          hint={t('overview.users30d', { count: stats.users30d })}
        />
        <StatCard
          label="CV & Analyses ATS"
          value={stats.resumeMetrics.totalResumes}
          hint={`${stats.resumeMetrics.resumes30d} sur 30 jours`}
        />
        <StatCard
          label="Job Matchings"
          value={stats.matchingMetrics.totalMatchings}
          hint={`${stats.matchingMetrics.matchings30d} sur 30 jours`}
        />
        <StatCard
          label="Simulations d'Entretien"
          value={stats.interviewMetrics.totalInterviews}
          hint={`${stats.interviewMetrics.completedInterviews} achevés (${formatPercent(stats.interviewMetrics.completionRate)})`}
        />
      </div>

      {/* 2. Interactive Multi-Module Timeline (14 Days) */}
      <MultiModuleChart
        data={stats.dailyModuleActivity}
        title="Tendances d’Utilisation par Module (14 derniers jours)"
      />

      {/* 3. Deep Performance & Score Breakdown Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Card 1: Resume ATS Score Distribution */}
        <ScoreDistributionChart
          title="Scores ATS des CVs"
          subtitle="Qualité et conformité des CVs importés"
          averageScore={stats.resumeMetrics.averageScore}
          totalCount={stats.resumeMetrics.totalResumes}
          tiers={[
            { label: 'Excellents (≥ 85%)', count: stats.resumeMetrics.scoreDistribution.excellent, color: '#10B981', bg: 'bg-emerald-500' },
            { label: 'Bons (70 - 84%)', count: stats.resumeMetrics.scoreDistribution.good, color: '#3B82F6', bg: 'bg-blue-500' },
            { label: 'Moyens (50 - 69%)', count: stats.resumeMetrics.scoreDistribution.average, color: '#F59E0B', bg: 'bg-amber-500' },
            { label: 'À optimiser (< 50%)', count: stats.resumeMetrics.scoreDistribution.critical, color: '#EF4444', bg: 'bg-red-500' },
          ]}
        />

        {/* Card 2: Job Matching Score Distribution */}
        <ScoreDistributionChart
          title="Adéquation Job Matching"
          subtitle="Affinité compétences / offres d'emploi"
          averageScore={stats.matchingMetrics.averageMatchScore}
          totalCount={stats.matchingMetrics.totalMatchings}
          tiers={[
            { label: 'Forte adéquation (≥ 85%)', count: stats.matchingMetrics.scoreDistribution.top, color: '#10B981', bg: 'bg-emerald-500' },
            { label: 'Bon match (70 - 84%)', count: stats.matchingMetrics.scoreDistribution.high, color: '#3B82F6', bg: 'bg-blue-500' },
            { label: 'Match partiel (50 - 69%)', count: stats.matchingMetrics.scoreDistribution.medium, color: '#F59E0B', bg: 'bg-amber-500' },
            { label: 'Faible affinité (< 50%)', count: stats.matchingMetrics.scoreDistribution.low, color: '#EF4444', bg: 'bg-red-500' },
          ]}
        />

        {/* Card 3: Interview Simulator Breakdown */}
        <ScoreDistributionChart
          title="Simulations d'Entretiens"
          subtitle="Typologie des simulations lancées"
          averageScore={stats.interviewMetrics.averageStarScore}
          totalCount={stats.interviewMetrics.totalInterviews}
          tiers={[
            { label: 'Général / RH', count: stats.interviewMetrics.byType.general, color: '#FF7A00', bg: 'bg-orange-500' },
            { label: 'Technique / Métier', count: stats.interviewMetrics.byType.technical, color: '#8B5CF6', bg: 'bg-purple-500' },
            { label: 'Commercial / Vente', count: stats.interviewMetrics.byType.sales, color: '#3B82F6', bg: 'bg-blue-500' },
            { label: 'Managérial & STAR', count: stats.interviewMetrics.byType.managerial + stats.interviewMetrics.byType.star, color: '#10B981', bg: 'bg-emerald-500' },
          ]}
        />
      </div>

      {/* 4. Cyber Security & Threat Mitigation Telemetry */}
      <SecurityTelemetryCard metrics={stats.securityMetrics} />

      {/* 5. Funnel Conversion Breakdown */}
      <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-navy-900">{t('overview.funnel')}</h2>
            <p className="mt-1 text-sm text-navy-500">
              {t('overview.funnelDesc')}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xs text-navy-400 font-medium">Taux de conversion</span>
            <div className="text-xl font-extrabold text-[#FF7A00]">
              {formatPercent(stats.conversionRate)}
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

      {/* 6. Recent Logs & Events */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Visitor Quick Tests */}
        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-navy-900">{t('overview.recentEvents')}</h2>
            <span className="text-xs text-navy-400">Derniers 10 tests</span>
          </div>
          {stats.recentEvents.length === 0 ? (
            <EmptyState
              icon="chart"
              title={t('overview.noEvents')}
              description=""
            />
          ) : (
            <div className="overflow-x-auto">
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
                <tbody className="divide-y divide-slate-100">
                  {stats.recentEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className={TABLE_TD}>
                        <span className="whitespace-nowrap text-navy-500">
                          {formatDateTime(event.created_at)}
                        </span>
                      </td>
                      <td className={TABLE_TD}>
                        <span className="font-medium text-navy-900">{event.event_type}</span>
                      </td>
                      <td className={TABLE_TD}>{event.source}</td>
                      <td className={TABLE_TD}>
                        {typeof event.score === 'number' ? (
                          <span className="font-semibold text-navy-800">{event.score}%</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={TABLE_TD} title="Privacy-preserving IP hash">
                        <span className="font-mono text-xs text-navy-400">
                          {truncateMiddle(event.ip_hash, 12)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Audit Log Entries */}
        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-navy-900">{t('overview.recentAudit')}</h2>
            <Link
              href="/admin/audit"
              className="text-xs font-semibold text-[#FF7A00] hover:text-orange-700 transition-colors"
            >
              {t('overview.viewFullAudit')} →
            </Link>
          </div>
          {stats.recentAuditLogs.length === 0 ? (
            <EmptyState
              icon="users"
              title={t('overview.noAuditEntries')}
              description={t('overview.noAuditDesc')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={TABLE_TH}>{t('overview.date')}</th>
                    <th className={TABLE_TH}>{t('overview.actor')}</th>
                    <th className={TABLE_TH}>{t('overview.action')}</th>
                    <th className={TABLE_TH}>{t('overview.target')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recentAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className={TABLE_TD}>
                        <span className="whitespace-nowrap text-navy-500">
                          {formatDateTime(log.created_at)}
                        </span>
                      </td>
                      <td className={TABLE_TD}>
                        <span className="font-medium text-navy-800">
                          {log.actor_full_name
                            ? log.actor_full_name
                            : log.actor_id
                            ? `${log.actor_id.slice(0, 8)}…`
                            : '—'}
                        </span>
                      </td>
                      <td className={TABLE_TD}>
                        <span className="font-semibold text-navy-900">{log.action}</span>
                      </td>
                      <td
                        className={TABLE_TD}
                        title={log.payload ? JSON.stringify(log.payload) : undefined}
                      >
                        <span className="text-xs font-mono text-navy-500">
                          {log.target_type
                            ? `${log.target_type}${
                                log.target_id ? ` / ${truncateMiddle(log.target_id)}` : ''
                              }`
                            : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
