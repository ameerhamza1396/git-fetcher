create table if not exists public.heard_about_us_options (
  id uuid primary key default gen_random_uuid(),
  value text not null unique,
  label text not null,
  icon text,
  enabled boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists heard_about_us text;

comment on column public.profiles.heard_about_us is
  'Optional setup answer for where the user heard about Medmacs.';

alter table public.heard_about_us_options enable row level security;

drop policy if exists "Anyone can read enabled heard about us options" on public.heard_about_us_options;

create policy "Anyone can read enabled heard about us options"
  on public.heard_about_us_options
  for select
  using (enabled = true);

insert into public.heard_about_us_options (value, label, icon, enabled, order_index)
values
  ('social_media', 'Social Media', 'share', true, 10),
  ('ads', 'Ads', 'badge_percent', true, 20),
  ('ai_chatbot', 'AI Chatbot', 'bot', true, 30),
  ('recommended_by_someone', 'Recommended by Someone', 'users', true, 40),
  ('public_event', 'Public Event', 'calendar_days', true, 50),
  ('marketing_posters', 'Marketing Posters', 'megaphone', true, 60),
  ('friends_group', 'Friends Group', 'message_circle', true, 70)
on conflict (value) do update
set
  label = excluded.label,
  icon = excluded.icon,
  enabled = excluded.enabled,
  order_index = excluded.order_index,
  updated_at = now();
