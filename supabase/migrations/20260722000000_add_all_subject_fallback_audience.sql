-- Mark the existing SMBB curriculum as the generic fallback without changing
-- any subject, chapter, or question identifiers.
update public.subjects s
set institutes = s.institutes || to_jsonb(array['all']::text[])
where s.institutes is not null
  and jsonb_typeof(s.institutes) = 'array'
  and exists (
    select 1
    from jsonb_array_elements_text(s.institutes) institute
    where lower(trim(institute)) in ('smbb', 'smbbmc')
  )
  and not exists (
    select 1
    from jsonb_array_elements_text(s.institutes) institute
    where lower(trim(institute)) = 'all'
  );
