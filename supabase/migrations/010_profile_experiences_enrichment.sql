-- Sprint 5 — Career roadmap enrichment (Phase 2, template dashboard integration)
--
-- Adds the JSON fields required by the rich career-roadmap UI on top of
-- profile_experiences (migration 008):
--   1. key_missions  jsonb  — array of high-signal mission strings per role;
--   2. technologies  jsonb  — array of tech keywords displayed as chips;
--   3. domain        text   — optional career domain tag (frontend | backend |
--                             architecture | devops | mobile | data | other).
--
-- All columns are optional/nullable: existing rows keep rendering fine and
-- the API/forms can populate them progressively. No RLS change needed —
-- the "Users can manage own experiences" policy from migration 008 is
-- column-blind and already covers the new columns.
--
-- Idempotent: safe to re-run.

alter table public.profile_experiences
  add column if not exists key_missions jsonb,
  add column if not exists technologies jsonb,
  add column if not exists domain text;

-- Lightweight shape guards: the columns must be JSON arrays of strings (or
-- NULL). Keeps accidental objects/numbers out of the UI mapping layer.
alter table public.profile_experiences
  drop constraint if exists profile_experiences_key_missions_shape;

alter table public.profile_experiences
  add constraint profile_experiences_key_missions_shape
  check (key_missions is null
    or jsonb_typeof(key_missions) = 'array');

alter table public.profile_experiences
  drop constraint if exists profile_experiences_technologies_shape;

alter table public.profile_experiences
  add constraint profile_experiences_technologies_shape
  check (technologies is null
    or jsonb_typeof(technologies) = 'array');

alter table public.profile_experiences
  drop constraint if exists profile_experiences_domain_check;

alter table public.profile_experiences
  add constraint profile_experiences_domain_check
  check (domain is null or domain in (
    'frontend', 'backend', 'architecture', 'devops', 'mobile', 'data', 'other'
  ));

comment on column public.profile_experiences.key_missions is
  'Optional JSON array of key mission strings (dashboard roadmap milestone detail).';

comment on column public.profile_experiences.technologies is
  'Optional JSON array of technology keywords (dashboard roadmap chips).';

comment on column public.profile_experiences.domain is
  'Optional career domain tag driving the roadmap milestone color coding.';