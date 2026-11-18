-- Story 1.5a: versjoner av KI-sammendraget for hvert delkapittel (FR-11, AD-4, AD-7, AD-8).
-- Eier med FK til auth.users og on delete cascade, RLS og GRANT (AD-10).
-- Bare importen (src/application/importChapter.ts) skriver versjoner. En versjon endres ikke
-- etter at den er lagret, og en feilet versjon tar aldri bort en klar.

create table public.summary_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subchapter_id uuid not null,
  -- `lages` brukes ikke av importen ennå (den lagrer etter KI-svaret), men tillates så 1.5b og
  -- senere bruk ikke krever ny migrering.
  status text not null,
  text text,
  model_id text not null,
  prompt_version text not null,
  -- hash(normalisert notat + kapittelets læringsmål og nøkkelbegreper + promptversjon) (AD-4).
  input_hash text not null,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint summary_versions_status_check check (status in ('lages', 'klart', 'feilet')),
  constraint summary_versions_ready_has_text check (status <> 'klart' or (text is not null and btrim(text) <> '')),
  constraint summary_versions_failed_has_error check (status <> 'feilet' or (error is not null and btrim(error) <> '')),
  -- Versjonen hører alltid til et av eierens egne delkapitler, og forsvinner med det.
  constraint summary_versions_subchapter_fkey
    foreign key (owner_id, subchapter_id)
    references public.subchapters (owner_id, id)
    on delete cascade
);

create index summary_versions_subchapter_id_created_at_idx
  on public.summary_versions (subchapter_id, created_at);

create trigger summary_versions_set_updated_at
before update on public.summary_versions
for each row execute function public.set_updated_at();

alter table public.summary_versions enable row level security;

create policy "Eieren leser egne sammendrag" on public.summary_versions
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Eieren oppretter egne sammendrag" on public.summary_versions
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Eieren endrer egne sammendrag" on public.summary_versions
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Eieren sletter egne sammendrag" on public.summary_versions
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on table public.summary_versions from anon, authenticated;
grant select, insert, update, delete on table public.summary_versions to authenticated;
-- Importen kjører uten innlogget økt, med service role (omgår RLS, men filtrerer selv på eier).
grant select, insert, update, delete on table public.summary_versions to service_role;
