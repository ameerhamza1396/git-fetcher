-- Daily product quotas are controlled from the cloud policy table.
-- The Cloudflare Medistics AI service reads these same rows when authorizing requests.
insert into public.ai_feature_policies
  (plan, feature, enabled, model_tier, daily_requests, weekly_requests, monthly_requests, monthly_token_budget, monthly_credit_budget)
values
  ('free', 'reference', true, 'none', 5, null, null, null, null),
  ('free', 'reference-explain', true, 'superior', 2, null, null, null, null),
  ('free', 'reference-summary', false, 'superior', 0, null, null, null, null),
  ('iconic', 'reference', true, 'none', 100, null, null, null, null),
  ('iconic', 'reference-explain', true, 'superior', 100, null, null, null, null),
  ('iconic', 'reference-summary', true, 'superior', 50, null, null, 500000, null),
  ('premium', 'reference', true, 'none', 1000, null, null, null, null),
  ('premium', 'reference-explain', true, 'superior', 500, null, null, 3000000, null),
  ('premium', 'reference-summary', true, 'superior', 500, null, null, 3000000, null)
on conflict (plan, feature) do update set
  enabled = excluded.enabled,
  model_tier = excluded.model_tier,
  daily_requests = excluded.daily_requests,
  weekly_requests = excluded.weekly_requests,
  monthly_requests = excluded.monthly_requests,
  monthly_token_budget = excluded.monthly_token_budget,
  monthly_credit_budget = excluded.monthly_credit_budget,
  updated_at = now();

drop policy if exists "Authenticated users can read plan quotas" on public.ai_feature_policies;
create policy "Authenticated users can read plan quotas"
  on public.ai_feature_policies for select
  to authenticated
  using (true);
