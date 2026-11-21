-- Story 1.8: avkrysning av delkapitler (FR-15, FR-20, AD-13).
-- Eier med FK til auth.users og on delete cascade, RLS og GRANT (AD-10).
-- Én rad per delkapittel, med tidspunkt og quizen som krysset det av. Bare `finishQuiz` skriver
-- her, gjennom `finish_quiz`, og raden angres aldri: det finnes ingen policy eller GRANT for
-- update og delete. Raden forsvinner bare med delkapittelet eller quizen, altså når emnet slettes.

create table public.subchapter_completions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subchapter_id uuid not null,
  quiz_id uuid not null,
  completed_at timestamptz not null default now(),
  constraint subchapter_completions_one_per_subchapter unique (owner_id, subchapter_id),
  constraint subchapter_completions_subchapter_fkey
    foreign key (owner_id, subchapter_id)
    references public.subchapters (owner_id, id)
    on delete cascade,
  constraint subchapter_completions_quiz_fkey
    foreign key (owner_id, quiz_id)
    references public.quizzes (owner_id, id)
    on delete cascade
);

create index subchapter_completions_owner_id_quiz_id_idx
  on public.subchapter_completions (owner_id, quiz_id);

alter table public.subchapter_completions enable row level security;

create policy "Eieren leser egne avkrysninger" on public.subchapter_completions
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Eieren oppretter egne avkrysninger" on public.subchapter_completions
  for insert to authenticated with check ((select auth.uid()) = owner_id);

revoke all on table public.subchapter_completions from anon, authenticated;
grant select, insert on table public.subchapter_completions to authenticated;
grant select, insert on table public.subchapter_completions to service_role;

-- Avslutter en quiz som `pågår`: resultatet av 10 lagres og fryses, og når `p_completes` er sann,
-- krysses delkapittelet av, i samme transaksjon. Er delkapittelet alt krysset av, står den første
-- raden (on conflict do nothing). `false` når quizen ikke finnes, ikke er eierens eller alt er
-- ferdig, og da er ingenting endret. Avgjørelsen om avkrysning tas i domenet (`isCompleted`).
-- `security invoker`: kjører som den innloggede, så RLS gjelder, og eieren er auth.uid().
create function public.finish_quiz(
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
      total = 10,
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
