/**
 * Shared types for the admin dashboard (Sprint 3.3):
 *  - profiles.role = 'user' | 'admin' (migration 005);
 *  - quick_test_events: anonymous visitor Quick Test funnel (migration 006);
 *  - audit_logs: append-only trace of privileged admin actions (migration 006).
 */

export type UserRole = 'user' | 'admin';

/** Whitelist of roles, mirrors the DB CHECK constraint (migration 005). */
export const USER_ROLES = ['user', 'admin'] as const satisfies readonly UserRole[];

/** Role used to filter the user list (null = no filter). */
export type RoleFilter = UserRole | null;

/** Row of `profiles` enriched with auth metadata and per-user content counts. */
export interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
  /** Number of resumes owned by this user (from the private `resumes` bucket). */
  resume_count: number;
  /** Number of automated analysis runs logged for this user. */
  analysis_count: number;
}

/** AdminUser plus the last-auth metadata available from auth.users. */
export interface AdminUserDetail extends AdminUser {
  last_sign_in_at: string | null;
}

export interface AdminUserListResult {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Compact resume metadata shown on the user detail page. */
export interface AdminResumeSummary {
  id: string;
  file_name: string;
  is_primary: boolean;
  created_at: string;
}

/** Most recent automated analysis run for a user's resume. */
export interface AdminLatestAnalysis {
  analysis_type: 'light' | 'deep';
  score: number | null;
  created_at: string;
}

export interface AdminUserDetailResult {
  user: AdminUserDetail;
  resumes: AdminResumeSummary[];
  analysis_count: number;
  latestAnalysis: AdminLatestAnalysis | null;
}

/** Paginated page of audit log entries. */
export interface AdminAuditListResult {
  logs: AuditLogRow[];
  total: number;
  page: number;
  totalPages: number;
}

/** `quick_test_events.event_type` whitelist (migration 006). */
export type QuickTestEventType =
  | 'upload'
  | 'analysis_success'
  | 'analysis_fallback'
  | 'conversion_cta'
  | 'rejected_non_cv';

export const QUICK_TEST_EVENT_TYPES: readonly QuickTestEventType[] = [
  'upload',
  'analysis_success',
  'analysis_fallback',
  'conversion_cta',
  'rejected_non_cv',
];

export interface QuickTestEventRow {
  id: string;
  event_type: QuickTestEventType;
  source: string;
  score: number | null;
  ip_hash: string;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  /** Resolved via profiles —— null when the actor account was deleted. */
  actor_full_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

/** Aggregated KPIs for the admin overview dashboard. */
export interface AdminStats {
  totalUsers: number;
  /** Signups over the last 30 days (used as a conversion proxy). */
  users30d: number;
  totalEvents: number;
  /** Visitor Quick Test events over the last 30 days. */
  events30d: number;
  /** Count per event type (total, all time). */
  eventsByType: Record<QuickTestEventType, number>;
  /** analysis_success + analysis_fallback = completed anonymous tests. */
  analysesCompleted: number;
  /**
   * conversion_cta / analysesCompleted (0–100, one decimal).
   * null when no anonymous test has been completed yet.
   */
  conversionRate: number | null;
  /**
   * users30d / events30d — honest proxy for "anonymous visitors who became
   * accounts" (anonymous events cannot be linked to accounts individually).
   */
  signupRate30d: number | null;
  /** Most recent visitor Quick Test events (activity feed). */
  recentEvents: QuickTestEventRow[];
  /** Most recent admin audit entries. */
  recentAuditLogs: AuditLogRow[];
}

/** Return type of the mutable admin server actions (useActionState-friendly). */
export interface AdminActionResult {
  success: boolean;
  message: string | null;
}