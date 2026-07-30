update public.profiles
set username = lower(trim(username))
where username is not null
  and username <> lower(trim(username));

-- Preserve the oldest owner and rename any existing duplicates before adding
-- the database uniqueness guarantee.
with ranked as (
  select
    id,
    username,
    row_number() over (
      partition by lower(username)
      order by updated_at nulls last, id
    ) as duplicate_rank
  from public.profiles
  where nullif(trim(username), '') is not null
),
duplicates as (
  select id, username from ranked where duplicate_rank > 1
)
update public.profiles as profiles
set username = left(duplicates.username, 11) || '-' || left(replace(profiles.id::text, '-', ''), 8)
from duplicates
where profiles.id = duplicates.id;

create or replace function public.normalize_and_validate_profile_username()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.username is null then
    return new;
  end if;

  new.username := lower(trim(new.username));
  if new.username !~ '^[a-z0-9_.-]{3,20}$' then
    raise exception 'Username must be 3-20 characters using lowercase letters, numbers, _, -, or . only'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_and_validate_profile_username on public.profiles;
create trigger normalize_and_validate_profile_username
before insert or update of username on public.profiles
for each row execute function public.normalize_and_validate_profile_username();

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;
