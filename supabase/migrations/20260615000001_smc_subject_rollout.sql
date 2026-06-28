-- SMC subject rollout.
-- Creates SMC-only subject copies without chapters/MCQs, then removes SMC from
-- default curriculum visibility by replacing all/empty/null subject audiences.

create extension if not exists pgcrypto;

do $$
declare
  v_non_smc_institutes text[];
begin
  insert into public.institutes (
    code,
    name,
    short_name,
    enabled,
    years,
    dashboard_components
  )
  select
    'smc',
    'Sindh Medical College',
    'SMC',
    false,
    array['1st', '2nd', '3rd', '4th', '5th']::text[],
    '{"mcqs": true, "seqs": false, "viva": false}'::jsonb
  where not exists (
    select 1
    from public.institutes
    where lower(code) = 'smc'
  );

  select coalesce(array_agg(lower(code) order by lower(code)), array[]::text[])
  into v_non_smc_institutes
  from public.institutes
  where enabled is true
    and lower(code) <> 'smc';

  if jsonb_array_length(to_jsonb(v_non_smc_institutes)) = 0 then
    raise exception 'SMC rollout aborted: no enabled non-SMC institutes found for default subject visibility.';
  end if;

  create temporary table smc_rollout_default_subjects (
    id uuid primary key
  ) on commit drop;

  insert into smc_rollout_default_subjects (id)
  select s.id
  from public.subjects s
  where case
    when s.institutes is null then true
    when jsonb_typeof(s.institutes) <> 'array' then true
    when jsonb_array_length(s.institutes) = 0 then true
    when exists (
      select 1
      from jsonb_array_elements_text(s.institutes) institute
      where lower(institute) = 'all'
    ) then true
    else false
  end;

  insert into public.subjects (
    id,
    name,
    description,
    icon,
    color,
    year,
    institutes
  )
  select
    gen_random_uuid(),
    s.name,
    s.description,
    s.icon,
    s.color,
    s.year,
    to_jsonb(array['smc']::text[])
  from public.subjects s
  join smc_rollout_default_subjects source_subjects on source_subjects.id = s.id
  where not exists (
    select 1
    from public.subjects smc_subject
    where lower(smc_subject.name) = lower(s.name)
      and smc_subject.year is not distinct from s.year
      and smc_subject.description is not distinct from s.description
      and smc_subject.icon is not distinct from s.icon
      and smc_subject.color is not distinct from s.color
      and smc_subject.institutes = to_jsonb(array['smc']::text[])
  );

  update public.subjects s
  set institutes = to_jsonb(v_non_smc_institutes)
  from smc_rollout_default_subjects source_subjects
  where source_subjects.id = s.id;
end $$;
