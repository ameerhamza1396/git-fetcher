create table if not exists public.question_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mcq_id uuid not null references public.mcqs(id) on delete cascade,
  feedback text not null check (feedback in ('up', 'down')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mcq_id)
);

alter table public.question_feedbacks enable row level security;

drop policy if exists "Users can read own question feedback" on public.question_feedbacks;
create policy "Users can read own question feedback"
  on public.question_feedbacks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can upsert own question feedback" on public.question_feedbacks;
create policy "Users can upsert own question feedback"
  on public.question_feedbacks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own question feedback" on public.question_feedbacks;
create policy "Users can update own question feedback"
  on public.question_feedbacks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_question_feedbacks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_question_feedbacks_updated_at on public.question_feedbacks;
create trigger set_question_feedbacks_updated_at
  before update on public.question_feedbacks
  for each row execute function public.set_question_feedbacks_updated_at();
