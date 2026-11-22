-- Story 1.9a: eieren sier fra om feil i quizspørsmål (FR-16, AD-18).
-- Eier med FK til auth.users og on delete cascade, RLS og GRANT (AD-10).
-- Én rapport per spørsmål. Rapporten peker på quiz-elementet eieren så spørsmålet i, og trekker
-- spørsmålet tilbake fra banken med en gang. I en quiz som pågår, tas elementet også ut av quizen
-- (status `trukket`), og resultatet regnes av de gjenværende. En ferdig quiz endres aldri.
-- Rapporten angres aldri: det finnes ingen policy eller GRANT for update og delete.

-- Rapportene ------------------------------------------------------------------

create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id uuid not null,
  -- Elementet rapporten kom fra. Blir null hvis quizen slettes, så rapporten og spørsmålet som er
  -- trukket tilbake, fortsatt listes av importen.
  quiz_item_id uuid,
  comment text,
  reported_at timestamptz not null default now(),
  constraint question_reports_one_per_question unique (owner_id, question_id),
  constraint question_reports_comment_check check (comment is null or char_length(comment) between 1 and 500),
  constraint question_reports_question_fkey
    foreign key (owner_id, question_id)
    references public.quiz_questions (owner_id, id)
    on delete cascade,
  constraint question_reports_quiz_item_fkey
    foreign key (owner_id, quiz_item_id)
    references public.quiz_items (owner_id, id)
    on delete set null (quiz_item_id)
);

create index question_reports_owner_id_quiz_item_id_idx
  on public.question_reports (owner_id, quiz_item_id);

alter table public.question_reports enable row level security;

create policy "Eieren leser egne feilrapporter" on public.question_reports
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Eieren oppretter egne feilrapporter" on public.question_reports
  for insert to authenticated with check ((select auth.uid()) = owner_id);

revoke all on table public.question_reports from anon, authenticated;
grant select, insert on table public.question_reports to authenticated;
-- Importen leser rapportene med service-nøkkelen.
grant select on table public.question_reports to service_role;

-- Elementene i en quiz --------------------------------------------------------

-- Et element som er meldt som feil mens quizen pågår, får status `trukket`.
alter table public.quiz_items drop constraint quiz_items_status_check;
alter table public.quiz_items
  add constraint quiz_items_status_check check (status in ('aktiv', 'erstattet', 'trukket'));

-- Bare et ubesvart element kan erstattes. Et besvart element kan trekkes.
alter table public.quiz_items drop constraint quiz_items_replaced_unanswered;
alter table public.quiz_items
  add constraint quiz_items_replaced_unanswered check (status <> 'erstattet' or answered_at is null);

-- Et svar fryses: et besvart element endres aldri, bortsett fra at det kan gå fra `aktiv` til
-- `trukket` med alle andre kolonner uendret.
create or replace function public.quiz_items_freeze_answered()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.answered_at is not null and not (
    old.status = 'aktiv'
    and new.status = 'trukket'
    and new.id = old.id
    and new.owner_id = old.owner_id
    and new.quiz_id = old.quiz_id
    and new.position = old.position
    and new.question_id = old.question_id
    and new.chosen_index is not distinct from old.chosen_index
    and new.correct is not distinct from old.correct
    and new.answered_at is not distinct from old.answered_at
    and new.created_at = old.created_at
  ) then
    raise exception 'Et besvart spørsmål kan ikke endres.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.quiz_items_freeze_answered() from public, anon, authenticated;

-- Funksjonene -----------------------------------------------------------------

-- Melder spørsmålet i elementet som feil, i én transaksjon: rapporten (on conflict do nothing, så å
-- melde på nytt ikke gir en ny rad), spørsmålet trekkes tilbake hvis det er aktivt, og elementet
-- tas ut av quizen når quizen pågår og elementet er aktivt. Quizen låses, så den ikke kan bli ferdig
-- midt i. `false` når elementet ikke finnes eller ikke er eierens, og da er ingenting endret.
-- `security invoker`: kjører som den innloggede, så RLS gjelder, og eieren er auth.uid().
create function public.report_quiz_question(p_item_id uuid, p_comment text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_question_id uuid;
  v_item_status text;
  v_quiz_status text;
begin
  select i.question_id, i.status, q.status
  into v_question_id, v_item_status, v_quiz_status
  from public.quiz_items i
  join public.quizzes q on q.owner_id = i.owner_id and q.id = i.quiz_id
  where i.id = p_item_id
    and i.owner_id = v_owner
  for update of q;

  if not found then
    return false;
  end if;

  insert into public.question_reports (owner_id, question_id, quiz_item_id, comment)
  values (v_owner, v_question_id, p_item_id, nullif(btrim(p_comment), ''))
  on conflict (owner_id, question_id) do nothing;

  update public.quiz_questions
  set status = 'trukket', retired_at = now()
  where id = v_question_id
    and owner_id = v_owner
    and status = 'aktiv';

  if v_quiz_status = 'pågår' and v_item_status = 'aktiv' then
    update public.quiz_items
    set status = 'trukket'
    where id = p_item_id
      and owner_id = v_owner;
  end if;

  return true;
end;
$$;

revoke execute on function public.report_quiz_question(uuid, text) from public, anon;
grant execute on function public.report_quiz_question(uuid, text) to authenticated;

-- Som før, men `total` er antallet aktive elementer i quizen, ikke 10, så et spørsmål som er meldt
-- som feil, ikke teller. Klienten kan ikke sette totalen, og eldre kode virker fortsatt.
create or replace function public.finish_quiz(
  p_quiz_id uuid,
  p_correct_count int,
  p_carry_theme_id uuid,
  p_completes boolean
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_subchapter_id uuid;
begin
  update public.quizzes
  set status = 'ferdig',
      correct_count = p_correct_count,
      total = (
        select count(*)::integer
        from public.quiz_items i
        where i.owner_id = v_owner
          and i.quiz_id = p_quiz_id
          and i.status = 'aktiv'
      ),
      carry_theme_id = p_carry_theme_id,
      finished_at = now()
  where id = p_quiz_id
    and owner_id = v_owner
    and status = 'pågår'
  returning subchapter_id into v_subchapter_id;

  if not found then
    return false;
  end if;

  if p_completes then
    insert into public.subchapter_completions (owner_id, subchapter_id, quiz_id)
    values (v_owner, v_subchapter_id, p_quiz_id)
    on conflict (owner_id, subchapter_id) do nothing;
  end if;

  return true;
end;
$$;

revoke execute on function public.finish_quiz(uuid, int, uuid, boolean) from public, anon;
grant execute on function public.finish_quiz(uuid, int, uuid, boolean) to authenticated;
