alter table public.user_analytics_ai_plans
  add column if not exists updated_at timestamptz not null default now();

with ranked_plans as (
  select
    id,
    row_number() over (partition by user_id order by created_at desc, id desc) as plan_rank
  from public.user_analytics_ai_plans
)
delete from public.user_analytics_ai_plans plans
using ranked_plans ranked
where plans.id = ranked.id
  and ranked.plan_rank > 1;

create unique index if not exists user_analytics_ai_plans_user_id_key
  on public.user_analytics_ai_plans(user_id);

drop policy if exists "Users can update own analytics ai plans"
  on public.user_analytics_ai_plans;

create policy "Users can update own analytics ai plans"
  on public.user_analytics_ai_plans
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
