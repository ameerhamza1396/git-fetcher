-- MCQ production performance and idempotency helpers.

alter table public.user_answers
  add column if not exists client_attempt_id text;

create unique index if not exists user_answers_client_attempt_id_key
  on public.user_answers (client_attempt_id)
  where client_attempt_id is not null;

create index if not exists user_answers_user_mcq_created_idx
  on public.user_answers (user_id, mcq_id, created_at desc);

create table if not exists public.user_mcq_latest_answers (
  user_id uuid not null references auth.users(id) on delete cascade,
  mcq_id uuid not null references public.mcqs(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  selected_answer text not null,
  is_correct boolean not null default false,
  attempted_at timestamptz not null default now(),
  primary key (user_id, mcq_id)
);

create index if not exists user_mcq_latest_chapter_idx
  on public.user_mcq_latest_answers (user_id, chapter_id);

alter table public.user_mcq_latest_answers enable row level security;

drop policy if exists "Users can read their latest MCQ answers"
  on public.user_mcq_latest_answers;
create policy "Users can read their latest MCQ answers"
  on public.user_mcq_latest_answers
  for select
  using (auth.uid() = user_id);

create table if not exists public.user_chapter_mcq_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  attempted_count integer not null default 0,
  last_mcq_id uuid references public.mcqs(id) on delete set null,
  last_attempted_at timestamptz,
  primary key (user_id, chapter_id)
);

alter table public.user_chapter_mcq_state enable row level security;

drop policy if exists "Users can read their MCQ chapter state"
  on public.user_chapter_mcq_state;
create policy "Users can read their MCQ chapter state"
  on public.user_chapter_mcq_state
  for select
  using (auth.uid() = user_id);

insert into public.user_mcq_latest_answers (
  user_id,
  mcq_id,
  chapter_id,
  selected_answer,
  is_correct,
  attempted_at
)
select distinct on (ua.user_id, ua.mcq_id)
  ua.user_id,
  ua.mcq_id,
  m.chapter_id,
  ua.selected_answer,
  ua.is_correct,
  ua.created_at
from public.user_answers ua
join auth.users auth_user on auth_user.id = ua.user_id
join public.mcqs m on m.id = ua.mcq_id
order by ua.user_id, ua.mcq_id, ua.created_at desc
on conflict (user_id, mcq_id) do update set
  chapter_id = excluded.chapter_id,
  selected_answer = excluded.selected_answer,
  is_correct = excluded.is_correct,
  attempted_at = excluded.attempted_at
where public.user_mcq_latest_answers.attempted_at <= excluded.attempted_at;

insert into public.user_chapter_mcq_state (
  user_id,
  chapter_id,
  attempted_count,
  last_mcq_id,
  last_attempted_at
)
select
  latest.user_id,
  latest.chapter_id,
  count(*)::integer,
  (array_agg(latest.mcq_id order by latest.attempted_at desc))[1],
  max(latest.attempted_at)
from public.user_mcq_latest_answers latest
group by latest.user_id, latest.chapter_id
on conflict (user_id, chapter_id) do update set
  attempted_count = excluded.attempted_count,
  last_mcq_id = excluded.last_mcq_id,
  last_attempted_at = excluded.last_attempted_at;

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

create or replace function public.consume_mcq_submission(
  p_subject_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan text;
  v_count integer;
  v_reset timestamptz;
  v_is_free_unlimited boolean := false;
  v_today date := (now() at time zone 'Asia/Karachi')::date;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select
    lower(coalesce(plan::text, 'free')),
    coalesce(daily_mcq_submissions, 0),
    last_submission_reset_date
  into v_plan, v_count, v_reset
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  select coalesce(free_unlimited_access, false)
  into v_is_free_unlimited
  from public.subjects
  where id = p_subject_id;

  if v_plan <> 'free' or v_is_free_unlimited then
    return jsonb_build_object('allowed', true, 'count', v_count, 'limited', false);
  end if;

  if v_reset is null or (v_reset at time zone 'Asia/Karachi')::date <> v_today then
    v_count := 0;
    v_reset := now();
  end if;

  if v_count >= 50 then
    return jsonb_build_object('allowed', false, 'count', v_count, 'limited', true);
  end if;

  v_count := v_count + 1;
  update public.profiles
  set
    daily_mcq_submissions = v_count,
    last_submission_reset_date = v_reset
  where id = v_user_id;

  return jsonb_build_object('allowed', true, 'count', v_count, 'limited', true);
end;
$$;

revoke all on function public.consume_mcq_submission(uuid) from public;
grant execute on function public.consume_mcq_submission(uuid) to authenticated;

create or replace function public.reconcile_mcq_submission_count(
  p_attempt_date date,
  p_count integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_count integer;
  v_reset timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select
    coalesce(daily_mcq_submissions, 0),
    last_submission_reset_date
  into v_count, v_reset
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if p_attempt_date <> v_today then
    return v_count;
  end if;

  if v_reset is null or (v_reset at time zone 'Asia/Karachi')::date <> v_today then
    v_count := 0;
  end if;

  v_count := greatest(v_count, least(greatest(coalesce(p_count, 0), 0), 50));
  update public.profiles
  set
    daily_mcq_submissions = v_count,
    last_submission_reset_date = now()
  where id = v_user_id;

  return v_count;
end;
$$;

revoke all on function public.reconcile_mcq_submission_count(date, integer) from public;
grant execute on function public.reconcile_mcq_submission_count(date, integer) to authenticated;

create or replace function public.get_mcq_chapter_progress(
  p_chapter_ids uuid[]
)
returns table(chapter_id uuid, attempted_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select m.chapter_id, count(distinct ua.mcq_id)::bigint
  from public.user_answers ua
  join public.mcqs m on m.id = ua.mcq_id
  where ua.user_id = auth.uid()
    and m.chapter_id = any(p_chapter_ids)
  group by m.chapter_id;
$$;

revoke all on function public.get_mcq_chapter_progress(uuid[]) from public;
grant execute on function public.get_mcq_chapter_progress(uuid[]) to authenticated;

create or replace function public.get_mcq_chapter_latest_answers(
  p_chapter_id uuid
)
returns table(mcq_id uuid, selected_answer text)
language sql
stable
security definer
set search_path = public
as $$
  select latest.mcq_id, latest.selected_answer
  from public.user_mcq_latest_answers latest
  where latest.user_id = auth.uid()
    and latest.chapter_id = p_chapter_id;
$$;

revoke all on function public.get_mcq_chapter_latest_answers(uuid) from public;
grant execute on function public.get_mcq_chapter_latest_answers(uuid) to authenticated;

create or replace function public.get_mcq_resume_snapshots(
  p_chapter_ids uuid[]
)
returns table(
  chapter_id uuid,
  attempted_count integer,
  last_mcq_id uuid,
  attempted_mcq_ids uuid[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    state.chapter_id,
    state.attempted_count,
    state.last_mcq_id,
    coalesce(
      array_agg(latest.mcq_id) filter (where latest.mcq_id is not null),
      '{}'::uuid[]
    ) as attempted_mcq_ids
  from public.user_chapter_mcq_state state
  left join public.user_mcq_latest_answers latest
    on latest.user_id = state.user_id
   and latest.chapter_id = state.chapter_id
  where state.user_id = auth.uid()
    and state.chapter_id = any(p_chapter_ids)
  group by state.chapter_id, state.attempted_count, state.last_mcq_id;
$$;

revoke all on function public.get_mcq_resume_snapshots(uuid[]) from public;
grant execute on function public.get_mcq_resume_snapshots(uuid[]) to authenticated;

create or replace function public.get_mcq_practice_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with ordered_answers as (
    select
      is_correct,
      coalesce(time_taken, 0) as time_taken,
      created_at,
      row_number() over (order by created_at) -
      row_number() over (partition by is_correct order by created_at) as streak_group
    from public.user_answers
    where user_id = auth.uid()
  ),
  summary as (
    select
      count(*)::integer as total_questions,
      count(*) filter (where is_correct)::integer as correct_answers,
      coalesce(round(avg(time_taken)), 0)::integer as average_time
    from ordered_answers
  ),
  streaks as (
    select coalesce(max(streak_count), 0)::integer as best_streak
    from (
      select count(*)::integer as streak_count
      from ordered_answers
      where is_correct
      group by streak_group
    ) grouped_streaks
  )
  select jsonb_build_object(
    'totalQuestions', summary.total_questions,
    'correctAnswers', summary.correct_answers,
    'accuracy', case
      when summary.total_questions = 0 then 0
      else round(summary.correct_answers::numeric * 100 / summary.total_questions)::integer
    end,
    'averageTime', summary.average_time,
    'bestStreak', streaks.best_streak
  )
  from summary cross join streaks;
$$;

revoke all on function public.get_mcq_practice_summary() from public;
grant execute on function public.get_mcq_practice_summary() to authenticated;

create or replace function public.upsert_mcq_answers(
  p_answers jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_answers (
    user_id,
    mcq_id,
    selected_answer,
    is_correct,
    time_taken,
    used_ai_help,
    correction_mode,
    client_attempt_id
  )
  select
    v_user_id,
    (item->>'mcq_id')::uuid,
    item->>'selected_answer',
    coalesce((item->>'is_correct')::boolean, false),
    coalesce((item->>'time_taken')::integer, 0),
    coalesce((item->>'used_ai_help')::boolean, false),
    coalesce((item->>'correction_mode')::boolean, false),
    item->>'client_attempt_id'
  from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) item
  on conflict (client_attempt_id)
    where client_attempt_id is not null
  do update set
    selected_answer = excluded.selected_answer,
    is_correct = excluded.is_correct,
    time_taken = excluded.time_taken,
    used_ai_help = excluded.used_ai_help,
    correction_mode = excluded.correction_mode
  where public.user_answers.user_id = v_user_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.upsert_mcq_answers(jsonb) from public;
grant execute on function public.upsert_mcq_answers(jsonb) to authenticated;

create or replace function public.save_mcq_answer(
  p_answer jsonb,
  p_subject_id uuid,
  p_counts_toward_daily_limit boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_answer_id uuid;
  v_existing_id uuid;
  v_quota jsonb := null;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_answers (
    user_id,
    mcq_id,
    selected_answer,
    is_correct,
    time_taken,
    used_ai_help,
    correction_mode,
    client_attempt_id
  )
  values (
    v_user_id,
    (p_answer->>'mcq_id')::uuid,
    p_answer->>'selected_answer',
    coalesce((p_answer->>'is_correct')::boolean, false),
    coalesce((p_answer->>'time_taken')::integer, 0),
    coalesce((p_answer->>'used_ai_help')::boolean, false),
    coalesce((p_answer->>'correction_mode')::boolean, false),
    p_answer->>'client_attempt_id'
  )
  on conflict (client_attempt_id)
    where client_attempt_id is not null
  do nothing
  returning id into v_answer_id;

  if v_answer_id is null then
    select id
    into v_existing_id
    from public.user_answers
    where client_attempt_id = p_answer->>'client_attempt_id'
      and user_id = v_user_id;

    if v_existing_id is null then
      raise exception 'Attempt identifier belongs to another user';
    end if;

    update public.user_answers
    set
      selected_answer = p_answer->>'selected_answer',
      is_correct = coalesce((p_answer->>'is_correct')::boolean, false),
      time_taken = coalesce((p_answer->>'time_taken')::integer, 0),
      used_ai_help = coalesce((p_answer->>'used_ai_help')::boolean, false),
      correction_mode = coalesce((p_answer->>'correction_mode')::boolean, false)
    where id = v_existing_id;
  elsif p_counts_toward_daily_limit then
    v_quota := public.consume_mcq_submission(p_subject_id);
  end if;

  return jsonb_build_object(
    'saved', true,
    'duplicate', v_answer_id is null,
    'quota', v_quota
  );
end;
$$;

revoke all on function public.save_mcq_answer(jsonb, uuid, boolean) from public;
grant execute on function public.save_mcq_answer(jsonb, uuid, boolean) to authenticated;
