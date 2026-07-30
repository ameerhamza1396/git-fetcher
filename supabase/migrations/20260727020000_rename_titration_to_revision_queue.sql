update public.app_settings
set
  setting_value = replace(setting_value, 'titration flashcards', 'revision queue'),
  updated_at = now()
where setting_name = 'ai_system_context'
  and setting_value like '%titration flashcards%';
