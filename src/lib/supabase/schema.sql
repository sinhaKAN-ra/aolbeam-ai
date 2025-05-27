-- Create payments table
create table if not exists payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  order_id text not null,
  payment_method text not null,
  status text not null,
  amount decimal(10,2) not null,
  currency text not null,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create subscriptions table
create table if not exists subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  order_id text not null,
  status text not null,
  plan_id text not null,
  payment_method text not null,
  start_date timestamp with time zone default timezone('utc'::text, now()) not null,
  end_date timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create RLS policies
alter table payments enable row level security;
alter table subscriptions enable row level security;

-- Payments policies
create policy "Users can view their own payments"
  on payments for select
  using (auth.uid() = user_id);

create policy "Users can insert their own payments"
  on payments for insert
  with check (auth.uid() = user_id);

-- Subscriptions policies
create policy "Users can view their own subscriptions"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own subscriptions"
  on subscriptions for insert
  with check (auth.uid() = user_id); 