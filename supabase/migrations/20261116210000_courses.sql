-- Story 1.3: emner (courses) og eierens innstillinger (user_settings).
-- Hver tabell har eier med FK til auth.users og on delete cascade, RLS og GRANT (AD-10).

-- Holder updated_at oppdatert ved endring.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- Emner -----------------------------------------------------------------------

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code text not null,
  name text not null,
  learning_outcomes text not null default '',
  exam_form text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Domenet (src/domain/course.ts) har hele regelen. Databasen stopper det verste.
  constraint courses_code_format check (char_length(code) between 1 and 20 and code !~ '\s'),
  constraint courses_name_not_blank check (btrim(name) <> ''),
  -- Gjør det mulig for user_settings å peke på (eier, emne), så aktivt emne alltid er eierens eget.
  constraint courses_owner_id_id_key unique (owner_id, id)
);

-- Emnekoden er unik per eier, uansett store eller små bokstaver.
create unique index courses_owner_id_code_key on public.courses (owner_id, upper(code));

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

alter table public.courses enable row level security;

create policy "Eieren leser egne emner" on public.courses
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Eieren oppretter egne emner" on public.courses
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Eieren endrer egne emner" on public.courses
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Eieren sletter egne emner" on public.courses
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on table public.courses from anon, authenticated;
grant select, insert, update, delete on table public.courses to authenticated;

-- Eierens innstillinger (aktivt emne) -----------------------------------------

create table public.user_settings (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  active_course_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Slettes det aktive emnet, blir bare active_course_id tom (eieren blir stående).
  constraint user_settings_active_course_fkey
    foreign key (owner_id, active_course_id)
    references public.courses (owner_id, id)
    on delete set null (active_course_id)
);

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "Eieren leser egne innstillinger" on public.user_settings
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Eieren oppretter egne innstillinger" on public.user_settings
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Eieren endrer egne innstillinger" on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Eieren sletter egne innstillinger" on public.user_settings
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on table public.user_settings from anon, authenticated;
grant select, insert, update, delete on table public.user_settings to authenticated;
