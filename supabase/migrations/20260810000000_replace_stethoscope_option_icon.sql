-- Use a portable emoji for the stethoscope option instead of a Lucide icon name.
update public.heard_about_us_options
set icon = '🩺',
    updated_at = now()
where lower(trim(coalesce(icon, ''))) = 'stethoscope';

-- Also repair subject rows so all subject flows receive the emoji from the database.
update public.subjects
set icon = '🩺'
where lower(trim(coalesce(public.subjects.icon, ''))) = 'stethoscope';
