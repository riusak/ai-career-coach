-- Chart 4 — Performance optimization: complementary hot-path indexes.
--
-- The dashboard loader (src/lib/dashboard/load-dashboard.ts) runs on every
-- dashboard render and calls getLatestCompletedAnalysesByResume():
--
--   select … from resume_analyses
--   where user_id = <uid> and score is not null
--   order by created_at desc limit 100;
--
-- Migration 003 already provides resume_analyses_user_created_idx
-- (user_id, created_at) which serves the filter + ordering, but Postgres
-- must then discard every still-queued row (score IS NULL) row by row. The
-- partial index below stores ONLY completed analyses, so the hot dashboard
-- aggregate scans strictly the rows it can use — and stays small as queued
-- rows come and go.
--
-- Idempotent: safe to re-run.

create index if not exists resume_analyses_user_completed_idx
  on public.resume_analyses (user_id, created_at desc)
  where score is not null;

comment on index public.resume_analyses_user_completed_idx is
  'Chart 4: covers the dashboard "latest completed analysis per resume" aggregate (score IS NOT NULL rows only).';

-- The catalogue/preview flows (getLatestResumeAnalysis by resume_id, ordered
-- newest first) are already covered by resume_analyses_resume_created_idx
-- (migration 003); the profile_* .user_id lookups by profile_*_user_idx
-- (migration 008); the resumes catalogue by resumes_user_id_created_idx
-- (migration 001) and the single-primary lookup by the partial unique index
-- of migration 002. No further index is needed for the current query set.