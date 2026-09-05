-- Sprint 7 — One-time onboarding persistence
--
-- Idempotent: safe to re-run. Adds a single nullable timestamp on `profiles`
-- used as the SOURCE OF TRUTH for the first-connection onboarding wizard:
--   - NULL            → the user has never completed/skipped the wizard;
--   - non-NULL value  → the wizard must never force a full-screen display
--                       again (persisted across re-login and reconnection).
-- The per-browser cookie (`forpro_onboarding_seen`) is kept as a cheap
-- fast-path; this column is the durable database record required by the
-- « Onboarding Workflow » charter.
--
-- RLS: the column is covered by the existing column-blind « Users can update
-- own profile » policy — no new policy required.

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.profiles.onboarding_completed_at is
  'Timestamp set when the user completes or explicitly dismisses the first-connection onboarding wizard. NULL = never seen. Drives the one-time full-screen trigger and the persistent dashboard helper widget.';