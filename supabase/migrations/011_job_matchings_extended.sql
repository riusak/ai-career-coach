-- Sprint 5.2 — Job matching pipeline: offer metadata + queued-row completion.
--
-- The `job_matchings` table (migration 003) already hosts the append-only log
-- (job_title, job_description, match_score, matching_details + RLS select/
-- insert/delete). This migration extends it for the Phase 5.2 pipeline:
--
--   1. Offer metadata columns (company, location, source_type, source_url,
--      offer_file_name) — mirroring the validated template's JobOfferMatch
--      model so the history grid can render context chips without re-parsing
--      the jsonb result;
--   2. A completion UPDATE policy (mirror of migration 007 for
--      resume_analyses): a queued row (match_score IS NULL) may be filled by
--      its pipeline worker; a completed row (match_score NOT NULL) stays
--      immutable again — preserving the append-only spirit for results.
--
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor), or with the
-- Supabase CLI: supabase db push / psql -f <this file>.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Offer metadata columns
-- ---------------------------------------------------------------------------
alter table public.job_matchings
  add column if not exists company text;

alter table public.job_matchings
  add column if not exists location text;

alter table public.job_matchings
  add column if not exists source_type text;

alter table public.job_matchings
  add column if not exists source_url text;

alter table public.job_matchings
  add column if not exists offer_file_name text;

comment on column public.job_matchings.company is
  'Company / organization extracted from the offer (optional metadata).';

comment on column public.job_matchings.location is
  'Location of the position (optional metadata, free text).';

comment on column public.job_matchings.source_type is
  'Where the offer text came from: ''file'', ''url'' or ''text'' (default).';

comment on column public.job_matchings.source_url is
  'Original offer URL when the user provided one (optional).';

comment on column public.job_matchings.offer_file_name is
  'Original offer file name when the user provided one (optional).';

-- Whitelist the source kind (legacy rows degrade to NULL — still allowed).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'job_matchings_source_type_check'
      and conrelid = 'public.job_matchings'::regclass
  ) then
    alter table public.job_matchings
      add constraint job_matchings_source_type_check
      check (source_type is null or source_type in ('file', 'url', 'text'));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Pipeline completion policy (queued rows only — mirror of migration 007)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can complete own queued job matchings"
  on public.job_matchings;

create policy "Users can complete own queued job matchings"
  on public.job_matchings for update
  to authenticated
  using (
    auth.uid() = user_id
    and match_score is null
  )
  with check (
    auth.uid() = user_id
  );

comment on policy "Users can complete own queued job matchings"
  on public.job_matchings is
  'Pipeline completion only: a queued row (match_score IS NULL) may be filled
with its result; completed rows (match_score NOT NULL) stay immutable.';