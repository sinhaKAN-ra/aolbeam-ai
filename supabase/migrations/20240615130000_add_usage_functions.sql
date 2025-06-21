-- Function to get or create user usage record
create or replace function get_or_create_user_usage(p_user_id uuid)
returns setof user_usage
language plpgsql
security definer
as $$
begin
  return query
  insert into user_usage (user_id, usage_date, chat_interactions_today, tests_created)
  values (p_user_id, date_trunc('day', now() at time zone 'UTC'), 0, 0)
  on conflict (user_id, usage_date)
  do update set user_id = excluded.user_id
  returning *;
end;
$$;

-- Function to get user usage with plan limits
create or replace function get_user_usage(p_user_id uuid, p_plan_id text)
returns table (
  user_id uuid,
  usage_date date,
  chat_interactions_today integer,
  tests_created integer,
  chat_limit integer,
  test_limit integer,
  remaining_chat integer,
  remaining_tests integer
)
language plpgsql
security definer
as $$
begin
  -- Define plan limits
  declare
    v_chat_limit integer;
    v_test_limit integer;
  begin
    -- Set limits based on plan
    case p_plan_id
      when 'free' then 
        v_chat_limit := 15;
        v_test_limit := 5;
      when 'weekly' then
        v_chat_limit := 50;
        v_test_limit := 10;
      when 'monthly' then
        v_chat_limit := 100;
        v_test_limit := 20;
      when 'quarterly' then
        v_chat_limit := 200;
        v_test_limit := 30;
      else
        v_chat_limit := 15; -- Default to free limits
        v_test_limit := 5;
    end case;
    
    -- Get or create usage record
    return query
    with usage as (
      select 
        user_id,
        usage_date,
        coalesce(chat_interactions_today, 0) as chat_interactions_today,
        coalesce(tests_created, 0) as tests_created
      from get_or_create_user_usage(p_user_id)
    )
    select 
      u.user_id,
      u.usage_date,
      u.chat_interactions_today,
      u.tests_created,
      v_chat_limit as chat_limit,
      v_test_limit as test_limit,
      greatest(0, v_chat_limit - u.chat_interactions_today) as remaining_chat,
      greatest(0, v_test_limit - u.tests_created) as remaining_tests
    from usage u;
  end;
end;
$$;

-- Function to increment usage for a specific feature
create or replace function increment_usage(p_user_id uuid, p_feature text)
returns setof user_usage
language plpgsql
security definer
as $$
begin
  -- Get or create usage record first to ensure it exists
  perform from get_or_create_user_usage(p_user_id);
  
  -- Increment the appropriate counter
  if p_feature = 'chat' then
    return query
    update user_usage
    set 
      chat_interactions_today = chat_interactions_today + 1,
      updated_at = now()
    where 
      user_id = p_user_id
      and usage_date = date_trunc('day', now() at time zone 'UTC')
    returning *;
  elsif p_feature = 'test_creation' then
    return query
    update user_usage
    set 
      tests_created = tests_created + 1,
      updated_at = now()
    where 
      user_id = p_user_id
      and usage_date = date_trunc('day', now() at time zone 'UTC')
    returning *;
  else
    raise exception 'Invalid feature: %', p_feature;
  end if;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function get_or_create_user_usage(uuid) to authenticated;
grant execute on function get_user_usage(uuid, text) to authenticated;
grant execute on function increment_usage(uuid, text) to authenticated;
