create table if not exists public.question_reference_verifications (
  id uuid primary key default gen_random_uuid(),
  mcq_id text not null unique,
  verdict text not null check (verdict in ('verified', 'incorrect', 'no_references', 'unconfirmed')),
  source_basis text not null default 'none',
  summary text not null default '',
  citations jsonb not null default '[]'::jsonb,
  correct_answer_suggestion text not null default '',
  marked_answer_wrong boolean not null default false,
  auto_reported boolean not null default false,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.question_reference_verifications enable row level security;

create policy "reference verifications are readable by authenticated users"
  on public.question_reference_verifications
  for select
  to authenticated
  using (true);

create policy "authenticated users can cache reference verifications"
  on public.question_reference_verifications
  for insert
  to authenticated
  with check (auth.uid() = verified_by);

create policy "verifier can refresh own reference verifications"
  on public.question_reference_verifications
  for update
  to authenticated
  using (auth.uid() = verified_by)
  with check (auth.uid() = verified_by);

create or replace function public.set_question_reference_verifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_question_reference_verifications_updated_at on public.question_reference_verifications;
create trigger set_question_reference_verifications_updated_at
  before update on public.question_reference_verifications
  for each row execute function public.set_question_reference_verifications_updated_at();
