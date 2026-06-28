alter table public.team_members
  drop constraint if exists team_members_category_check;

alter table public.team_members
  add constraint team_members_category_check
  check (category in (
    'core',
    'extended',
    'campus_representatives',
    'contributor',
    'special_thanks'
  ));

insert into public.team_members (name, role, category, order_index)
select 'Dua Ahmed', 'Campus Ambassador - DMC', 'campus_representatives', 500
where not exists (
  select 1
  from public.team_members
  where name = 'Dua Ahmed'
    and role = 'Campus Ambassador - DMC'
);

insert into public.team_members (name, role, category, order_index)
select 'Faiqa Ahmed', 'Campus Ambassador - JSMU', 'campus_representatives', 501
where not exists (
  select 1
  from public.team_members
  where name = 'Faiqa Ahmed'
    and role = 'Campus Ambassador - JSMU'
);
