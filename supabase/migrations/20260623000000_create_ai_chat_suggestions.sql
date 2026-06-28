create table if not exists public.ai_chat_suggestions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  is_active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_chat_suggestions enable row level security;

drop policy if exists "Anyone can read active AI chat suggestions" on public.ai_chat_suggestions;

create policy "Anyone can read active AI chat suggestions"
  on public.ai_chat_suggestions
  for select
  using (is_active = true);

create index if not exists ai_chat_suggestions_active_order_idx
  on public.ai_chat_suggestions (is_active, order_index, created_at desc);

insert into public.ai_chat_suggestions (prompt, order_index)
values
  ('Osteomyelitis', 10),
  ('Types of MI', 20),
  ('Azithromycin SE', 30),
  ('McBurney point', 40),
  ('Explain nephrotic syndrome', 50),
  ('Causes of clubbing', 60),
  ('Brachial plexus summary', 70),
  ('Insulin mechanism', 80),
  ('Tetralogy of Fallot', 90),
  ('Appendicitis signs', 100),
  ('Shock types', 110),
  ('Antibiotic resistance', 120)
on conflict do nothing;
