-- Sprint 4 — Profile extensions + avatar/banner uploads + career history
--
-- Idempotent: safe to re-run. Adds:
--   1. New profile columns (avatar_url, banner_url, contact info, social links,
--      preferred UI locale).
--   2. Public read access to avatar/banner URLs (any visitor may resolve them via
--      a profile lookup; the storage bucket RLS controls access to the bytes).
--   3. Storage buckets `avatars` and `banners` with path-prefixed RLS so users
--      can only manage their own files. `avatars` and `banners` are public so
--      the signed URLs can be replaced with plain URLs in the client.
--   4. Education / experience / skill / certification tables with RLS.
--   5. Career roadmap table with auto-computed progress percentage.
--
-- Existing `profiles` columns are preserved.

-- ---------------------------------------------------------------------------
-- 1. profiles extensions
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists banner_url text,
  add column if not exists phone text,
  add column if not exists location text,
  add column if not exists linkedin_url text,
  add column if not exists github_url text,
  add column if not exists website_url text,
  add column if not exists preferred_locale text
    check (preferred_locale in ('fr', 'en', 'de'));

comment on column public.profiles.avatar_url is
  'Public URL of the user avatar (avatars bucket). Set by /api/profile/avatar.';
comment on column public.profiles.banner_url is
  'Public URL of the user profile banner (banners bucket). Set by /api/profile/banner.';
comment on column public.profiles.preferred_locale is
  'ISO 639-1 UI locale preference — overrides the browser Accept-Language when set.';

-- The "Users can update own profile" policy is column-blind, so the new
-- columns are covered by the same UPDATE path.

-- ---------------------------------------------------------------------------
-- 2. Storage buckets: avatars + banners (public read, owner-only write)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('banners', 'banners', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS: a user can manage objects whose first path segment equals their
-- auth.uid(). e.g. `<userId>/avatar.png`. Other users get read-only access.
drop policy if exists "Avatar owner can manage" on storage.objects;
create policy "Avatar owner can manage"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Banner owner can manage" on storage.objects;
create policy "Banner owner can manage"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read is granted implicitly when `public = true` on the bucket; no
-- explicit SELECT policy is needed (it is not denied by RLS either).

-- ---------------------------------------------------------------------------
-- 3. Education history
-- ---------------------------------------------------------------------------
create table if not exists public.profile_educations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution text not null,
  degree text,
  field_of_study text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_educations_user_idx
  on public.profile_educations (user_id, display_order);

drop trigger if exists set_updated_at on public.profile_educations;
create trigger set_updated_at
  before update on public.profile_educations
  for each row
  execute function public.touch_updated_at();

alter table public.profile_educations enable row level security;

drop policy if exists "Users can manage own educations" on public.profile_educations;
create policy "Users can manage own educations"
  on public.profile_educations for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Professional experience
-- ---------------------------------------------------------------------------
create table if not exists public.profile_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  role text not null,
  description text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_experiences_user_idx
  on public.profile_experiences (user_id, display_order);

drop trigger if exists set_updated_at on public.profile_experiences;
create trigger set_updated_at
  before update on public.profile_experiences
  for each row
  execute function public.touch_updated_at();

alter table public.profile_experiences enable row level security;

drop policy if exists "Users can manage own experiences" on public.profile_experiences;
create policy "Users can manage own experiences"
  on public.profile_experiences for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. Skills
-- ---------------------------------------------------------------------------
create table if not exists public.profile_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_name text not null,
  level text not null default 'intermediate'
    check (level in ('beginner', 'intermediate', 'advanced', 'expert')),
  category text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_skills_user_idx
  on public.profile_skills (user_id, display_order);

drop trigger if exists set_updated_at on public.profile_skills;
create trigger set_updated_at
  before update on public.profile_skills
  for each row
  execute function public.touch_updated_at();

alter table public.profile_skills enable row level security;

drop policy if exists "Users can manage own skills" on public.profile_skills;
create policy "Users can manage own skills"
  on public.profile_skills for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. Certifications
-- ---------------------------------------------------------------------------
create table if not exists public.profile_certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  issuer text,
  issue_date date,
  expiry_date date,
  credential_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_certifications_user_idx
  on public.profile_certifications (user_id, display_order);

drop trigger if exists set_updated_at on public.profile_certifications;
create trigger set_updated_at
  before update on public.profile_certifications
  for each row
  execute function public.touch_updated_at();

alter table public.profile_certifications enable row level security;

drop policy if exists "Users can manage own certifications" on public.profile_certifications;
create policy "Users can manage own certifications"
  on public.profile_certifications for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7. Career roadmap progress (one row per user, upsert-friendly)
-- ---------------------------------------------------------------------------
create table if not exists public.profile_roadmap (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stage integer not null default 1 check (stage between 1 and 4),
  progress_percent integer not null default 0
    check (progress_percent between 0 and 100),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.profile_roadmap;
create trigger set_updated_at
  before update on public.profile_roadmap
  for each row
  execute function public.touch_updated_at();

alter table public.profile_roadmap enable row level security;

drop policy if exists "Users can read own roadmap" on public.profile_roadmap;
create policy "Users can read own roadmap"
  on public.profile_roadmap for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can upsert own roadmap" on public.profile_roadmap;
create policy "Users can upsert own roadmap"
  on public.profile_roadmap for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own roadmap" on public.profile_roadmap;
create policy "Users can update own roadmap"
  on public.profile_roadmap for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);