-- Sprint 3.2 — Anonymous visitor analytics + rate limiting + admin audit log
--
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor),
-- or with the Supabase CLI: supabase db push / psql -f <this file>.
-- Idempotent: safe to re-run.
--
-- Supports (architecture review §3.2.B):
--   1. `quick_test_events`: anonymous, privacy-preserving tracking of the
--      visitor Quick Test funnel (mvp.md §2 metrics) — and the persistence
--      layer for the missing IP rate limit (1 test / IP / 24 h);
--   2. `audit_logs`: append-only trace of privileged (admin) actions, a
--      prerequisite before any admin CRUD ships;
--   3. RLS: anonymous INSERT-only on events, admin-only SELECT; audit_logs
--      is fully admin-only (service-role server code bypasses RLS by design).
--
-- PRIVACY NOTE: ip_hash must be an HMAC/hash (e.g. HMAC-SHA256 with a
-- server-side secret, or a truncated SHA-256) — never a raw IP. Raw IPs
-- would make the table personal data under GDPR.
--
-- NOTE: `public.is_admin()` was introduced by migration 005; it is
-- re-asserted below with `create or replace` so this migration stays
-- self-contained and safe to run in isolation.

-- ---------------------------------------------------------------------------
-- 1. Admin helper (re-assertion of migration 005, idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'True when the caller is an authenticated admin (profiles.role = ''admin''). Introduced by migration 005; re-asserted here for self-containment.';

-- ---------------------------------------------------------------------------
-- 2. quick_test_events: anonymous funnel tracking + rate-limit support
--
--    Append-only by design: no UPDATE policy, no DELETE policy. Rows are
--    written by the server-side Quick Test route (NOT directly by the
--    browser) so event_type / source / score are trustworthy.
-- ---------------------------------------------------------------------------
create table if not exists public.quick_test_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null
    check (event_type in (
      'upload',
      'analysis_success',
      'analysis_fallback',
      'conversion_cta',
      'rejected_non_cv'
    )),
  ip_hash text not null
    check (length(btrim(ip_hash)) > 0),
  user_agent text,
  source text not null,
  -- 'llm' | 'heuristic' for analysis events; 'none' for upload / conversion
  -- / rejection events that carry no analysis engine.
  score integer
    check (score is null or (score >= 0 and score <= 100)),
  created_at timestamptz not null default now()
);

comment on table public.quick_test_events is
  'Append-only, anonymous tracking of visitor Quick Test events. Also backs the per-IP rate limit (1 free test / 24 h) via the (ip_hash, created_at) index.';

comment on column public.quick_test_events.ip_hash is
  'Privacy-preserving identity of the visitor: HMAC-SHA256 (or truncated SHA-256) of the IP with a server-side secret. NEVER store the raw IP.';

comment on column public.quick_test_events.source is
  'Analysis engine: ''llm'' (Gemini) or ''heuristic'' (fallback) for analysis events; ''none'' for upload / conversion_cta / rejected_non_cv events.';

-- ---------------------------------------------------------------------------
-- 3. audit_logs: append-only trace of privileged (admin) actions
--
--    Written exclusively by server-side admin code (service-role client or
--    admin server actions). actor_id is SET NULL on user deletion so the
--    log survives the removal of the admin account (traceability first).
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid
    references auth.users (id)
    on delete set null,
  action text not null
    check (length(btrim(action)) between 1 and 100),
  target_type text
    check (target_type is null or length(btrim(target_type)) between 1 and 60),
  target_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only audit trail of admin operations (user management, data moderation, role changes). Immutable once written — no UPDATE/DELETE policies.';

comment on column public.audit_logs.actor_id is
  'Admin who performed the action. NULL when the actor account was deleted (on delete set null keeps the log).';

comment on column public.audit_logs.action is
  'Machine-readable action name, e.g. ''user.suspend'', ''resume.delete'', ''profile.role_change''.';

comment on column public.audit_logs.payload is
  'Structured context of the action (before/after snapshots, reason, metadata).';

-- ---------------------------------------------------------------------------
-- 4. Performance indexes
--
--    Primary: (ip_hash, created_at desc) — rate-limit lookup
--    "SELECT count(*) FROM quick_test_events WHERE ip_hash = $1
--     AND created_at > now() - interval ''24 hours''" hits the index
--    prefix alone. Additional indexes serve the admin metrics dashboards.
-- ---------------------------------------------------------------------------
create index if not exists quick_test_events_ip_hash_created_idx
  on public.quick_test_events (ip_hash, created_at desc);

create index if not exists quick_test_events_type_created_idx
  on public.quick_test_events (event_type, created_at desc);

create index if not exists audit_logs_created_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_actor_created_idx
  on public.audit_logs (actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. RLS: anonymous INSERT-only on events; audit_logs fully admin-only
--
--    quick_test_events:
--      - INSERT to anon/authenticated: the visitor funnel runs without an
--        account. The policy is intentionally permissive on purpose — the
--        rate limit and payload trust are enforced application-side in the
--        API route, NOT here (a DB-side count check would be slow and racy).
--      - SELECT to admins only (public.is_admin()).
--      - No UPDATE/DELETE policies: the log is immutable through PostgREST.
--    audit_logs:
--      - INSERT and SELECT to admins only. Server-side code writing audit
--        entries through the service-role key bypasses RLS entirely (by
--        design), so legitimate automation is unaffected.
-- ---------------------------------------------------------------------------
alter table public.quick_test_events enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Anyone can insert quick test events" on public.quick_test_events;
create policy "Anyone can insert quick test events"
  on public.quick_test_events for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Admins can view quick test events" on public.quick_test_events;
create policy "Admins can view quick test events"
  on public.quick_test_events for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert audit logs" on public.audit_logs;
create policy "Admins can insert audit logs"
  on public.audit_logs for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs"
  on public.audit_logs for select
  to authenticated
  using (public.is_admin());

