-- Create a function to check test series creation limits and create a test series
create or replace function create_test_series_with_usage_check(
  p_title text,
  p_description text,
  p_creator_id uuid,
  p_is_public boolean default false,
  p_estimated_duration integer default null,
  p_tags text[] default null
)
returns setof test_series
language plpgsql
security definer
as $$
declare
  v_user_plan text;
  v_tests_created_today integer;
  v_max_tests integer;
  v_new_test_series test_series;
begin
  -- Get user's subscription plan
  select plan_id into v_user_plan
  from subscriptions
  where user_id = p_creator_id
  order by created_at desc
  limit 1;
  
  -- If no subscription found, use 'free' plan
  v_user_plan := coalesce(v_user_plan, 'free');
  
  -- Get the number of tests created by the user today
  select count(*) into v_tests_created_today
  from test_series
  where creator_id = p_creator_id
  and created_at >= date_trunc('day', now());
  
  -- Set max tests based on plan
  case v_user_plan
    when 'free' then v_max_tests := 3;  -- Free plan: 3 tests per day
    when 'weekly' then v_max_tests := 20; -- Weekly plan: 20 tests per day
    when 'monthly' then v_max_tests := 100; -- Monthly plan: 100 tests per day
    when 'quarterly' then v_max_tests := 1000; -- Quarterly plan: 1000 tests per day
    else v_max_tests := 3; -- Default to free plan limits
  end case;
  
  -- Check if user has reached their daily limit
  if v_tests_created_today >= v_max_tests then
    raise exception using 
      errcode = 'P0001',
      message = format('You have reached your daily test creation limit of %s tests for the %s plan', v_max_tests, v_user_plan);
  end if;
  
  -- Create the test series
  insert into test_series (
    title,
    description,
    creator_id,
    is_public,
    estimated_duration_minutes,
    tags
  ) values (
    p_title,
    p_description,
    p_creator_id,
    p_is_public,
    p_estimated_duration,
    p_tags
  )
  returning * into v_new_test_series;
  
  -- Record the usage
  insert into user_usage (
    id,
    user_id,
    tests_created,
    last_reset_date,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    p_creator_id,
    1,
    date_trunc('day', now()),
    now(),
    now()
  )
  on conflict (user_id)
  do update set 
    tests_created = user_usage.tests_created + 1,
    updated_at = now();
  
  -- Return the created test series
  return next v_new_test_series;
  
exception
    when others then
      raise;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function create_test_series_with_usage_check to authenticated;
