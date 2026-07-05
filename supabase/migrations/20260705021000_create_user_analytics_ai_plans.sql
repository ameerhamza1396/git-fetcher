create table if not exists public.user_analytics_ai_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_payload jsonb not null,
  analytics_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_analytics_ai_plans_user_created
  on public.user_analytics_ai_plans(user_id, created_at desc);

alter table public.user_analytics_ai_plans enable row level security;

drop policy if exists "Users can read own analytics ai plans"
  on public.user_analytics_ai_plans;

create policy "Users can read own analytics ai plans"
  on public.user_analytics_ai_plans
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own analytics ai plans"
  on public.user_analytics_ai_plans;

create policy "Users can create own analytics ai plans"
  on public.user_analytics_ai_plans
  for insert
  with check (auth.uid() = user_id);
