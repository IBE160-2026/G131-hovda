---
title: 'Story 3.1: Eieren legger inn eksamensdato og planstart'
type: 'feature'
created: '2026-11-26'
status: 'done'
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
- [x] `src/adapters/clock/osloClock.ts` (+ test) -- matriseradene for midnatt og sommertid
- [x] `src/domain/studyPlan.ts` (+ test) -- studiedager, Oslo-dato for tidspunkter, øyeblikksbildet og valideringen
- [x] `supabase/migrations/…_study_plans.sql` -- tabellen, RLS og `GRANT`
- [x] `src/application/dataSource.ts` og de tre adapterne -- `getStudyPlan` og `saveStudyPlan`
- [x] `src/application/studyPlan.ts` (+ test) -- `startPlan` og matriseradene
- [x] `src/composition/server.ts` -- `getClock()`
- [x] `src/app/(innlogget)/emner/[id]/page.tsx`, ny `StudyPlanForm.tsx` og `actions.ts` -- skjemaet med server action, feil per felt og forhåndsutfylte verdier
- [x] `src/app/(innlogget)/start/page.tsx` og `_screens/CourseHeader.tsx` -- eksamensdatoen
- [x] `src/adapters/supabase/rls.dev.test.ts` -- `study_plans`
- [x] `README.md` -- kort om eksamensdato og planstart

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

- **Forhåndsutfylt planstart og ny eksamensdato:** Skjemaet er forhåndsutfylt med planstart fra planen som finnes. For at «ny eksamensdato gir planstart i dag» skal holde, tolker `startPlan` en uendret planstart sammen med en endret eksamensdato som «ikke valgt», og bruker `clock.today()`. Vil eieren ha en annen planstart, skriver hun den inn. Tømmes planstart, blir den i dag (også når eksamensdatoen er uendret, så da lagres en ny plan hvis i dag er en annen dag).
- **Feilen ved «ingen studiedager»** vises ved eksamensdatoen.
- **`startPlan` sjekker emnet med `getCourse`** og gir `notFound` før noe leses eller lagres.
- **Tabellen:** `study_plans` har bare policy og `GRANT` for `select`, `insert` og `update` (upsert). Raden slettes bare med emnet (sammensatt FK `(owner_id, course_id)` med `on delete cascade`). Databasen sjekker også `exam_date > plan_start`, `g0, r0 >= 0` og `d >= 1`.
- **Datologikken** i domenet bruker `Date.UTC`, `Date.parse` og `Intl.DateTimeFormat`, aldri `new Date()`. De gjenværende `new Date()` i adapterne er tidspunkter i UTC (`answered_at`, `removed_at`, demo-tidspunkter), ikke kalenderdatoer, og var der fra før.
- **Migreringen** `20261126120000_study_plans.sql` er kjørt mot `dev` (studievenn-dev), ikke mot `prod`.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | verification-gap | `EditCourse` prefill of the plan form has no render test | medium | Pre-verified: no test renders `/emner/[id]`; a broken prefill would silently restart the plan via `startPlan`'s reset rule. | patch |
| 2 | blind-hunter | `invalidExamDate` suggests `10.12.2026`, which `isValidDate` rejects | low | `domain/studyPlan.test.ts` asserts `isValidDate("10.12.2026") === false`; direct text correction. | patch |
| 3 | blind-hunter | RLS tests do not cover cross-owner UPDATE on `study_plans` | medium | Migration grants `update` with an owner policy, but `rls.dev.test.ts` only checks select/insert/delete for the table. | patch |
| 4 | blind-hunter | Action "uendret" test does not assert nothing was written | low | `actions.test.ts` checks only `message`/`attempt`; one-line assertion on `planWrites`. | patch |
| 5 | blind-hunter | Module-level `getStudyPlan` mock in `start/page.test.ts` is never reset | low | `render()` passes `getStudyPlan` without `mockReset()`, unlike the other mocks; leftover `Once` values and calls leak. | patch |
| 6 | blind-hunter | Exam date in the past is accepted | low | Real with a past planstart, but the intent only requires exam after planstart and D ≥ 1; unlikely in use and the fix adds a guard. | reject |
| 7 | blind-hunter, edge-case | Future planstart accepted; completions between save and planstart land in R₀ | low | Intent does not forbid future planstart; those completions then count as plan progress in 3.2, which is benign. Unlikely, fix adds a guard. Raised to Marte. | reject |
| 8 | blind-hunter, edge-case | Changing exam date with unchanged planstart forces planstart to today | false | Frozen matrix row "Ny eksamensdato" requires planstart today; behaviour is intended. Raised to Marte as a UX note. | reject |
| 9 | edge-case | After the silent reset, a validation error refers to a planstart the form does not show | low | Needs a new exam date ≤ today or with no study days from today; rare, fix adds branching. | reject |
| 10 | blind-hunter, edge-case | `studyDaysBetween` loops per day with no date bound (e.g. 0001→9999) | low | Owner-only action behind login; ~3.6M cheap iterations; fix is a rewrite or a new bound. | reject |
| 11 | blind-hunter | No `min` on the date inputs | low | Cosmetic; server validation gives the field error. | reject |
| 12 | blind-hunter | `getStudyPlan` on the edit page waits for `getCourse` | low | Negligible latency for one owner. | reject |
| 13 | blind-hunter, edge-case | Course deleted between `getCourse` and save gives a generic error | low | Race needs two tabs and a delete mid-submit; fix adds a re-check. | reject |
| 14 | blind-hunter | Diff omits the spec and `sprint-status.yaml` | false | Intentional: the spec is the claims file given to the edge-case layer only. | reject |
| 15 | edge-case | Unparseable `completedAt` makes `osloDate` throw | false | `completed_at` is a `timestamptz` from the database and is always parseable. | reject |
| 16 | edge-case | Concurrent submits: last write wins | low | Single owner; one plan per course with upsert is the intended semantics. | reject |
