-- Fresh-project schema must support the history fields written by app/page.tsx.
-- An interaction is an event, so multiple events per user/type/day are valid.
alter table public.user_interactions
  drop constraint if exists user_interactions_user_id_interaction_type_created_date_key;

alter table public.user_interactions
  add column if not exists topic text,
  add column if not exists problem_type text,
  add column if not exists difficulty text,
  add column if not exists problem_statement text,
  add column if not exists answer_format text,
  add column if not exists multiple_choice_options jsonb,
  add column if not exists correct_answer text,
  add column if not exists user_answer text,
  add column if not exists selected_option text,
  add column if not exists evaluation_is_correct boolean,
  add column if not exists evaluation_feedback text,
  add column if not exists evaluation_correct_answer_detail text,
  add column if not exists evaluation_explanation_detail text,
  add column if not exists is_topic_revised boolean default false,
  add column if not exists topic_details_content text,
  add column if not exists feedback_rating integer,
  add column if not exists feedback_comment text,
  add column if not exists time_taken_seconds integer;

create index if not exists user_interactions_usage_idx
  on public.user_interactions (user_id, interaction_type, created_date);

alter table public.user_interactions enable row level security;
create policy "Users can view their own interactions"
  on public.user_interactions for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can insert their own interactions"
  on public.user_interactions for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update their own interactions"
  on public.user_interactions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.user_interactions to authenticated;
