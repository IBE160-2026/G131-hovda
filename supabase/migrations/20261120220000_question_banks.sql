-- Story 1.6a: spørsmålsbanken for hvert delkapittel (FR-13, AD-6, AD-8, AD-14).
-- Eier med FK til auth.users og on delete cascade, RLS og GRANT (AD-10).
-- Bare importen (src/application/importChapter.ts) skriver her. En bankversjon lagres som `lages`,
-- så temaene og spørsmålene, og settes til `klart` til slutt. Feiler lagringen underveis, settes den
-- til `feilet`, og spørsmålene i den leses aldri. Spørsmål slettes aldri, de trekkes tilbake med status.

create table public.question_bank_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subchapter_id uuid not null,
  status text not null,
  model_id text not null,
  prompt_version text not null,
  -- hash(normalisert notat + kapittelets læringsmål og nøkkelbegreper + instruksjonsversjon) (AD-4).
  input_hash text not null,
  -- hash av temaene og spørsmålene i innholdsfila, så importen ser om banken er uendret.
  content_hash text not null,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_bank_versions_status_check check (status in ('lages', 'klart', 'feilet')),
  constraint question_bank_versions_failed_has_error check (status <> 'feilet' or (error is not null and btrim(error) <> '')),
  constraint question_bank_versions_owner_id_id_key unique (owner_id, id),
  constraint question_bank_versions_subchapter_fkey
    foreign key (owner_id, subchapter_id)
    references public.subchapters (owner_id, id)
    on delete cascade
);

create index question_bank_versions_subchapter_id_created_at_idx
  on public.question_bank_versions (subchapter_id, created_at);

create trigger question_bank_versions_set_updated_at
before update on public.question_bank_versions
for each row execute function public.set_updated_at();

-- Temaer er egne enheter per delkapittel, så samme tema ikke får ulike navn (AD-14).
create table public.themes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subchapter_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint themes_name_not_blank check (btrim(name) <> ''),
  constraint themes_owner_id_subchapter_id_name_key unique (owner_id, subchapter_id, name),
  constraint themes_owner_id_id_key unique (owner_id, id),
  constraint themes_subchapter_fkey
    foreign key (owner_id, subchapter_id)
    references public.subchapters (owner_id, id)
    on delete cascade
);

create trigger themes_set_updated_at
before update on public.themes
for each row execute function public.set_updated_at();

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subchapter_id uuid not null,
  bank_version_id uuid not null,
  theme_id uuid not null,
  -- Rekkefølgen i innholdsfila, fra 1.
  position integer not null,
  question text not null,
  options text[] not null,
  correct_index smallint not null,
  explanation text not null,
  -- Nummeret i `## Spørsmålsbank` når spørsmålet er eierens eget, ellers null (KI-generert).
  source_number integer,
  -- Ja/Nei-spørsmål skrives om til flervalg, og originalteksten lagres (AD-6).
  rewritten boolean not null default false,
  original_text text,
  status text not null default 'aktiv',
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_questions_status_check check (status in ('aktiv', 'trukket')),
  constraint quiz_questions_retired_check check ((status = 'trukket') = (retired_at is not null)),
  constraint quiz_questions_four_options check (cardinality(options) = 4),
  constraint quiz_questions_correct_index_check check (correct_index between 0 and 3),
  constraint quiz_questions_question_not_blank check (btrim(question) <> '' and btrim(explanation) <> ''),
  constraint quiz_questions_rewritten_check check (
    rewritten = (original_text is not null) and (not rewritten or source_number is not null)
  ),
  constraint quiz_questions_owner_id_id_key unique (owner_id, id),
  constraint quiz_questions_subchapter_fkey
    foreign key (owner_id, subchapter_id)
    references public.subchapters (owner_id, id)
    on delete cascade,
  constraint quiz_questions_bank_version_fkey
    foreign key (owner_id, bank_version_id)
    references public.question_bank_versions (owner_id, id)
    on delete cascade,
  constraint quiz_questions_theme_fkey
    foreign key (owner_id, theme_id)
    references public.themes (owner_id, id)
    on delete cascade
);

create index quiz_questions_bank_version_id_position_idx
  on public.quiz_questions (bank_version_id, position);

create trigger quiz_questions_set_updated_at
before update on public.quiz_questions
for each row execute function public.set_updated_at();

alter table public.question_bank_versions enable row level security;
alter table public.themes enable row level security;
alter table public.quiz_questions enable row level security;

create policy "Eieren leser egne bankversjoner" on public.question_bank_versions
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Eieren oppretter egne bankversjoner" on public.question_bank_versions
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Eieren endrer egne bankversjoner" on public.question_bank_versions
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Eieren sletter egne bankversjoner" on public.question_bank_versions
  for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "Eieren leser egne temaer" on public.themes
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Eieren oppretter egne temaer" on public.themes
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Eieren endrer egne temaer" on public.themes
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Eieren sletter egne temaer" on public.themes
  for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "Eieren leser egne quizspørsmål" on public.quiz_questions
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Eieren oppretter egne quizspørsmål" on public.quiz_questions
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Eieren endrer egne quizspørsmål" on public.quiz_questions
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Eieren sletter egne quizspørsmål" on public.quiz_questions
  for delete to authenticated using ((select auth.uid()) = owner_id);

revoke all on table public.question_bank_versions, public.themes, public.quiz_questions from anon, authenticated;
grant select, insert, update, delete on table public.question_bank_versions, public.themes, public.quiz_questions
  to authenticated;
-- Importen kjører uten innlogget økt, med service role (omgår RLS, men filtrerer selv på eier).
grant select, insert, update, delete on table public.question_bank_versions, public.themes, public.quiz_questions
  to service_role;
