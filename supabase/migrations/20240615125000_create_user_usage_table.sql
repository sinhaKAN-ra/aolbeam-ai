-- Create user_usage table to track feature usage
create table if not exists public.user_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  usage_date date not null,
  chat_interactions_today integer not null default 0,
  tests_created integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint user_usage_user_id_usage_date_key unique (user_id, usage_date)
);

-- Enable RLS
alter table public.user_usage enable row level security;

-- Create indexes
create index if not exists idx_user_usage_user_id on public.user_usage(user_id);
create index if not exists idx_user_usage_usage_date on public.user_usage(usage_date);

-- Create RLS policies
create policy "Users can view their own usage"
on public.user_usage for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own usage"
on public.user_usage for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own usage"
on public.user_usage for update
to authenticated
using (auth.uid() = user_id);

-- Create a trigger to update the updated_at column
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_user_usage_updated
  before update on public.user_usage
  for each row execute function public.handle_updated_at();

-- Grant permissions
grant select, insert, update on public.user_usage to authenticated;
