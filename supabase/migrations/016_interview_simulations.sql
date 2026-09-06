-- Migration 016: interview_simulations table
--
-- Append-oriented interactive interview simulation logs with STAR evaluation.
-- Matches the architectural patterns of resume_analyses (003) and job_matchings (003, 011).
--
-- Idempotent: safe to re-run.

create table if not exists public.interview_simulations (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null,
  user_id uuid not null,
  job_matching_id uuid references public.job_matchings(id) on delete set null,
  job_title text not null,
  company text,
  job_description text,
  language text not null default 'fr' check (language in ('fr', 'en')),
  interview_type text not null default 'general' check (interview_type in ('general', 'technical', 'sales', 'managerial', 'star')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  score integer check (score is null or (score >= 0 and score <= 100)),
  current_step integer not null default 0,
  total_steps integer not null default 5,
  transcript jsonb not null default '[]'::jsonb,
  star_evaluation jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Pair FK: resume must exist AND belong to the log owner (anti cross-tenant)
  constraint interview_simulations_resume_user_fk
    foreign key (resume_id, user_id)
    references public.resumes (id, user_id)
    on delete cascade,

  -- User cleanup even if detached
  constraint interview_simulations_user_fk
    foreign key (user_id)
    references auth.users (id)
    on delete cascade
);

comment on table public.interview_simulations is
  'Interactive mock interview sessions with step-by-step turns and STAR evaluation.';

comment on column public.interview_simulations.transcript is
  'Array of conversational turns: [{ id, role, content, emotion?, isFollowup?, timestamp }]';

comment on column public.interview_simulations.star_evaluation is
  'Structured final debriefing: { overallScore, situationScore, taskScore, actionScore, resultScore, strengths, weaknesses, recommendations, questionsFeedback }';

-- Indexes for efficient dashboard fetching
create index if not exists interview_simulations_user_created_idx
  on public.interview_simulations (user_id, created_at desc);

create index if not exists interview_simulations_resume_created_idx
  on public.interview_simulations (resume_id, created_at desc);

-- RLS
alter table public.interview_simulations enable row level security;

drop policy if exists "Users can view own interview simulations"
  on public.interview_simulations;
create policy "Users can view own interview simulations"
  on public.interview_simulations for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own interview simulations"
  on public.interview_simulations;
create policy "Users can insert own interview simulations"
  on public.interview_simulations for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own in-progress interview simulations"
  on public.interview_simulations;
create policy "Users can update own in-progress interview simulations"
  on public.interview_simulations for update
  to authenticated
  using (
    auth.uid() = user_id
    and (status = 'in_progress' or status = 'completed')
  )
  with check (
    auth.uid() = user_id
  );

drop policy if exists "Users can delete own interview simulations"
  on public.interview_simulations;
create policy "Users can delete own interview simulations"
  on public.interview_simulations for delete
  to authenticated
  using (auth.uid() = user_id);
