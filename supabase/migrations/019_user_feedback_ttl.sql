-- Migration 019: Feedback 7-Day Auto-Purge & Retention Index
--
-- Adds index on created_at for fast retention pruning and creates a stored
-- procedure to purge feedbacks older than 7 days, keeping the database lightweight.
--
-- Idempotent: safe to re-run.

create index if not exists idx_user_feedback_created_at
  on public.user_feedback(created_at);

-- Stored procedure to delete feedbacks older than specified retention days (default 7)
create or replace function public.purge_expired_user_feedback(retention_days integer default 7)
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.user_feedback
  where created_at < (now() - (retention_days || ' days')::interval);
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.purge_expired_user_feedback is
  'Purges user feedbacks older than the retention threshold (default 7 days) to keep DB lean.';
