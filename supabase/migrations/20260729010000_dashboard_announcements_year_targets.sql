create table if not exists public.dashboard_announcements (
  id uuid primary key default gen_random_uuid(),
  card_heading text not null,
  card_subheading text not null,
  card_background_image_url text,
  card_secondary_image_url text,
  modal_heading text not null,
  modal_subheading text not null,
  modal_background_image_url text,
  modal_image_urls text[] not null default array[]::text[],
  cta_text text,
  cta_url text,
  institutes text[] not null default array['all']::text[],
  years text[] not null default array['all']::text[],
  is_published boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint dashboard_announcements_institutes_nonempty check (array_length(institutes, 1) > 0),
  constraint dashboard_announcements_years_nonempty check (array_length(years, 1) > 0)
);

alter table public.dashboard_announcements
  add column if not exists years text[] not null default array['all']::text[];

alter table public.dashboard_announcements
  add column if not exists institutes text[] not null default array['all']::text[];

alter table public.dashboard_announcements
  drop constraint if exists dashboard_announcements_institutes_nonempty;

alter table public.dashboard_announcements
  add constraint dashboard_announcements_institutes_nonempty
  check (array_length(institutes, 1) > 0);

alter table public.dashboard_announcements
  drop constraint if exists dashboard_announcements_years_nonempty;

alter table public.dashboard_announcements
  add constraint dashboard_announcements_years_nonempty
  check (array_length(years, 1) > 0);

create index if not exists dashboard_announcements_published_order_idx
  on public.dashboard_announcements (is_published, display_order, created_at desc);

create index if not exists dashboard_announcements_institutes_gin_idx
  on public.dashboard_announcements using gin (institutes);

create index if not exists dashboard_announcements_years_gin_idx
  on public.dashboard_announcements using gin (years);

alter table public.dashboard_announcements enable row level security;

drop policy if exists "Published dashboard announcements are readable" on public.dashboard_announcements;

create policy "Published dashboard announcements are readable"
  on public.dashboard_announcements
  for select
  using (is_published = true);
