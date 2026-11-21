-- Story 1.7: økter, quizer og elementene i en quiz (FR-10, FR-14, AD-6, AD-16).
-- Eier med FK til auth.users og on delete cascade, RLS og GRANT (AD-10).
-- Bare brukstilfellene i src/application/quiz.ts skriver her. En quiz hører til en økt. Et spørsmål
-- er brukt når det er valgt til en quiz. Et erstattet element blir stående med status `erstattet`,
-- og et nytt element får samme posisjon. Svar og resultat fryses når de er lagret.

-- Økter -----------------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  -- Settes av `endSession` i en senere epic.
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_ended_after_started check (ended_at is null or ended_at >= started_at),
  constraint sessions_owner_id_id_key unique (owner_id, id)
);

create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

-- Quizer ----------------------------------------------------------------------

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null,
  subchapter_id uuid not null,
  status text not null default 'pågår',
  correct_count integer,
  total integer,
  -- Temaet som overføres til neste quiz når siste spørsmål ble besvart feil.
  carry_theme_id uuid,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quizzes_status_check check (status in ('pågår', 'ferdig')),
  constraint quizzes_result_check check (
    (status = 'ferdig') = (correct_count is not null and total is not null and finished_at is not null)
  ),
  constraint quizzes_counts_check check (
    total is null or (total between 0 and 10 and correct_count between 0 and total)
  ),
  constraint quizzes_owner_id_id_key unique (owner_id, id),
  constraint quizzes_session_fkey
    foreign key (owner_id, session_id)
    references public.sessions (owner_id, id)
    on delete cascade,
  constraint quizzes_subchapter_fkey
    foreign key (owner_id, subchapter_id)
    references public.subchapters (owner_id, id)
    on delete cascade,
  constraint quizzes_carry_theme_fkey
    foreign key (owner_id, carry_theme_id)
    references public.themes (owner_id, id)
    on delete set null (carry_theme_id)
);

-- Én quiz i gang per delkapittel.
create unique index quizzes_one_in_progress_idx
  on public.quizzes (owner_id, subchapter_id)
  where status = 'pågår';

create index quizzes_subchapter_id_created_at_idx
  on public.quizzes (subchapter_id, created_at);

create trigger quizzes_set_updated_at
before update on public.quizzes
for each row execute function public.set_updated_at();

-- Resultatet fryses: en ferdig quiz endres aldri. Bare `carry_theme_id` kan bli null, når
-- temaet forsvinner (on delete set null over).
create function public.quizzes_freeze_finished()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'ferdig' and (
    new.status is distinct from old.status
    or new.correct_count is distinct from old.correct_count
    or new.total is distinct from old.total
    or new.finished_at is distinct from old.finished_at
    or new.session_id is distinct from old.session_id
    or new.subchapter_id is distinct from old.subchapter_id
    or (new.carry_theme_id is distinct from old.carry_theme_id and new.carry_theme_id is not null)
  ) then
    raise exception 'En ferdig quiz kan ikke endres.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger quizzes_freeze_finished
before update on public.quizzes
for each row execute function public.quizzes_freeze_finished();

-- Elementene i en quiz --------------------------------------------------------

create table public.quiz_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz_id uuid not null,
  position integer not null,
  question_id uuid not null,
  status text not null default 'aktiv',
  chosen_index smallint,
  correct boolean,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_items_position_check check (position between 1 and 10),
  constraint quiz_items_status_check check (status in ('aktiv', 'erstattet')),
  constraint quiz_items_answer_check check (
    (answered_at is null) = (chosen_index is null) and (answered_at is null) = (correct is null)
  ),
  constraint quiz_items_chosen_index_check check (chosen_index between 0 and 3),
  -- Bare et ubesvart element kan erstattes.
  constraint quiz_items_replaced_unanswered check (status = 'aktiv' or answered_at is null),
  constraint quiz_items_owner_id_id_key unique (owner_id, id),
  constraint quiz_items_quiz_fkey
    foreign key (owner_id, quiz_id)
    references public.quizzes (owner_id, id)
    on delete cascade,
  constraint quiz_items_question_fkey
    foreign key (owner_id, question_id)
    references public.quiz_questions (owner_id, id)
    on delete cascade
);

-- Ett aktivt element per posisjon. Erstattede elementer står igjen ved siden av.
create unique index quiz_items_one_active_per_position_idx
  on public.quiz_items (quiz_id, position)
  where status = 'aktiv';

create index quiz_items_question_id_idx on public.quiz_items (question_id);

create trigger quiz_items_set_updated_at
before update on public.quiz_items
for each row execute function public.set_updated_at();

-- Et svar fryses: et besvart element endres aldri.
create function public.quiz_items_freeze_answered()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.answered_at is not null then
    raise exception 'Et besvart spørsmål kan ikke endres.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger quiz_items_freeze_answered
before update on public.quiz_items
for each row execute function public.quiz_items_freeze_answered();

-- RLS og GRANT ----------------------------------------------------------------

alter table public.sessions enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_items enable row level security;

create policy "Eieren leser egne økter" on public.sessions
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Eieren oppretter egne økter" on public.sessions
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Eieren endrer egne økter" on public.sessions
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Eieren sletter egne økter" on public.sessions
  for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "Eieren leser egne quizer" on public.quizzes
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Eieren oppretter egne quizer" on public.quizzes
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Eieren endrer egne quizer" on public.quizzes
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Eieren sletter egne quizer" on public.quizzes
  for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "Eieren leser egne quizelementer" on public.quiz_items
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Eieren oppretter egne quizelementer" on public.quiz_items
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Eieren endrer egne quizelementer" on public.quiz_items
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Eieren sletter egne quizelementer" on public.quiz_items
  for delete to authenticated using ((select auth.uid()) = owner_id);

revoke all on table public.sessions, public.quizzes, public.quiz_items from anon, authenticated;
grant select, insert, update, delete on table public.sessions, public.quizzes, public.quiz_items
  to authenticated;
grant select, insert, update, delete on table public.sessions, public.quizzes, public.quiz_items
  to service_role;

revoke all on function public.quizzes_freeze_finished(), public.quiz_items_freeze_answered() from public, anon, authenticated;
