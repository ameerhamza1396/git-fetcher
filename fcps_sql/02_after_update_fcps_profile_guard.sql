-- FCPS Part-1 post-update guard.
-- Run after the app version that supports institute-managed years/specialties is live.
-- This does not delete progress. It only normalizes impossible FCPS selections so users pick a specialty on next setup.

update public.institutes
set enabled = true,
    category = 'specialized_test',
    years = array['medicine_allied', 'surgery_allied', 'gynea_obs', 'anesthesia', 'radiology']::text[],
    dashboard_components = jsonb_build_object('mcqs', true, 'seqs', false, 'viva', false)
where lower(code) = 'fcps_part_1';

update public.profiles
set year = null,
    updated_at = now()
where institute = 'fcps_part_1'
  and (year is null or year not in ('medicine_allied', 'surgery_allied', 'gynea_obs', 'anesthesia', 'radiology'));

-- Optional check after running:
select institute, year, count(*)
from public.profiles
where institute = 'fcps_part_1'
group by institute, year
order by year nulls first;
