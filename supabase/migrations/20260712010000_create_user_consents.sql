create table if not exists public.user_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  analytics_allowed boolean not null default false,
  marketing_allowed boolean not null default false,
  consent_version text not null,
  source text not null check (source in ('mobile', 'web', 'anonymous_web')),
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_consents enable row level security;
drop policy if exists "Users manage own consent" on public.user_consents;
create policy "Users manage own consent" on public.user_consents for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.user_consents to authenticated;
grant all on public.user_consents to service_role;
