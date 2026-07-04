insert into public.ai_feature_policies
  (plan, feature, enabled, model_tier, daily_requests, weekly_requests, monthly_requests, monthly_token_budget, monthly_credit_budget)
values
  ('free', 'reference-explain', false, 'superior', null, null, null, null, null),
  ('iconic', 'reference-explain', true, 'superior', 5, null, null, 500000, null),
  ('premium', 'reference-explain', true, 'superior', 25, null, null, 3000000, null)
on conflict (plan, feature) do update set
  enabled = excluded.enabled,
  model_tier = excluded.model_tier,
  daily_requests = excluded.daily_requests,
  weekly_requests = excluded.weekly_requests,
  monthly_requests = excluded.monthly_requests,
  monthly_token_budget = excluded.monthly_token_budget,
  monthly_credit_budget = excluded.monthly_credit_budget,
  updated_at = now();
