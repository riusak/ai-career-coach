import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import type { AdminAuditListResult, AuditLogRow } from '@/types/admin';

const AUDIT_LOG_SELECT = 'id, actor_id, action, target_type, target_id, payload, created_at';

/** Audit row before actor-name enrichment (actor_id not yet resolved). */
type AuditRow = Omit<AuditLogRow, 'actor_full_name'>;

export type AuditLogWriteInput = {
  actorId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  payload?: Record<string, unknown> | null;
};

/**
 * Appends an entry to the immutable `audit_logs` table with the service-role
 * client (bypasses RLS by design — migration 006). Never throws: a failed
 * audit write is logged and returns `false` so a bookkeeping failure never
 * masks the caller's own mutation result.
 */
export async function writeAuditLog(entry: AuditLogWriteInput): Promise<boolean> {
  try {
    const service = createServiceClient();

    const { error } = await service.from('audit_logs').insert({
      actor_id: entry.actorId,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      payload: (entry.payload ?? null) as Record<string, unknown> | null,
    });

    if (error) {
      console.error('[admin] writeAuditLog() failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[admin] writeAuditLog() threw:', (err as Error)?.message);
    return false;
  }
}

export type ListAuditLogsOptions = {
  page: number;
  pageSize: number;
};

/**
 * Lists audit log entries newest-first. Read with the caller's OWN server
 * session: the "Admins can view audit logs" RLS policy (migration 006) makes
 * this query a no-op for any non-admin caller — defense in depth on top of the
 * `getCurrentAdmin()` guard. Actor full names are resolved from `profiles`.
 */
export async function listAuditLogs(options: ListAuditLogsOptions): Promise<AdminAuditListResult> {
  const { page, pageSize } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const supabase = await createClient();

    const { data, count, error } = await supabase
      .from('audit_logs')
      .select(AUDIT_LOG_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[admin] listAuditLogs() query failed:', error.message);
      return { logs: [], total: 0, page, totalPages: 1 };
    }

    const rows = (data ?? []) as AuditRow[];

    const actorIds = Array.from(
      new Set(
        rows
          .map((row) => row.actor_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );

    let actorNames = new Map<string, string | null>();
    if (actorIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', actorIds);

      if (!profilesError) {
        actorNames = new Map(
          (profiles ?? []).map((profile) => [profile.id, profile.full_name ?? null])
        );
      }
    }

    const logs: AuditLogRow[] = rows.map((row) => ({
      ...row,
      actor_full_name: row.actor_id ? (actorNames.get(row.actor_id) ?? null) : null,
    }));

    const total = count ?? rows.length;
    return {
      logs,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch (err) {
    console.error('[admin] listAuditLogs() failed:', (err as Error)?.message);
    return { logs: [], total: 0, page, totalPages: 1 };
  }
}