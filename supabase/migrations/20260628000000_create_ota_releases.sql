create table if not exists public.ota_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  channel text not null default 'production',
  platform text not null default 'android',
  min_native_version_code integer not null default 1,
  bundle_path text not null,
  checksum text,
  enabled boolean not null default true,
  mandatory boolean not null default false,
  rollout_percent integer not null default 0 check (rollout_percent between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version, channel, platform)
);

create index if not exists ota_releases_lookup_idx
  on public.ota_releases (platform, channel, enabled, created_at desc);

create or replace function public.set_ota_releases_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ota_releases_updated_at on public.ota_releases;
create trigger set_ota_releases_updated_at
before update on public.ota_releases
for each row
execute function public.set_ota_releases_updated_at();

alter table public.ota_releases enable row level security;

drop policy if exists "Service role manages OTA releases" on public.ota_releases;
create policy "Service role manages OTA releases"
on public.ota_releases
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

insert into storage.buckets (id, name, public)
values ('ota-bundles', 'ota-bundles', false)
on conflict (id) do nothing;
