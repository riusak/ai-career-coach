import { createClient } from '@/utils/supabase/server';
import { computePercent } from '@/lib/admin/utils';
import { listAuditLogs } from '@/lib/admin/audit';
import {
  QUICK_TEST_EVENT_TYPES,
  type AdminStats,
  type AuditLogRow,
  type DailyCount,
  type QuickTestEventRow,
  type QuickTestEventType,
} from '@/types/admin';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

/** Buckets raw UTC timestamps into the last 14 daily bins (oldest → newest). */
function buildDailyBuckets(timestamps: string[]): DailyCount[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const buckets = new Map<string, number>();
  for (let offset = 13; offset >= 0; offset -= 1) {
    const day = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
    buckets.set(day.toISOString().slice(0, 10), 0);
  }
  for (const timestamp of timestamps) {
    const key = timestamp.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

/**
 * Aggregates the KPIs rendered by the /admin overview dashboard.
 *
 * All reads go through the caller's own session + RLS (the admin SELECT
 * policies of migrations 005/006), so a misused call from a non-admin context
 * simply returns nothing useful instead of leaking data.
 */
export async function getAdminStats(): Promise<AdminStats | null> {
  try {
    const supabase = await createClient();
    const since30d = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

    // 1. Counters — profiles (registered accounts) & quick_test_events.
    const [totalUsersRes, users30dRes, totalEventsRes, events30dRes, ...typeRes] =
      await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since30d),
        supabase.from('quick_test_events').select('id', { count: 'exact', head: true }),
        supabase
          .from('quick_test_events')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since30d),
        ...QUICK_TEST_EVENT_TYPES.map((eventType) =>
          supabase
            .from('quick_test_events')
            .select('id', { count: 'exact', head: true })
            .eq('event_type', eventType)
        ),
      ]);

    if (
      totalUsersRes.error ||
      users30dRes.error ||
      totalEventsRes.error ||
      events30dRes.error ||
      typeRes.some((result) => result.error)
    ) {
      console.error('[admin] getAdminStats() count query failed.');
      return null;
    }

    // 2. Recent Quick Test activity feed (anonymous funnel events).
    const recentEventsRes = await supabase
      .from('quick_test_events')
      .select('id, event_type, source, score, ip_hash, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentEventsRes.error) {
      return null;
    }

    // 2bis. Daily buckets for the 14-day activity charts (overview graphs).
    const since14d = new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString();
    const [dailyEventsRes, dailyUsersRes] = await Promise.all([
      supabase
        .from('quick_test_events')
        .select('created_at')
        .gte('created_at', since14d),
      supabase.from('profiles').select('created_at').gte('created_at', since14d),
    ]);
    if (dailyEventsRes.error || dailyUsersRes.error) {
      console.error('[admin] getAdminStats() daily bucket query failed.');
      return null;
    }

    const eventsByTypeEntries = QUICK_TEST_EVENT_TYPES.map((eventType, index) => [
      eventType as QuickTestEventType,
      typeRes[index]?.count ?? 0,
    ]);
    const eventsByType = Object.fromEntries(
      eventsByTypeEntries
    ) as Record<QuickTestEventType, number>;

    const analysesCompleted =
      eventsByType['analysis_success'] + eventsByType['analysis_fallback'];
    const users30d = users30dRes.count ?? 0;
    const events30d = events30dRes.count ?? 0;

    // 3. Recent audit trail entries (join + names handled by the audit lib).
    const recentLogs = await listAuditLogs({ page: 1, pageSize: 10 });

    return {
      totalUsers: totalUsersRes.count ?? 0,
      users30d,
      totalEvents: totalEventsRes.count ?? 0,
      events30d,
      eventsByType,
      analysesCompleted,
      conversionRate: computePercent(eventsByType.conversion_cta, analysesCompleted),
      signupRate30d: computePercent(users30d, events30d),
      dailyEvents: buildDailyBuckets(
        (dailyEventsRes.data ?? []).map((row) => row.created_at),
      ),
      dailyUsers: buildDailyBuckets(
        (dailyUsersRes.data ?? []).map((row) => row.created_at),
      ),
      recentEvents: (recentEventsRes.data ?? []) as QuickTestEventRow[],
      recentAuditLogs: recentLogs.logs as AuditLogRow[],
    };
  } catch (err) {
    console.error('[admin] getAdminStats() failed:', (err as Error)?.message);
    return null;
  }
}