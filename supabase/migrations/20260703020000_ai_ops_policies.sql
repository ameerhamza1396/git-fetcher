create table if not exists public.ai_feature_policies (
  id uuid primary key default gen_random_uuid(),
  plan text not null,
  feature text not null,
  enabled boolean not null default false,
  model_tier text not null default 'basic' check (model_tier in ('none', 'basic', 'superior', 'basic_fallback', 'superior_fallback', 'experimental')),
  daily_requests integer,
  weekly_requests integer,
  monthly_requests integer,
  monthly_token_budget integer,
  monthly_credit_budget numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan, feature)
);

create table if not exists public.ai_user_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  enabled boolean,
  model_tier text check (model_tier in ('none', 'basic', 'superior', 'basic_fallback', 'superior_fallback', 'experimental')),
  daily_requests integer,
  weekly_requests integer,
  monthly_requests integer,
  monthly_token_budget integer,
  monthly_credit_budget numeric,
  expires_at timestamptz,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature)
);

alter table public.ai_usage_events
  add column if not exists status text not null default 'success',
  add column if not exists model_tier text,
  add column if not exists prompt_version text,
  add column if not exists estimated_prompt_tokens integer,
  add column if not exists estimated_completion_tokens integer,
  add column if not exists actual_prompt_tokens integer,
  add column if not exists actual_completion_tokens integer,
  add column if not exists cache_hit_tokens integer,
  add column if not exists cache_miss_tokens integer,
  add column if not exists credit_cost numeric,
  add column if not exists error_code text,
  add column if not exists request_id uuid default gen_random_uuid();

create index if not exists idx_ai_feature_policies_plan_feature
  on public.ai_feature_policies(plan, feature);

create index if not exists idx_ai_user_overrides_user_feature
  on public.ai_user_overrides(user_id, feature);

create index if not exists idx_ai_usage_events_status
  on public.ai_usage_events(status);

create unique index if not exists app_settings_setting_name_key
  on public.app_settings(setting_name);

alter table public.ai_feature_policies enable row level security;
alter table public.ai_user_overrides enable row level security;

drop policy if exists "Admins can manage ai feature policies" on public.ai_feature_policies;
create policy "Admins can manage ai feature policies"
  on public.ai_feature_policies for all
  using (public.has_role_on_profiles(auth.uid(), 'admin'))
  with check (public.has_role_on_profiles(auth.uid(), 'admin'));

drop policy if exists "Admins can manage ai user overrides" on public.ai_user_overrides;
create policy "Admins can manage ai user overrides"
  on public.ai_user_overrides for all
  using (public.has_role_on_profiles(auth.uid(), 'admin'))
  with check (public.has_role_on_profiles(auth.uid(), 'admin'));

drop policy if exists "Service role can manage ai feature policies" on public.ai_feature_policies;
create policy "Service role can manage ai feature policies"
  on public.ai_feature_policies for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage ai user overrides" on public.ai_user_overrides;
create policy "Service role can manage ai user overrides"
  on public.ai_user_overrides for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into public.ai_feature_policies
  (plan, feature, enabled, model_tier, daily_requests, weekly_requests, monthly_requests, monthly_token_budget, monthly_credit_budget)
values
  ('free', 'reference', false, 'none', null, null, null, null, null),
  ('free', 'study-chat', false, 'basic', null, null, null, null, null),
  ('free', 'reference-summary', false, 'superior', null, null, null, null, null),
  ('free', 'reference-explain', false, 'superior', null, null, null, null, null),
  ('free', 'reference-verify', false, 'superior', null, null, null, null, null),
  ('free', 'seq', false, 'basic', null, null, null, null, null),
  ('free', 'mistake-explain', false, 'basic', null, null, null, null, null),
  ('free', 'titration-flashcards', false, 'superior', null, null, null, null, null),
  ('free', 'generate-test', false, 'superior', null, null, null, null, null),
  ('iconic', 'reference', true, 'none', 25, null, null, null, null),
  ('iconic', 'study-chat', true, 'basic', 20, null, null, 500000, null),
  ('iconic', 'reference-summary', true, 'superior', 5, null, null, 500000, null),
  ('iconic', 'reference-explain', true, 'superior', 5, null, null, 500000, null),
  ('iconic', 'reference-verify', true, 'superior', 3, null, null, 500000, null),
  ('iconic', 'seq', true, 'basic', null, null, 100, 500000, null),
  ('iconic', 'mistake-explain', true, 'basic', null, null, 100, 500000, null),
  ('iconic', 'titration-flashcards', true, 'superior', null, null, 10, 500000, null),
  ('iconic', 'generate-test', true, 'superior', null, null, 5, 500000, null),
  ('premium', 'reference', true, 'none', 100, null, null, null, null),
  ('premium', 'study-chat', true, 'superior', 100, null, null, 3000000, null),
  ('premium', 'reference-summary', true, 'superior', 25, null, null, 3000000, null),
  ('premium', 'reference-explain', true, 'superior', 25, null, null, 3000000, null),
  ('premium', 'reference-verify', true, 'superior', 25, null, null, 3000000, null),
  ('premium', 'seq', true, 'superior', null, null, 500, 3000000, null),
  ('premium', 'mistake-explain', true, 'superior', null, null, 500, 3000000, null),
  ('premium', 'titration-flashcards', true, 'superior', null, null, 100, 3000000, null),
  ('premium', 'generate-test', true, 'superior', null, null, 50, 3000000, null)
on conflict (plan, feature) do nothing;

insert into public.app_settings (setting_name, setting_value)
values (
  'ai_model_roles',
  '{
    "basic": {"provider": "groq", "model": "openai/gpt-oss-20b"},
    "superior": {"provider": "groq", "model": "openai/gpt-oss-120b"},
    "basic_fallback": {"provider": "deepseek", "model": "deepseek-v4-flash"},
    "superior_fallback": {"provider": "groq", "model": "qwen/qwen3-32b"},
    "experimental": {"provider": "deepseek", "model": "deepseek-v4-pro"}
  }'
)
on conflict (setting_name) do nothing;
