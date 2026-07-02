alter table public.institutes
  add column if not exists category text;

alter table public.institutes
  alter column category set default 'institute';

update public.institutes
set category = 'institute'
where category is null
   or category not in ('institute', 'specialized_test');

alter table public.institutes
  alter column category set not null;

alter table public.institutes
  drop constraint if exists institutes_category_check;

alter table public.institutes
  add constraint institutes_category_check
  check (category in ('institute', 'specialized_test'));

with specialized_tests (
  code,
  name,
  short_name,
  enabled,
  category,
  years,
  dashboard_components
) as (
  values
  (
    'jinnah_house_job_test',
    'Jinnah House Job Test',
    'JHJT',
    true,
    'specialized_test',
    array[]::text[],
    '{"mcqs": true, "seqs": false, "viva": false}'::jsonb
  ),
  (
    'jpmc_house_job_test',
    'JPMC House Job Test',
    'JPMC HJ',
    false,
    'specialized_test',
    array[]::text[],
    '{"mcqs": true, "seqs": false, "viva": false}'::jsonb
  ),
  (
    'nle',
    'NLE',
    'NLE',
    false,
    'specialized_test',
    array[]::text[],
    '{"mcqs": true, "seqs": false, "viva": false}'::jsonb
  ),
  (
    'fcps_part_1',
    'FCPS Part-1',
    'FCPS-1',
    false,
    'specialized_test',
    array[]::text[],
    '{"mcqs": true, "seqs": false, "viva": false}'::jsonb
  ),
  (
    'fcps_part_2',
    'FCPS Part-2',
    'FCPS-2',
    false,
    'specialized_test',
    array[]::text[],
    '{"mcqs": true, "seqs": false, "viva": false}'::jsonb
  )
)
update public.institutes existing
set
  enabled = specialized_tests.enabled,
  category = specialized_tests.category,
  years = specialized_tests.years
from specialized_tests
where lower(existing.code) = lower(specialized_tests.code);

with specialized_tests (
  code,
  name,
  short_name,
  enabled,
  category,
  years,
  dashboard_components
) as (
  values
  (
    'jinnah_house_job_test',
    'Jinnah House Job Test',
    'JHJT',
    true,
    'specialized_test',
    array[]::text[],
    '{"mcqs": true, "seqs": false, "viva": false}'::jsonb
  ),
  (
    'jpmc_house_job_test',
    'JPMC House Job Test',
    'JPMC HJ',
    false,
    'specialized_test',
    array[]::text[],
    '{"mcqs": true, "seqs": false, "viva": false}'::jsonb
  ),
  (
    'nle',
    'NLE',
    'NLE',
    false,
    'specialized_test',
    array[]::text[],
    '{"mcqs": true, "seqs": false, "viva": false}'::jsonb
  ),
  (
    'fcps_part_1',
    'FCPS Part-1',
    'FCPS-1',
    false,
    'specialized_test',
    array[]::text[],
    '{"mcqs": true, "seqs": false, "viva": false}'::jsonb
  ),
  (
    'fcps_part_2',
    'FCPS Part-2',
    'FCPS-2',
    false,
    'specialized_test',
    array[]::text[],
    '{"mcqs": true, "seqs": false, "viva": false}'::jsonb
  )
)
insert into public.institutes (
  code,
  name,
  short_name,
  enabled,
  category,
  years,
  dashboard_components
)
select
  code,
  name,
  short_name,
  enabled,
  category,
  years,
  dashboard_components
from specialized_tests
where not exists (
  select 1
  from public.institutes existing
  where lower(existing.code) = lower(specialized_tests.code)
);
