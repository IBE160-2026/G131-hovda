-- Story 4.1: gjennomgangsspørsmålene for et kapittel (FR-27, AD-6, AD-10).
-- Eier med FK til auth.users og on delete cascade, RLS og GRANT (AD-10). Spørsmålene hører til
-- kapittelet, ikke et delkapittel, og står i notatfilens rekkefølge. De gjenkjennes på normalisert
-- tekst (whitespace slått sammen, trimmet og med små bokstaver), som regnes ut i appen med
-- `normalizeReviewQuestion` (src/domain/reviewQuestions.ts) og lagres her. ID-en er stabil, og et
-- spørsmål som ikke står i fila lenger, trekkes tilbake med status og slettes aldri.
--
-- Bare importen skriver her, med `sync_review_questions` og service role. Den innloggede brukeren
-- kan bare lese sine egne.

create table public.review_questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chapter_id uuid not null,
  -- Plassen i notatfila, fra 1.
  position integer not null,
  text text not null,
  normalized_text text not null,
  status text not null default 'aktiv',
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_questions_status_check check (status in ('aktiv', 'trukket')),
  constraint review_questions_retired_check check ((status = 'trukket') = (retired_at is not null)),
  constraint review_questions_position_positive check (position > 0),
  constraint review_questions_text_not_blank check (btrim(text) <> '' and btrim(normalized_text) <> ''),
  constraint review_questions_owner_id_id_key unique (owner_id, id),
  constraint review_questions_chapter_fkey
    foreign key (owner_id, chapter_id)
    references public.chapters (owner_id, id)
    on delete cascade
);

-- Samme spørsmål kan bare være aktivt én gang per kapittel.
create unique index review_questions_active_text_key
  on public.review_questions (owner_id, chapter_id, normalized_text)
  where status = 'aktiv';

create index review_questions_chapter_idx on public.review_questions (owner_id, chapter_id, position);

create trigger review_questions_set_updated_at
before update on public.review_questions
for each row execute function public.set_updated_at();

alter table public.review_questions enable row level security;

create policy "Eieren leser egne gjennomgangsspørsmål" on public.review_questions
  for select to authenticated using ((select auth.uid()) = owner_id);

-- Ingen insert, update eller delete for innloggede: bare importen skriver (service role).
revoke all on table public.review_questions from anon, authenticated;
grant select on table public.review_questions to authenticated;
grant select, insert, update on table public.review_questions to service_role;

-- Gjør `p_questions` ([{ "text": …, "normalized_text": … }] i filens rekkefølge) til kapittelets
-- aktive gjennomgangsspørsmål i én transaksjon:
-- - et aktivt spørsmål med samme normaliserte tekst beholder ID-en og får ny plass og teksten fra fila,
-- - et tilbaketrukket spørsmål med samme normaliserte tekst blir aktivt igjen,
-- - ellers lages et nytt,
-- - aktive spørsmål som ikke er med, får status 'trukket' og retired_at.
-- Gir { active, added, retired }, eller null når kapittelet ikke finnes eller ikke er eierens.
-- Importen kjører med service role uten innlogget økt, så eieren gis som argument, og funksjonen kan
-- bare kalles av service_role.
create function public.sync_review_questions(p_owner_id uuid, p_chapter_id uuid, p_questions jsonb)
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
  -- Låser kapittelet, så to importer av samme kapittel ikke går i hverandre.
  perform 1
  from public.chapters c
  where c.id = p_chapter_id
    and c.owner_id = p_owner_id
  for update;

  if not found then
    return null;
  end if;

  if jsonb_typeof(p_questions) <> 'array' then
    raise exception 'p_questions må være en liste' using errcode = '22023';
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
    update public.review_questions r
    set position = v_question.position, text = v_question.question_text
    where r.owner_id = p_owner_id
      and r.chapter_id = p_chapter_id
      and r.status = 'aktiv'
      and r.normalized_text = v_question.normalized_text;

    if found then
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
