-- Sprint 2.2 — Primary resume flag (⭐ default CV)
--
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor),
-- or with the Supabase CLI: supabase db push / psql -f <this file>.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. is_primary column: marks the user's default CV (exactly one or none)
-- ---------------------------------------------------------------------------
alter table public.resumes
  add column if not exists is_primary boolean not null default false;

comment on column public.resumes.is_primary is
  'Default/primary CV of the user (⭐). At most one true row per user (enforced by a partial unique index). Presselected in any new analysis, matching, or interview simulation.';

-- ---------------------------------------------------------------------------
-- 2. Partial unique index: a user can have at most ONE primary resume
--
--    Partial (WHERE is_primary) on purpose:
--    - every non-primary row is excluded, so users may have many regular CVs;
--    - "no primary selected" is a valid state (all rows false);
--    - doubles as the lookup index for "get my default CV" queries
--      (WHERE user_id = ... AND is_primary).
-- ---------------------------------------------------------------------------
create unique index if not exists resumes_one_primary_per_user_idx
  on public.resumes (user_id)
  where is_primary;

-- ---------------------------------------------------------------------------
-- 3. Atomic switching: promoting a CV demotes the previous primary
--
--    The unique partial index above is the safety net; this trigger makes the
--    UX correct WITHOUT the client having to do a fragile two-step
--    "unset old, then set new" round trip (which would fail on the index if
--    reordered). Promoting CV B is a single UPDATE — the previous ⭐ is
--    demoted in the same statement, before the constraint is checked.
-- ---------------------------------------------------------------------------
create or replace function public.demote_other_primary_resumes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_primary then
    update public.resumes
    set is_primary = false
    where user_id = new.user_id
      and is_primary
      and id <> new.id;
  end if;
  return new;
end;
$$;

comment on function public.demote_other_primary_resumes() is
  'Ensures a single primary (⭐) resume per user: promoting one row demotes the previous primary in the same statement.';

drop trigger if exists demote_other_primary_resumes on public.resumes;
create trigger demote_other_primary_resumes
  before insert or update of is_primary on public.resumes
  for each row
  execute function public.demote_other_primary_resumes();

-- ---------------------------------------------------------------------------
-- 4. RLS: add the missing UPDATE policy
--
--    Migration 001 only granted select/insert/delete. Owners must be able to
--    rename files and toggle is_primary. The USING clause is implied by the
--    WITH CHECK clause for UPDATE on Supabase (row must both be owned before
--    and after the update), so a single WITH CHECK is sufficient.
-- ---------------------------------------------------------------------------
drop policy if exists "Users can update own resumes" on public.resumes;
create policy "Users can update own resumes"
  on public.resumes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
