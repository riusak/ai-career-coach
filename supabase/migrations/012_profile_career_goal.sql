-- Sprint 6 — Career-goal anchor for the roadmap « summit » node.
--
-- Adds the explicit aspirational career goal to the profile (set through the
-- profile form, e.g. « Lead Architect by 2030 »). The dashboard adapters use
-- it to append the ultimate « Goal » milestone (flag icon) at the end of the
-- career-roadmap timeline — replacing the old "last experience = goal" guess.
--
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor),
-- or with the Supabase CLI: supabase db push / psql -f <this file>.
-- Idempotent: safe to re-run.

alter table public.profiles
  add column if not exists target_role text;

alter table public.profiles
  add column if not exists target_year integer;

-- Re-assert the year sanity window (drop + add keeps re-runs safe).
alter table public.profiles
  drop constraint if exists profiles_target_year_check;

alter table public.profiles
  add constraint profiles_target_year_check
  check (target_year is null or (target_year >= 2020 and target_year <= 2100));

comment on column public.profiles.target_role is
  'Aspirational target job title (e.g. "Lead Architect") anchoring the career-roadmap goal milestone.';

comment on column public.profiles.target_year is
  'Target year for the career goal (e.g. 2030); rendered as the roadmap summit label.';
