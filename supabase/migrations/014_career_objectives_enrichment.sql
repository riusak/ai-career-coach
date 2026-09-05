-- Chart 3 — Enriched career objectives (core baseline for career-fit analytics).
--
-- Migration 012 stored the aspirational career goal as two flat profile
-- columns (target_role / target_year). This migration turns that row into a
-- proper "target baseline" dataset so the future Analytics career-fit
-- evaluations can run gap analyses (current profile vs objective):
--   1. target_description  text    — free-form description of the objective;
--   2. target_technologies  jsonb  — array of technologies the target role
--                                    is expected to require;
--   3. target_skills        jsonb  — array of skills the target role needs.
--
-- All columns are optional/nullable: existing profiles keep working and the
-- profile / career-goal forms populate them progressively. No RLS change is
-- needed — the profiles policies are column-blind and already cover them.
--
-- Idempotent: safe to re-run (same pattern as migrations 010 & 012).

alter table public.profiles
  add column if not exists target_description text,
  add column if not exists target_technologies jsonb,
  add column if not exists target_skills jsonb;

-- Lightweight shape guards: the jsonb columns must be JSON arrays (of
-- strings) or NULL — keeps accidental objects/numbers out of the analytics
-- mapping layer (same pattern as migration 010).
alter table public.profiles
  drop constraint if exists profiles_target_technologies_shape;

alter table public.profiles
  add constraint profiles_target_technologies_shape
  check (target_technologies is null
    or jsonb_typeof(target_technologies) = 'array');

alter table public.profiles
  drop constraint if exists profiles_target_skills_shape;

alter table public.profiles
  add constraint profiles_target_skills_shape
  check (target_skills is null
    or jsonb_typeof(target_skills) = 'array');

comment on column public.profiles.target_description is
  'Free-form description of the aspirational career objective (migration 014).';

comment on column public.profiles.target_technologies is
  'JSON array of technologies expected in the target role — core baseline dataset for career-fit analytics.';

comment on column public.profiles.target_skills is
  'JSON array of skills expected in the target role — core baseline dataset for career-fit analytics.';