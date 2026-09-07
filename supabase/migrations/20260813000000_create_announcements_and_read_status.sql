create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  media_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_announcements (
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

create index if not exists announcements_published_created_idx
  on public.announcements (is_published, created_at desc);

alter table public.announcements enable row level security;
alter table public.user_announcements enable row level security;

drop policy if exists "Published announcements are readable" on public.announcements;
create policy "Published announcements are readable"
  on public.announcements for select
  to authenticated
  using (is_published = true);

drop policy if exists "Users can read their announcement status" on public.user_announcements;
create policy "Users can read their announcement status"
  on public.user_announcements for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can mark announcements read" on public.user_announcements;
create policy "Users can mark announcements read"
  on public.user_announcements for insert
  to authenticated
  with check (user_id = auth.uid());

grant select on public.announcements to authenticated;
grant select, insert on public.user_announcements to authenticated;
