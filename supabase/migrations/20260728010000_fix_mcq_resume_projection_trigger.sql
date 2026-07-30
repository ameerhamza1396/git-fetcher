create or replace function public.project_latest_mcq_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chapter_id uuid;
  v_is_first_attempt boolean := false;
begin
  select chapter_id into v_chapter_id
  from public.mcqs
  where id = new.mcq_id;

  if v_chapter_id is null then
    return new;
  end if;

  insert into public.user_mcq_latest_answers (
    user_id,
    mcq_id,
    chapter_id,
    selected_answer,
    is_correct,
    attempted_at
  )
  values (
    new.user_id,
    new.mcq_id,
    v_chapter_id,
    new.selected_answer,
    new.is_correct,
    coalesce(new.created_at, now())
  )
  on conflict (user_id, mcq_id) do nothing;

  v_is_first_attempt := found;

  if not v_is_first_attempt then
    update public.user_mcq_latest_answers
    set
      selected_answer = new.selected_answer,
      is_correct = new.is_correct,
      attempted_at = coalesce(new.created_at, now())
    where user_id = new.user_id
      and mcq_id = new.mcq_id
      and attempted_at <= coalesce(new.created_at, now());
  end if;

  insert into public.user_chapter_mcq_state (
    user_id,
    chapter_id,
    attempted_count,
    last_mcq_id,
    last_attempted_at
  )
  values (
    new.user_id,
    v_chapter_id,
    case when v_is_first_attempt then 1 else 0 end,
    new.mcq_id,
    coalesce(new.created_at, now())
  )
  on conflict (user_id, chapter_id) do update set
    attempted_count = public.user_chapter_mcq_state.attempted_count
      + case when v_is_first_attempt then 1 else 0 end,
    last_mcq_id = case
      when public.user_chapter_mcq_state.last_attempted_at is null
        or public.user_chapter_mcq_state.last_attempted_at <= excluded.last_attempted_at
      then excluded.last_mcq_id
      else public.user_chapter_mcq_state.last_mcq_id
    end,
    last_attempted_at = greatest(
      public.user_chapter_mcq_state.last_attempted_at,
      excluded.last_attempted_at
    );

  return new;
end;
$$;

drop trigger if exists project_latest_mcq_answer_trigger
  on public.user_answers;

create trigger project_latest_mcq_answer_trigger
after insert or update of selected_answer, is_correct on public.user_answers
for each row execute function public.project_latest_mcq_answer();
