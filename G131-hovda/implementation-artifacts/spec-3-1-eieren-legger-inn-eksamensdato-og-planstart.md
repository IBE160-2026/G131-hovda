---
title: 'Story 3.1: Eieren legger inn eksamensdato og planstart'
type: 'feature'
created: '2026-11-26'
status: 'ready-for-dev'
baseline_commit: 'fc5dc35fbedfa3a4bc9edc6e1f5c2739e2ebde1a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Appen vet ikke når eksamen er, så den kan ikke fordele delkapitlene fram mot den (FR-3 del 2, AD-11, AD-15). Det finnes heller ingen klokke for norsk tid, bare `DemoClock`.

**Approach:** En Oslo-adapter for `Clock` og rene domenefunksjoner for studiedager og øyeblikksbildet. Brukstilfellet `startPlan` lagrer eksamensdato, planstart, G₀, R₀ og D i en ny tabell `study_plans`, én plan per emne. Eieren legger inn datoene i et skjema.

## Boundaries & Constraints

**Always:**
- `OsloClock.today()` gir datoen i Europe/Oslo (`ÅÅÅÅ-MM-DD`) fra en injisert `now()`. Studiedager er mandag–fredag. Lørdag og søndag er fleksible dager.
- Øyeblikksbildet, regnet i domenet:
  - **G₀:** aktive delkapitler i emnet som er gjennomført før planstart. «Før» betyr at Oslo-datoen til `completedAt` er tidligere enn planstart.
  - **R₀:** aktive delkapitler som ikke er med i G₀.
  - **D:** antall studiedager fra og med planstart til og med dagen før eksamensdatoen.
- Planstart er i dag (`Clock.today()`) når eieren ikke velger en annen dato. Den kan ligge før i dag.
- Eksamensdatoen må være etter planstart, og D må være minst 1. Ellers lagres ingenting, og skjemaet viser en norsk feil ved feltet.
- Endres eksamensdatoen eller planstart, lages et nytt øyeblikksbilde som erstatter det gamle. Er begge uendret, lagres ingenting.
- Bare `startPlan` kaller `saveStudyPlan`. `study_plans` har én rad per emne, eier-FK til `auth.users` med `on delete cascade`, FK til emnet med `on delete cascade`, RLS og `GRANT` (AD-10). Datoene lagres som `date`.
- `DataSource` får `getStudyPlan(courseId)` og `saveStudyPlan(plan)`, som implementeres i Supabase-, minne- og demo-adapteren. I demoen gir `getStudyPlan` `null`, og `saveStudyPlan` gir `unavailable` (3.4 legger inn demoplanen).
- Eieren legger inn datoene i et eget skjema på «Endre emne» (`/emner/[id]`), under emneskjemaet. Feltene er «Eksamensdato» og «Planstart (valgfri)», og skjemaet har egen knapp, så navnet kan endres uten at planen starter på nytt. Feltene er forhåndsutfylt med planen som finnes (Martes valg 26.11.2026).
- Startsiden viser eksamensdatoen under eksamensformen, som «Eksamensdato: 10. desember 2026», når emnet har en plan.

**Never:**
- Ingen planformel, foran/bak eller dagens forslag (3.2 og 3.3).
- Ingen endring i `courses` eller i `CourseInput`.
- Migreringen kjøres ikke mot `prod` uten Martes ja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Første plan | I dag 26.11.2026 (torsdag), eksamen 10.12, 7 av 9 aktive gjennomført før i dag | Planstart 26.11, G₀ = 7, R₀ = 2, D = 10 | N/A |
| Planstart i fortiden | Planstart 1.10, eksamen 10.12, ingenting gjennomført før 1.10 | G₀ = 0, R₀ = alle aktive, D = 50 | N/A |
| Ny eksamensdato | Plan finnes, ny dato 11.12 | Ny rad erstatter den gamle, med planstart i dag og D = 11 | N/A |
| Uendret | Samme eksamensdato og planstart | Ingenting lagres | N/A |
| Eksamen før planstart | Eksamen 20.11, planstart 26.11 | Ingenting lagres | Feil ved eksamensdatoen |
| Ingen studiedager | Planstart lørdag 28.11, eksamen mandag 30.11 | Ingenting lagres | Feil: ingen studiedager før eksamen |
| Midnatt | `now` = 2026-11-26T22:59:59Z og 23:00:00Z | `today()` gir 26.11 og 27.11 (vintertid, UTC+1) | N/A |
| Sommertid | `now` = 2026-07-01T21:59:59Z og 22:00:00Z | 1.7 og 2.7 (UTC+2) | N/A |
| Gjennomført natt | `completedAt` 2026-11-25T23:30:00Z, planstart 26.11 | Teller ikke i G₀ (Oslo-dato 26.11) | N/A |
| Databasefeil | `unavailable` | Ingenting lagres | `unavailableMessage` i skjemaet |

</frozen-after-approval>

## Code Map

- `src/application/clock.ts` -- porten `Clock` med `today()`. Uendret.
- `src/adapters/clock/demoClock.ts` -- mønster. Ny `osloClock.ts` ved siden av, med `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo" })`.
- `src/composition/server.ts` -- får `getClock()` som gir `OsloClock`.
- `src/domain/` -- ny `studyPlan.ts` (+ test): `isStudyDay(date)`, `studyDaysBetween(from, toExclusive)`, `osloDate(isoTimestamp)`, `planSnapshot(...)` og valideringen med norske meldinger.
- `src/application/dataSource.ts` -- nye typer `StudyPlan` (`courseId`, `examDate`, `planStart`, `g0`, `r0`, `d`) og de to metodene.
- `src/application/` -- ny `studyPlan.ts` (+ test mot `MemoryDataSource`): `startPlan(data, clock, courseId, { examDate, planStart })`. Den leser `listChapters` (aktive delkapitler) og `listCompletions`.
- `src/application/testing/MemoryDataSource.ts`, `src/adapters/supabase/dataSource.ts`, `src/adapters/demo/dataSource.ts` -- implementer metodene. Supabase-mønsteret finnes i `listCompletions` (`guarded`, `owner_id`).
- `supabase/migrations/20261121140000_subchapter_completions.sql` -- mønster for eier-FK, sammensatt FK, RLS og `GRANT`. Ny `2026112612xxxx_study_plans.sql` med `unique (owner_id, course_id)` og upsert.
- `src/app/(innlogget)/emner/actions.ts`, `formState.ts` og `CourseForm.tsx` -- mønster for skjema med server action og feil per felt.
- `src/app/(innlogget)/start/page.tsx` og `src/app/_screens/CourseHeader.tsx` -- eksamensdatoen vises her. `CourseHeader` får en valgfri `examDate`. Demoen sender den ikke ennå.
- `src/adapters/supabase/rls.dev.test.ts` -- legg til `study_plans` i RLS-testene mot `dev`.

## Tasks & Acceptance

**Execution:**
- [ ] `src/adapters/clock/osloClock.ts` (+ test) -- matriseradene for midnatt og sommertid
- [ ] `src/domain/studyPlan.ts` (+ test) -- studiedager, Oslo-dato for tidspunkter, øyeblikksbildet og valideringen
- [ ] `supabase/migrations/…_study_plans.sql` -- tabellen, RLS og `GRANT`
- [ ] `src/application/dataSource.ts` og de tre adapterne -- `getStudyPlan` og `saveStudyPlan`
- [ ] `src/application/studyPlan.ts` (+ test) -- `startPlan` og matriseradene
- [ ] `src/composition/server.ts` -- `getClock()`
- [ ] `src/app/(innlogget)/emner/[id]/page.tsx`, ny `StudyPlanForm.tsx` og `actions.ts` -- skjemaet med server action, feil per felt og forhåndsutfylte verdier
- [ ] `src/app/(innlogget)/start/page.tsx` og `_screens/CourseHeader.tsx` -- eksamensdatoen
- [ ] `src/adapters/supabase/rls.dev.test.ts` -- `study_plans`
- [ ] `README.md` -- kort om eksamensdato og planstart

**Acceptance Criteria:**
- Gitt migreringen, når den kjøres mot `dev` og `npm run test:dev` kjøres, så kan eieren bare lese og skrive sine egne planer.
- Gitt koden, når den søkes gjennom, så kaller bare `startPlan` metoden `saveStudyPlan`, og ingen datologikk bruker `new Date()` direkte utenom `OsloClock`.

## Design Notes

Avgjørelsene som er tatt her, og hvorfor: `study_plans` har én rad per emne, fordi en ny eksamensdato erstatter planen og ingenting trenger historikken. Planen ligger i en egen tabell og ikke i `courses`, fordi bare `startPlan` skal skrive den (AD-15).

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint` og `npm test` -- ingen feil
- `npx supabase db push` mot `dev`, så `npm run test:dev` -- RLS-testene for `study_plans` er grønne

**Manual checks:**
- `npm run dev` mot `dev`: legg inn 10.12.2026 for IBE430, se datoen på startsiden, endre til 11.12, og se at G₀, R₀ og D i `dev` stemmer.

## Implementation Notes

## Spec Change Log

## Review Triage Log
