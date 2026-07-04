alter table public.profiles
add column if not exists study_path_changed_at timestamptz;
