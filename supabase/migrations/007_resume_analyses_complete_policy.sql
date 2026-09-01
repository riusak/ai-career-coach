-- Sprint 2.7 — Deep-analysis pipeline: allow the authenticated owner to
-- COMPLETE a queued analysis row (score NULL -> result).
--
-- Migration 003 deliberately created `resume_analyses` as append-only
-- (select/insert/delete, no UPDATE policy). Consequence: a queued row
-- (score IS NULL) could NEVER be completed — the deep-analysis pipeline had
-- no way to persist its result and the UI stayed stuck on "Queued" forever.
--
-- This policy restores pipeline progress while preserving the append-only
-- spirit for finished rows:
--   USING       -> only rows still queued (score IS NULL) and owned by the
--                  caller can ever be matched by an UPDATE; a completed row
--                  (score NOT NULL) is immutable again.
--   WITH CHECK  -> every mutation stays pinned to the owner (auth.uid()).
-- The pipeline writes a transient {"status":"processing"} claim marker into
-- structured_output, then the final {score, structured_output} result.
--
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor),
-- or with the Supabase CLI: supabase db push / psql -f <this file>.

drop policy if exists "Users can complete own queued resume analyses"
  on public.resume_analyses;

create policy "Users can complete own queued resume analyses"
  on public.resume_analyses for update
  to authenticated
  using (
    auth.uid() = user_id
    and score is null
  )
  with check (
    auth.uid() = user_id
  );

comment on policy "Users can complete own queued resume analyses"
  on public.resume_analyses is
  'Pipeline completion only: a queued row (score IS NULL) may be filled with
its result; completed rows (score NOT NULL) stay immutable.';
