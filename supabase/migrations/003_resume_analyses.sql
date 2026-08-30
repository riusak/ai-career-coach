-- Sprint 2.3 — Analysis & matching logs (append-only child entities)
--
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor),
-- or with the Supabase CLI: supabase db push / psql -f <this file>.
-- Idempotent: safe to re-run.
--
-- Design (docs/product/mvp.md §5): a resume is a durable ASSET; analyses and
-- matchings are immutable EVENT LOGS attached to it. Rules enforced below:
--   1. append-only: SELECT/INSERT/DELETE policies only — no UPDATE policy, so
--      results cannot be tampered with after generation;
--   2. full cascade: deleting a resume (or a user) removes its logs;
--   3. no cross-tenant references: composite FKs guarantee resume_id always
--      belongs to user_id;
--   4. strict RLS: every policy checks auth.uid() = user_id.

-- ---------------------------------------------------------------------------
-- 1. Tenant-safety foundation: (id, user_id) pair on resumes
--
--    Needed so child tables can reference the PAIR (resume_id, user_id) —
--    making it impossible to attach a log to someone else's resume, even
--    from a compromised client.
-- ---------------------------------------------------------------------------
alter table public.resumes
  drop constraint if exists resumes_id_user_id_key;

alter table public.resumes
  add constraint resumes_id_user_id_key unique (id, user_id);

-- ---------------------------------------------------------------------------
-- 2. resume_analyses: automated CV check outputs ("light" / "deep")
-- ---------------------------------------------------------------------------
create table if not exists public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null,
  user_id uuid not null,
  analysis_type text not null,
  score integer,
  structured_output jsonb,
  created_at timestamptz not null default now(),

  -- Pair FK: resume must exist AND belong to the log owner.
  constraint resume_analyses_resume_user_fk
    foreign key (resume_id, user_id)
    references public.resumes (id, user_id)
    on delete cascade,

  -- User cleanup even if the resume row were somehow detached.
  constraint resume_analyses_user_fk
    foreign key (user_id)
    references auth.users (id)
    on delete cascade,

  -- Whitelisted analysis kinds (docs/product/mvp.md §5.2).
  constraint resume_analyses_type_check
    check (analysis_type in ('light', 'deep')),

  -- Global score is a percentage; NULL until the pipeline returns.
  constraint resume_analyses_score_check
    check (score is null or (score >= 0 and score <= 100))
);

comment on table public.resume_analyses is
  'Append-only log of automated CV analyses. One row per run; results are immutable once written.';

comment on column public.resume_analyses.analysis_type is
  '''light'' = visitor-grade quick check; ''deep'' = full authenticated analysis.';

comment on column public.resume_analyses.score is
  'Global score (0–100). NULL while the analysis job is still pending.';

comment on column public.resume_analyses.structured_output is
  'Full structured result (strengths, weaknesses, recommendations, per-section details).';

-- ---------------------------------------------------------------------------
-- 3. job_matchings: CV vs job offer comparisons
-- ---------------------------------------------------------------------------
create table if not exists public.job_matchings (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null,
  user_id uuid not null,
  job_title text not null,
  job_description text not null,
  match_score integer,
  matching_details jsonb,
  created_at timestamptz not null default now(),

  constraint job_matchings_resume_user_fk
    foreign key (resume_id, user_id)
    references public.resumes (id, user_id)
    on delete cascade,

  constraint job_matchings_user_fk
    foreign key (user_id)
    references auth.users (id)
    on delete cascade,

  constraint job_matchings_score_check
    check (match_score is null or (match_score >= 0 and match_score <= 100)),

  constraint job_matchings_title_check
    check (length(btrim(job_title)) > 0)
);

comment on table public.job_matchings is
  'Append-only log of CV-vs-job-offer comparisons. One row per matching run.';

comment on column public.job_matchings.job_description is
  'Raw job offer text as provided by the user (pasted or imported).';

comment on column public.job_matchings.match_score is
  'Global match score (0–100). NULL while the matching job is still pending.';

comment on column public.job_matchings.matching_details is
  'Full structured result (missing keywords, per-requirement gaps, rewrite suggestions).';

-- ---------------------------------------------------------------------------
-- 4. Query indexes: history views are "latest first", per user and per resume
-- ---------------------------------------------------------------------------
create index if not exists resume_analyses_user_created_idx
  on public.resume_analyses (user_id, created_at desc);

create index if not exists resume_analyses_resume_created_idx
  on public.resume_analyses (resume_id, created_at desc);

create index if not exists job_matchings_user_created_idx
  on public.job_matchings (user_id, created_at desc);

create index if not exists job_matchings_resume_created_idx
  on public.job_matchings (resume_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. RLS: strict ownership on both log tables (no UPDATE — append-only)
-- ---------------------------------------------------------------------------
alter table public.resume_analyses enable row level security;
alter table public.job_matchings enable row level security;

-- resume_analyses -----------------------------------------------------------
drop policy if exists "Users can view own resume analyses" on public.resume_analyses;
create policy "Users can view own resume analyses"
  on public.resume_analyses for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own resume analyses" on public.resume_analyses;
create policy "Users can insert own resume analyses"
  on public.resume_analyses for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own resume analyses" on public.resume_analyses;
create policy "Users can delete own resume analyses"
  on public.resume_analyses for delete
  to authenticated
  using (auth.uid() = user_id);

-- job_matchings --------------------------------------------------------------
drop policy if exists "Users can view own job matchings" on public.job_matchings;
create policy "Users can view own job matchings"
  on public.job_matchings for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own job matchings" on public.job_matchings;
create policy "Users can insert own job matchings"
  on public.job_matchings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own job matchings" on public.job_matchings;
create policy "Users can delete own job matchings"
  on public.job_matchings for delete
  to authenticated
  using (auth.uid() = user_id);
