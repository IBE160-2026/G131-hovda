-- Story 1.7: oppretting og erstatning i quizen som én transaksjon hver.
-- PostgREST har ingen transaksjoner på tvers av kall. Uten disse funksjonene kan en feil underveis
-- etterlate en quiz i gang uten spørsmål, eller en posisjon uten aktivt element.
-- `security invoker`: funksjonene kjører som den innloggede, så RLS gjelder, og eieren er auth.uid().

-- Lager økt, quiz og ett element per spørsmål på posisjon 1, 2 og så videre. Gir quizens id.
-- Har delkapittelet alt en quiz i gang, feiler hele kallet med 23505, og ingenting lagres.
create function public.create_quiz(p_subchapter_id uuid, p_question_ids uuid[])
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_session_id uuid;
  v_quiz_id uuid;
begin
  insert into public.sessions (owner_id) values (v_owner) returning id into v_session_id;

  insert into public.quizzes (owner_id, session_id, subchapter_id)
  values (v_owner, v_session_id, p_subchapter_id)
  returning id into v_quiz_id;

  insert into public.quiz_items (owner_id, quiz_id, position, question_id)
  select v_owner, v_quiz_id, q.ordinality::integer, q.question_id
  from unnest(p_question_ids) with ordinality as q (question_id, ordinality);

  return v_quiz_id;
end;
$$;

-- Markerer et aktivt, ubesvart element som `erstattet` og lager et nytt med spørsmålet på samme
-- posisjon. `false` når elementet ikke finnes, ikke er eierens, alt er besvart eller erstattet.
create function public.replace_quiz_item(p_item_id uuid, p_question_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_quiz_id uuid;
  v_position integer;
begin
  update public.quiz_items
  set status = 'erstattet'
  where id = p_item_id
    and owner_id = v_owner
    and status = 'aktiv'
    and answered_at is null
  returning quiz_id, position into v_quiz_id, v_position;

  if not found then
    return false;
  end if;

  insert into public.quiz_items (owner_id, quiz_id, position, question_id)
  values (v_owner, v_quiz_id, v_position, p_question_id);

  return true;
end;
$$;

revoke execute on function public.create_quiz(uuid, uuid[]), public.replace_quiz_item(uuid, uuid) from public, anon;
grant execute on function public.create_quiz(uuid, uuid[]), public.replace_quiz_item(uuid, uuid) to authenticated;
