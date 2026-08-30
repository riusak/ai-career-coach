-- Sprint 2.4 — Resume labels (categorization / personal description)
--
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor),
-- or with the Supabase CLI: supabase db push / psql -f <this file>.
-- Idempotent: safe to re-run.
--
-- The UPDATE policy required to edit labels was already added by
-- migration 002 ("Users can update own resumes").

-- ---------------------------------------------------------------------------
-- 1. label column: free-form category/description ("CV Dev", "CV Data FR"...)
-- ---------------------------------------------------------------------------
alter table public.resumes
  add column if not exists label text;

-- Null (no label) is the default state; otherwise 1–80 non-blank characters.
alter table public.resumes
  drop constraint if exists resumes_label_length_check;

alter table public.resumes
  add constraint resumes_label_length_check
  check (label is null or (length(btrim(label)) between 1 and 80));

comment on column public.resumes.label is
  'Optional user-defined label/category for the CV (e.g. "Backend roles — FR"). Max 80 characters.';
