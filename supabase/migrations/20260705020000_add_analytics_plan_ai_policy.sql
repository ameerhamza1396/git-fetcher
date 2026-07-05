alter table public.ai_feature_policies
  add column if not exists cooldown_days integer;

alter table public.ai_user_overrides
  add column if not exists cooldown_days integer;

insert into public.ai_feature_policies
  (plan, feature, enabled, model_tier, daily_requests, weekly_requests, monthly_requests, monthly_token_budget, monthly_credit_budget, cooldown_days)
values
  ('free', 'analytics-plan', true, 'basic', null, null, null, null, null, 7),
  ('iconic', 'analytics-plan', true, 'superior', null, null, null, 500000, null, 3),
  ('premium', 'analytics-plan', true, 'superior', null, null, null, 3000000, null, 1)
on conflict (plan, feature) do update set
  enabled = excluded.enabled,
  model_tier = excluded.model_tier,
  daily_requests = excluded.daily_requests,
  weekly_requests = excluded.weekly_requests,
  monthly_requests = excluded.monthly_requests,
  monthly_token_budget = excluded.monthly_token_budget,
  monthly_credit_budget = excluded.monthly_credit_budget,
  cooldown_days = excluded.cooldown_days,
  updated_at = now();
