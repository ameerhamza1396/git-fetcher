update public.institutes
set
  enabled = true,
  category = 'specialized_test',
  years = array[
    'medicine_allied',
    'surgery_allied',
    'gynea_obs',
    'anesthesia',
    'radiology'
  ]::text[],
  dashboard_components = jsonb_build_object(
    'mcqs', true,
    'seqs', false,
    'viva', false
  )
where lower(code) = 'fcps_part_1';
