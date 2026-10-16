-- Serialize course/lesson reservations for a learner so concurrent requests
-- cannot both spend the final remaining generation. The server supplies the
-- limit from src/config/limits.ts; no plan limits are duplicated in SQL.
create or replace function public.reserve_learning_generation(p_limit integer, p_topic text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  learner uuid := auth.uid();
  used integer;
  reservation uuid;
begin
  if learner is null or p_limit is null or p_limit <= 0 then
    raise exception 'Authentication and a valid generation limit are required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(learner::text, 0));
  select count(*) into used from public.user_interactions
    where user_id = learner
      and interaction_type in ('learning_path_generation', 'problem_generation', 'insight')
      and created_date = (now() at time zone 'UTC')::date;
  if used >= p_limit then
    return null;
  end if;
  insert into public.user_interactions(user_id, interaction_type, topic)
    values (learner, 'learning_path_generation', left(p_topic, 160))
    returning id into reservation;
  return reservation;
end;
$$;
revoke all on function public.reserve_learning_generation(integer, text) from public, anon;
grant execute on function public.reserve_learning_generation(integer, text) to authenticated;
