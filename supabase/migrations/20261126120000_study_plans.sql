-- Story 3.1: studieplanen for et emne (FR-3 del 2, AD-11, AD-15).
-- Eier med FK til auth.users og on delete cascade, RLS og GRANT (AD-10).
-- Én rad per emne: eksamensdatoen, planstart og øyeblikksbildet ved planstart (G₀, R₀, D).
-- En ny eksamensdato eller planstart erstatter raden (upsert på (owner_id, course_id)), fordi
-- ingenting trenger historikken. Bare `startPlan` skriver her. Raden slettes med emnet.

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid not null,
  -- Rene kalenderdatoer i Europe/Oslo, uten klokkeslett.
  exam_date date not null,
  plan_start date not null,
  g0 integer not null,
  r0 integer not null,
  d integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_plans_one_per_course unique (owner_id, course_id),
  constraint study_plans_course_fkey
    foreign key (owner_id, course_id)
    references public.courses (owner_id, id)
    on delete cascade,
  -- Domenet (src/domain/studyPlan.ts) har hele regelen. Databasen stopper det verste.
  constraint study_plans_exam_after_start check (exam_date > plan_start),
  constraint study_plans_counts check (g0 >= 0 and r0 >= 0 and d >= 1)
);

create trigger study_plans_set_updated_at
before update on public.study_plans
for each row execute function public.set_updated_at();

alter table public.study_plans enable row level security;

create policy "Eieren leser egne studieplaner" on public.study_plans
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Eieren oppretter egne studieplaner" on public.study_plans
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Eieren endrer egne studieplaner" on public.study_plans
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- Ingen delete: planen erstattes med upsert og slettes bare med emnet (on delete cascade).
revoke all on table public.study_plans from anon, authenticated;
grant select, insert, update on table public.study_plans to authenticated;
grant select, insert, update on table public.study_plans to service_role;
