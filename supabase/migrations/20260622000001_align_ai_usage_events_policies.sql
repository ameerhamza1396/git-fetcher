create index if not exists idx_ai_usage_events_created_at
  on public.ai_usage_events(created_at desc);

create index if not exists idx_ai_usage_events_user_id
  on public.ai_usage_events(user_id);

create index if not exists idx_ai_usage_events_feature
  on public.ai_usage_events(feature);

alter table public.ai_usage_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_usage_events'
      and policyname = 'Public can read ai usage totals'
  ) then
    create policy "Public can read ai usage totals"
      on public.ai_usage_events for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_usage_events'
      and policyname = 'Authenticated users can insert own ai usage events'
  ) then
    create policy "Authenticated users can insert own ai usage events"
      on public.ai_usage_events for insert
      with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_usage_events'
      and policyname = 'Service role can manage ai usage events'
  ) then
    create policy "Service role can manage ai usage events"
      on public.ai_usage_events for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
