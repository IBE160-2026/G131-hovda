-- Story 1.9b: eieren sier fra om feil i sammendrag (FR-12, AD-18).
-- Eier med FK til auth.users og on delete cascade, RLS og GRANT (AD-10).
-- Rapporten peker på sammendragsversjonen eieren leste, ikke på delkapittelet. Én rapport per
-- versjon. Sammendraget er merket så lenge den meldte versjonen er siste klare. En ny klar versjon
-- har ingen rapport, så merket forsvinner av seg selv, og den gamle rapporten står igjen som
-- historikk. Rapporten angres aldri: det finnes ingen policy eller GRANT for update og delete.

-- Så rapporten kan ha en sammensatt eier-FK til versjonen.
alter table public.summary_versions
  add constraint summary_versions_owner_id_id_key unique (owner_id, id);

create table public.summary_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  summary_version_id uuid not null,
  comment text,
  reported_at timestamptz not null default now(),
  constraint summary_reports_one_per_version unique (owner_id, summary_version_id),
  constraint summary_reports_comment_check check (comment is null or char_length(comment) between 1 and 500),
  constraint summary_reports_summary_version_fkey
    foreign key (owner_id, summary_version_id)
    references public.summary_versions (owner_id, id)
    on delete cascade
);

alter table public.summary_reports enable row level security;

create policy "Eieren leser egne sammendragsrapporter" on public.summary_reports
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Eieren oppretter egne sammendragsrapporter" on public.summary_reports
  for insert to authenticated with check ((select auth.uid()) = owner_id);

revoke all on table public.summary_reports from anon, authenticated;
-- Å melde på nytt er `insert … on conflict do nothing`, som bare krever insert.
grant select, insert on table public.summary_reports to authenticated;
-- Importen leser rapportene med service-nøkkelen.
grant select on table public.summary_reports to service_role;
