-- Story 1.4: kapitler (chapters) og delkapitler (subchapters) fra notatfilene.
-- Hver tabell har eier med FK til auth.users og on delete cascade, RLS og GRANT (AD-10).
-- Kapittel = (eier, emne, nummer), delkapittel = (eier, kapittel, «n.m») (AD-5). Titler er attributter.
-- Bare importen (src/application/importChapter.ts) skriver kapitler og delkapitler.

-- Kapitler --------------------------------------------------------------------

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid not null,
  number integer not null,
  title text not null,
  learning_goals text not null default '',
  key_concepts text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapters_number_positive check (number > 0),
  constraint chapters_title_not_blank check (btrim(title) <> ''),
  -- Kapittelet hører alltid til et av eierens egne emner, og forsvinner med emnet.
  constraint chapters_course_fkey
    foreign key (owner_id, course_id)
    references public.courses (owner_id, id)
    on delete cascade,
  constraint chapters_owner_id_course_id_number_key unique (owner_id, course_id, number),
  -- Gjør det mulig for subchapters å peke på (eier, kapittel).
  constraint chapters_owner_id_id_key unique (owner_id, id)
);

create trigger chapters_set_updated_at
before update on public.chapters
for each row execute function public.set_updated_at();

alter table public.chapters enable row level security;

create policy "Eieren leser egne kapitler" on public.chapters
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Eieren oppretter egne kapitler" on public.chapters
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Eieren endrer egne kapitler" on public.chapters
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Eieren sletter egne kapitler" on public.chapters
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on table public.chapters from anon, authenticated;
grant select, insert, update, delete on table public.chapters to authenticated;
-- Importen kjører uten innlogget økt, med service role (omgår RLS, men filtrerer selv på eier).
grant select, insert, update, delete on table public.chapters to service_role;

-- Delkapitler -----------------------------------------------------------------

create table public.subchapters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chapter_id uuid not null,
  -- «n.m», f.eks. «1.2». Nummeret er identiteten (AD-5).
  number text not null,
  -- Rekkefølgen i notatfilen, fra 1.
  position integer not null,
  title text not null,
  note_text text not null default '',
  -- Null betyr aktivt. Et delkapittel som er borte fra notatfilen, merkes som fjernet og beholder
  -- historikken. Kommer nummeret tilbake, blir det samme delkapittel aktivt igjen.
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subchapters_number_format check (number ~ '^[0-9]+\.[0-9]+$'),
  constraint subchapters_position_positive check (position > 0),
  constraint subchapters_title_not_blank check (btrim(title) <> ''),
  constraint subchapters_chapter_fkey
    foreign key (owner_id, chapter_id)
    references public.chapters (owner_id, id)
    on delete cascade,
  constraint subchapters_owner_id_chapter_id_number_key unique (owner_id, chapter_id, number),
  constraint subchapters_owner_id_id_key unique (owner_id, id)
);

create index subchapters_chapter_id_idx on public.subchapters (chapter_id);

create trigger subchapters_set_updated_at
before update on public.subchapters
for each row execute function public.set_updated_at();

alter table public.subchapters enable row level security;

create policy "Eieren leser egne delkapitler" on public.subchapters
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Eieren oppretter egne delkapitler" on public.subchapters
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Eieren endrer egne delkapitler" on public.subchapters
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Eieren sletter egne delkapitler" on public.subchapters
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on table public.subchapters from anon, authenticated;
grant select, insert, update, delete on table public.subchapters to authenticated;
grant select, insert, update, delete on table public.subchapters to service_role;

-- Importen slår opp emnet med service role.
grant select on table public.courses to service_role;
