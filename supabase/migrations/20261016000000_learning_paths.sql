-- Course outlines, generated lessons and progress all belong to the signed-in learner.
create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Learning path',
  description text not null default '',
  topic text not null default '',
  main_topic text not null default '',
  steps jsonb not null default '[]'::jsonb,
  current_step integer not null default 0,
  total_steps integer not null default 0,
  estimated_hours integer,
  difficulty text not null default 'beginner',
  completed_topics text[] not null default '{}',
  suggested_topics jsonb not null default '[]'::jsonb,
  is_custom_path boolean not null default true,
  goals text[] not null default '{}',
  timeline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Support older installations that created the original partial table manually.
alter table public.learning_paths
  add column if not exists title text not null default 'Learning path',
  add column if not exists description text not null default '',
  add column if not exists topic text not null default '',
  add column if not exists steps jsonb not null default '[]'::jsonb,
  add column if not exists estimated_hours integer,
  add column if not exists difficulty text not null default 'beginner',
  add column if not exists updated_at timestamptz not null default now();
create index if not exists learning_paths_owner_date_idx on public.learning_paths (user_id, created_at desc);
alter table public.learning_paths enable row level security;
drop policy if exists "Learners read own paths" on public.learning_paths;
create policy "Learners read own paths" on public.learning_paths for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Learners create own paths" on public.learning_paths;
create policy "Learners create own paths" on public.learning_paths for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Learners update own paths" on public.learning_paths;
create policy "Learners update own paths" on public.learning_paths for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Learners delete own paths" on public.learning_paths;
create policy "Learners delete own paths" on public.learning_paths for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.learning_paths to authenticated;
