-- user_profiles: per-user profile + subscription state.
-- The app code reads/writes this table (src/app/api/interactions/check,
-- src/app/page.tsx, pricing, payment webhooks) but no migration existed —
-- a fresh Supabase project would 500 on /api/interactions/check without it.
-- Columns match src/types/supabase.ts (the canonical generated schema).

create table if not exists public.user_profiles (
  id                        uuid primary key references auth.users (id) on delete cascade,
  email                     text not null default '',
  full_name                 text not null default '',
  is_subscribed             boolean not null default false,
  subscription_plan_id      text,
  subscription_started_at   timestamptz,
  subscription_ends_at      timestamptz,
  interaction_count         integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Row Level Security: a user may only see and modify their own profile.
alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles for select
  using (auth.uid() = id);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  with check (auth.uid() = id);

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- keep updated_at fresh on every update
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up, so the app never
-- has to race to create one. SECURITY DEFINER bypasses RLS for the insert.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1), 'User')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
