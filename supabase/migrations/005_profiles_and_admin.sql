-- Sprint 3.1 — Profiles table + admin roles + signup automation
--
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor),
-- or with the Supabase CLI: supabase db push / psql -f <this file>.
-- Idempotent: safe to re-run.
--
-- Formalizes the `profiles` table (previously created manually in Sprint 1
-- and absent from version control — see architecture review §3.2) and lays
-- the admin-role foundation for the upcoming Admin Dashboard:
--   1. one `profiles` row per auth user, auto-created on signup;
--   2. `role` column ('user' | 'admin') protected against self-escalation;
--   3. RLS: self read/update, admin read-all, insert policy so the app's
--      profile upsert (src/lib/supabase/profiles.ts) keeps working;
--   4. `updated_at` maintained automatically by trigger.
--
-- NOTE: `headline` and `bio` are nullable columns required by the existing
-- application code (getProfileById / updateProfileById) — keep them in sync
-- with src/types/profile.ts.

-- ---------------------------------------------------------------------------
-- 1. profiles table: one row per auth user (cascade-deleted with the account)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  headline text,
  bio text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pre-existing manually-created tables may be missing newer columns
-- (idempotent catch-up; no-ops on a fresh database).
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles
  add column if not exists role text not null default 'user';
alter table public.profiles
  add column if not exists created_at timestamptz not null default now();
alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- Re-assert the role whitelist (drop + add keeps re-runs safe).
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

-- Backfill: create a profile for every pre-existing auth user that does not
-- have one yet (on conflict do nothing keeps re-runs and existing data safe).
insert into public.profiles (id, full_name)
select u.id, nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')
from auth.users u
on conflict (id) do nothing;

comment on table public.profiles is
  'Application profile of an auth user, auto-created on signup. `role` drives admin capabilities; only administrators may change it.';

comment on column public.profiles.role is
  'Authorization role: ''user'' (default) or ''admin''. Self-escalation is blocked by the enforce_profile_role_integrity trigger.';

-- ---------------------------------------------------------------------------
-- 2. Admin helper: secure, definer-owned role check usable inside RLS policies
--
--    security definer avoids RLS recursion (the function reads profiles while
--    policies on profiles reference it). auth.uid() is NULL for service-role
--    / direct-DB sessions — those bypass RLS anyway, so no admin check needed.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'True when the caller is an authenticated admin (profiles.role = ''admin''). Used by RLS policies; never grants privileges on its own.';

-- Partial index mirroring the is_admin() lookup (matches the migration 002
-- style: doubles as the lookup index for admin-listing queries).
create index if not exists profiles_admin_role_idx
  on public.profiles (role)
  where role = 'admin';

-- ---------------------------------------------------------------------------
-- 3. updated_at maintenance: BEFORE UPDATE trigger stamps the column
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.touch_updated_at() is
  'Keeps profiles.updated_at accurate: stamped automatically on every UPDATE.';

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row
  execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Signup automation: create the profile row when a user registers
--
--    security definer so the insert runs with table-owner rights (bypasses
--    RLS deterministically). full_name comes from the signup metadata
--    (supabase.auth.signUp options.data.full_name in src/app/signup/page.tsx).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Auto-provisions a profiles row (role = ''user'') whenever a new auth user is created.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Role integrity: block privilege escalation through the UPDATE policy
--
--    The "Users can update own profile" policy below is column-blind: without
--    this trigger, any authenticated user could PATCH role = 'admin' on their
--    own row. Rules:
--      - a client session (auth.uid() is not null) may never INSERT a profile
--        with a privileged role;
--      - only an admin caller (or a service-role / direct-DB session, where
--        auth.uid() is null) may CHANGE an existing role.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_profile_role_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.role <> 'user' then
    if auth.uid() is not null then
      raise exception 'Profiles must be created with the default role.';
    end if;
  elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
    if auth.uid() is null
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
      return new; -- legit administrator or service-role / direct-DB operation
    end if;
    raise exception 'Only administrators can change profile roles.';
  end if;
  return new;
end;
$$;

comment on function public.enforce_profile_role_integrity() is
  'Prevents non-admin authenticated callers from creating or promoting themselves to an admin profile.';

drop trigger if exists enforce_profile_role_integrity on public.profiles;
create trigger enforce_profile_role_integrity
  before insert or update of role on public.profiles
  for each row
  execute function public.enforce_profile_role_integrity();

-- ---------------------------------------------------------------------------
-- 6. RLS: self read/update, admin read-all, self insert (app upsert support)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Users can select own profile" on public.profiles;
create policy "Users can select own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- The app updates profiles via .upsert() (INSERT ... ON CONFLICT DO UPDATE):
-- when the row is missing, the INSERT path needs its own policy.
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

