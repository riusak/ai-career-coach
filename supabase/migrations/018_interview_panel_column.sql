-- Migration 018: Add panel column to interview_simulations
--
-- Stores the dynamically generated jury panel for each interview session.
-- The panel is a JSONB array of InterviewerSpeaker objects.
--
-- Idempotent: safe to re-run.

alter table public.interview_simulations
  add column if not exists panel jsonb default null;

comment on column public.interview_simulations.panel is
  'Dynamically generated jury panel: [{ id, name, title, gender, avatarSeed }]';
