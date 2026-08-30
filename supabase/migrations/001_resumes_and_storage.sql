-- Sprint 2.1 — Resumes table + private Storage bucket + RLS policies
--
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor),
-- or with the Supabase CLI: supabase db push / psql -f <this file>.

-- ---------------------------------------------------------------------------
-- 1. resumes table: CV metadata (file itself lives in Storage)
-- ---------------------------------------------------------------------------
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  parsed_content jsonb,
  created_at timestamptz not null default now()
);

comment on column public.resumes.file_path is 'Path of the file inside the "resumes" storage bucket, e.g. "<user_id>/<timestamp>-<file_name>".';
comment on column public.resumes.parsed_content is 'Structured extraction result (JSON), populated by the parsing pipeline. Null until parsed.';

create index if not exists resumes_user_id_created_at_idx
  on public.resumes (user_id, created_at desc);

alter table public.resumes enable row level security;

drop policy if exists "Users can select own resumes" on public.resumes;
create policy "Users can select own resumes"
  on public.resumes for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own resumes" on public.resumes;
create policy "Users can insert own resumes"
  on public.resumes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own resumes" on public.resumes;
create policy "Users can delete own resumes"
  on public.resumes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Private storage bucket for CV files (PDF / TXT, max 5 MB)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  5242880, -- 5 MB (must match MAX_RESUME_FILE_SIZE_BYTES in src/lib/resume-validation.ts)
  array['application/pdf', 'text/plain']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Files must live under a folder named with the owner's user id:
-- "<user_id>/<timestamp>-<file_name>"
drop policy if exists "Users can upload own resume files" on storage.objects;
create policy "Users can upload own resume files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own resume files" on storage.objects;
create policy "Users can read own resume files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own resume files" on storage.objects;
create policy "Users can delete own resume files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
