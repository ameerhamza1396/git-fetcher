alter table public.chapters
  add column if not exists is_locked boolean not null default false,
  add column if not exists lock_message text,
  add column if not exists lock_updated_at timestamptz,
  add column if not exists lock_updated_by uuid references auth.users(id) on delete set null;

-- Preserve locks if the earlier table-based draft was applied.
do $$
begin
  if to_regclass('public.mcq_chapter_locks') is not null then
    execute $migration$
      update public.chapters chapter
      set
        is_locked = legacy.is_locked,
        lock_message = legacy.message,
        lock_updated_at = legacy.updated_at,
        lock_updated_by = legacy.updated_by
      from public.mcq_chapter_locks legacy
      where chapter.id = legacy.chapter_id
    $migration$;
  end if;
end;
$$;

drop table if exists public.mcq_chapter_locks cascade;

create or replace function public.is_mcq_lock_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and lower(coalesce(role::text, '')) = 'admin'
      and lower(coalesce(username, '')) = 'medmacs-supers'
  );
$$;

revoke all on function public.is_mcq_lock_admin() from public;
grant execute on function public.is_mcq_lock_admin() to authenticated;

create or replace function public.get_mcq_chapter_access(
  p_chapter_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'allowed', not coalesce(chapter.is_locked, false),
    'message', case
      when coalesce(chapter.is_locked, false)
      then coalesce(
        nullif(chapter.lock_message, ''),
        'This chapter is temporarily unavailable.'
      )
      else null
    end
  )
  from public.chapters chapter
  where chapter.id = p_chapter_id;
$$;

revoke all on function public.get_mcq_chapter_access(uuid) from public;
grant execute on function public.get_mcq_chapter_access(uuid) to authenticated;

create or replace function public.admin_list_mcq_chapter_locks()
returns table(
  chapter_id uuid,
  is_locked boolean,
  message text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_mcq_lock_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select
    chapter.id,
    chapter.is_locked,
    coalesce(
      nullif(chapter.lock_message, ''),
      'This chapter is temporarily unavailable.'
    ),
    chapter.lock_updated_at
  from public.chapters chapter
  where chapter.is_locked or chapter.lock_message is not null;
end;
$$;

revoke all on function public.admin_list_mcq_chapter_locks() from public;
grant execute on function public.admin_list_mcq_chapter_locks() to authenticated;

create or replace function public.admin_set_mcq_chapter_lock(
  p_chapter_id uuid,
  p_is_locked boolean,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message text;
begin
  if not public.is_mcq_lock_admin() then
    raise exception 'Administrator access required';
  end if;

  v_message := left(
    coalesce(
      nullif(trim(p_message), ''),
      'This chapter is temporarily unavailable.'
    ),
    500
  );

  update public.chapters
  set
    is_locked = p_is_locked,
    lock_message = v_message,
    lock_updated_at = now(),
    lock_updated_by = auth.uid()
  where id = p_chapter_id;

  if not found then
    raise exception 'Chapter not found';
  end if;

  return jsonb_build_object(
    'chapterId', p_chapter_id,
    'locked', p_is_locked,
    'message', v_message
  );
end;
$$;

revoke all on function public.admin_set_mcq_chapter_lock(uuid, boolean, text) from public;
grant execute on function public.admin_set_mcq_chapter_lock(uuid, boolean, text) to authenticated;

create or replace function public.reject_locked_mcq_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_message text;
begin
  select coalesce(
    nullif(chapter.lock_message, ''),
    'This chapter is temporarily unavailable.'
  )
  into v_lock_message
  from public.mcqs mcq
  join public.chapters chapter on chapter.id = mcq.chapter_id
  where mcq.id = new.mcq_id
    and chapter.is_locked;

  if v_lock_message is not null then
    raise exception 'CHAPTER_LOCKED: %', v_lock_message;
  end if;

  return new;
end;
$$;

drop trigger if exists reject_locked_mcq_answer_trigger
  on public.user_answers;
create trigger reject_locked_mcq_answer_trigger
before insert or update of mcq_id on public.user_answers
for each row execute function public.reject_locked_mcq_answer();
