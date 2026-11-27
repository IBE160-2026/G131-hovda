-- Story 4.1: strammer inn `sync_review_questions` (20261127120000_review_questions.sql).
-- - `p_questions` som er null, ikke en liste, eller har et element uten `text` eller
--   `normalized_text` (null eller blankt), gir en feil, og ingenting er endret. Før trakk null alle
--   aktive spørsmål tilbake, og et element uten normalisert tekst hindret all tilbaketrekking.
-- - Et aktivt spørsmål med samme plass og tekst røres ikke, så en ny kjøring med samme fil ikke
--   endrer `updated_at`. Det telles fortsatt som funnet, ikke som nytt.
-- Samme signatur, rettigheter og oppførsel ellers.

create or replace function public.sync_review_questions(p_owner_id uuid, p_chapter_id uuid, p_questions jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_question record;
  v_id uuid;
  v_added integer := 0;
  v_retired integer := 0;
begin
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' then
    raise exception 'p_questions må være en liste' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_questions) as q(value)
    where jsonb_typeof(q.value) is distinct from 'object'
      or coalesce(btrim(q.value ->> 'text'), '') = ''
      or coalesce(btrim(q.value ->> 'normalized_text'), '') = ''
  ) then
    raise exception 'hvert spørsmål må ha text og normalized_text' using errcode = '22023';
  end if;

  -- Låser kapittelet, så to importer av samme kapittel ikke går i hverandre.
  perform 1
  from public.chapters c
  where c.id = p_chapter_id
    and c.owner_id = p_owner_id
  for update;

  if not found then
    return null;
  end if;

  -- Notatfila valideres før importen skriver, men et dobbelt spørsmål her ville ellers gitt feil antall.
  if (select count(*) from jsonb_array_elements(p_questions))
     <> (select count(distinct q.value ->> 'normalized_text') from jsonb_array_elements(p_questions) as q(value)) then
    raise exception 'samme spørsmål står to ganger' using errcode = '23505';
  end if;

  update public.review_questions r
  set status = 'trukket', retired_at = now()
  where r.owner_id = p_owner_id
    and r.chapter_id = p_chapter_id
    and r.status = 'aktiv'
    and r.normalized_text not in (
      select q.value ->> 'normalized_text' from jsonb_array_elements(p_questions) as q(value)
    );
  get diagnostics v_retired = row_count;

  for v_question in
    select
      q.value ->> 'text' as question_text,
      q.value ->> 'normalized_text' as normalized_text,
      q.ordinality::integer as position
    from jsonb_array_elements(p_questions) with ordinality as q(value, ordinality)
    order by q.ordinality
  loop
    select r.id into v_id
    from public.review_questions r
    where r.owner_id = p_owner_id
      and r.chapter_id = p_chapter_id
      and r.status = 'aktiv'
      and r.normalized_text = v_question.normalized_text;

    if found then
      -- Bare når plassen eller teksten er endret, så uendrede rader ikke røres.
      update public.review_questions r
      set position = v_question.position, text = v_question.question_text
      where r.id = v_id
        and (r.position, r.text) is distinct from (v_question.position, v_question.question_text);
      continue;
    end if;

    v_added := v_added + 1;

    select r.id into v_id
    from public.review_questions r
    where r.owner_id = p_owner_id
      and r.chapter_id = p_chapter_id
      and r.status = 'trukket'
      and r.normalized_text = v_question.normalized_text
    order by r.retired_at desc
    limit 1;

    if found then
      update public.review_questions r
      set status = 'aktiv', retired_at = null, position = v_question.position, text = v_question.question_text
      where r.id = v_id;
    else
      insert into public.review_questions (owner_id, chapter_id, position, text, normalized_text)
      values (p_owner_id, p_chapter_id, v_question.position, v_question.question_text, v_question.normalized_text);
    end if;
  end loop;

  return jsonb_build_object(
    'active', jsonb_array_length(p_questions),
    'added', v_added,
    'retired', v_retired
  );
end;
$$;

revoke execute on function public.sync_review_questions(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.sync_review_questions(uuid, uuid, jsonb) to service_role;
