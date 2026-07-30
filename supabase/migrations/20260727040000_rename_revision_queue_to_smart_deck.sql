update public.app_settings
set
  setting_value = replace(setting_value, 'revision queue', 'Smart Deck'),
  updated_at = now()
where setting_name = 'ai_system_context'
  and setting_value like '%revision queue%';
