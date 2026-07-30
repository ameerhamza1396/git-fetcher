create table if not exists public.dashboard_promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  image_url text,
  target_url text,
  action_type text not null default 'url'
    check (action_type in ('url', 'collaborate')),
  enabled boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists dashboard_promotions_enabled_order_idx
  on public.dashboard_promotions(enabled, display_order, created_at);

alter table public.dashboard_promotions enable row level security;
grant select on public.dashboard_promotions to authenticated;

drop policy if exists "Authenticated users can view enabled dashboard promotions"
  on public.dashboard_promotions;
create policy "Authenticated users can view enabled dashboard promotions"
  on public.dashboard_promotions
  for select
  to authenticated
  using (enabled or public.is_mcq_lock_admin());

create or replace function public.admin_save_dashboard_promotion(
  p_id uuid,
  p_title text,
  p_subtitle text,
  p_image_url text,
  p_target_url text,
  p_action_type text,
  p_enabled boolean,
  p_display_order integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_action_type text;
begin
  if not public.is_mcq_lock_admin() then
    raise exception 'Administrator access required';
  end if;

  v_action_type := lower(coalesce(nullif(trim(p_action_type), ''), 'url'));
  if v_action_type not in ('url', 'collaborate') then
    raise exception 'Unsupported promotion action';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'Promotion title is required';
  end if;

  if v_action_type = 'url' and nullif(trim(p_target_url), '') is null then
    raise exception 'Promotion destination is required';
  end if;

  if p_id is null then
    insert into public.dashboard_promotions (
      title,
      subtitle,
      image_url,
      target_url,
      action_type,
      enabled,
      display_order,
      updated_by
    )
    values (
      left(trim(p_title), 120),
      left(coalesce(trim(p_subtitle), ''), 240),
      nullif(trim(p_image_url), ''),
      nullif(trim(p_target_url), ''),
      v_action_type,
      coalesce(p_enabled, true),
      coalesce(p_display_order, 0),
      auth.uid()
    )
    returning id into v_id;
  else
    update public.dashboard_promotions
    set
      title = left(trim(p_title), 120),
      subtitle = left(coalesce(trim(p_subtitle), ''), 240),
      image_url = nullif(trim(p_image_url), ''),
      target_url = nullif(trim(p_target_url), ''),
      action_type = v_action_type,
      enabled = coalesce(p_enabled, true),
      display_order = coalesce(p_display_order, 0),
      updated_at = now(),
      updated_by = auth.uid()
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Promotion not found';
    end if;
  end if;

  return v_id;
end;
$$;

revoke all on function public.admin_save_dashboard_promotion(
  uuid, text, text, text, text, text, boolean, integer
) from public;
grant execute on function public.admin_save_dashboard_promotion(
  uuid, text, text, text, text, text, boolean, integer
) to authenticated;

create or replace function public.admin_delete_dashboard_promotion(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_mcq_lock_admin() then
    raise exception 'Administrator access required';
  end if;

  delete from public.dashboard_promotions where id = p_id;
end;
$$;

revoke all on function public.admin_delete_dashboard_promotion(uuid) from public;
grant execute on function public.admin_delete_dashboard_promotion(uuid) to authenticated;
