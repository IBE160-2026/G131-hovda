---
title: 'Story 3.2: Eieren ser om planen holdes, foran eller bak'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_commit: '7690b27e47b66f911346a120196d822eb03a1d3c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Startsiden viser bare andelen gjennomført. Eieren ser ikke om hun ligger foran eller bak studieplanen, eller hva som skal til for å komme i rute (FR-9, FR-20 del 2, UX-3).

**Approach:** En ren planformel i `src/domain/studyPlan.ts` regner planlagt, forventet og etterslep for en dag fra øyeblikksbildet i 3.1. Framdriftsindikatoren på startsiden viser «i rute», forsprang eller etterslep med veien tilbake, i tillegg til andelen.

## Boundaries & Constraints

**Always:**
- d = studiedager fra og med planstart til og med i går (`studyDaysBetween(planStart, today)`), høyst D. Før planstart er d = 0.
- Planlagt i dag = G₀ + ⌈R₀ × d / D⌉.
- Forventet i dag = min(planlagt i dag, N). N er antall aktive delkapitler som er gjennomført eller har notater (`hasNotes`). Det er det samme som G₀ + R₀-delkapitlene med notater (se Design Notes).
- Etterslep = forventet − gjennomførte. «Gjennomført» er `completed` fra `listChapterOverview` (avkrysningen). Bak når etterslepet er > 0. Forsprang når det er < 0. I rute ellers.
- **Veien tilbake (Martes valg 26.11.2026, fast tempo):** Hver dag gjør eieren k = min(3, maks(1, ⌈R₀ / D⌉) + 1) delkapitler, også lørdag og søndag mens hun ligger bak. Domenet regner dag for dag fra i dag, med høyst N gjennomførte, til første dag t der forventet(t) − gjennomførte ≤ 0, og t ≤ eksamensdatoen. Teksten blir «2 delkapitler i kveld, så er du i rute søndag». Finnes ingen slik t, står det «2 delkapitler om dagen tar deg nærmere planen.» Regelen for k er en egen domenefunksjon, `dailySuggestionSize`, som 3.3 bruker.
- «I dag» kommer fra `getClock().today()`. Datologikken bruker aldri `new Date()`.
- Tekstene bruker ikke skyldspråk: «Du er i rute.», «2 delkapitler foran planen.», «3 delkapitler bak planen.» (entall: «1 delkapittel»). Etterslepet er tydelig markert, med varm farge og ikke bare farge (teksten sier det).
- Uten plan, eller når planen ikke kan leses, vises indikatoren som i dag. Demoen er uendret (3.4).

**Never:**
- Ingen dagens forslag på startsiden og ingen «Start økta»-knapp (3.3).
- Ingen skriving: 3.2 leser bare. Ingen migrering.

## I/O & Edge-Case Matrix

Plan: planstart tor 26.11.2026, eksamen tor 10.12, G₀ = 1, R₀ = 8, D = 10. Alle har notater hvis ikke annet står.

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Første dag | I dag 26.11 (d = 0), 1 gjennomført | Planlagt 1, i rute | N/A |
| Vanlig etterslep | I dag tor 3.12 (d = 5), 2 gjennomført | Planlagt 5, 3 bak, k = 2, «2 delkapitler i kveld, så er du i rute søndag» | N/A |
| Rekker ikke | I dag ons 9.12, 1 gjennomført | 8 bak, «2 delkapitler om dagen tar deg nærmere planen.» | N/A |
| Forsprang | I dag man 30.11 (d = 2), 5 gjennomført | Planlagt 3, 2 foran | N/A |
| Uten notater | I dag 3.12, bare 2 av de 8 har notater, 3 gjennomført | N = 3, forventet 3, i rute | N/A |
| Dagen før eksamen | I dag ons 9.12 (d = 9), 8 gjennomført | Planlagt 9, 1 bak | N/A |
| Etter eksamen | I dag 11.12 | d = D, planlagt 9 | N/A |
| Planstart fram i tid | I dag før planstart | d = 0 | N/A |
| Plan kan ikke leses | `getStudyPlan` gir `unavailable` | Indikatoren som før, uten foran/bak | Ingen feilmelding |

</frozen-after-approval>

## Code Map

- `src/domain/studyPlan.ts` (+ test) -- har `studyDaysBetween`, `isStudyDay`, `norwegianDate` og `PlanSnapshot`. Nye `planStatus(...)`, `dailySuggestionSize(r0, D, behind)` og veien tilbake. Følg mønsteret: rene funksjoner, dagnummer via `Date.UTC`.
- `src/domain/progress.ts` -- `courseProgress`. Uendret.
- `src/domain/hasNotes.ts` -- eneste definisjon av «har notater».
- `src/application/chapterOverview.ts` -- `SubchapterOverview` har `noteText` og `completed`. Uendret.
- `src/app/_screens/Progress.tsx` -- får valgfri `plan` (`StudyPlan | null`) og `today`. Uten dem er den uendret, og demoen (`src/app/demo/emner/[id]/DemoCourse.tsx`) sender dem ikke.
- `src/app/(innlogget)/emner/formState.ts` -- her ligger tekstene `progressText` og `remainingText`. Legg de nye tekstfunksjonene ved siden av.
- `src/app/(innlogget)/start/page.tsx` -- leser allerede `getStudyPlan`. Send planen og `getClock().today()` til `Progress`.
- `src/composition/server.ts` -- `getClock()` finnes.
- `src/app/(innlogget)/start/page.test.ts` -- mønster med `render(..., plan)`. Mock `getClock` i `vi.mock("@/composition/server")`.
- `src/app/globals.css` -- fargetokenene (for eksempel `bg-mint`). Bruk et eksisterende varmt token for etterslep, eller legg til ett med kontrast ≥ 4.5:1.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/studyPlan.ts` (+ test) -- `planStatus` og veien tilbake, og alle matriseradene
- [x] `src/app/(innlogget)/emner/formState.ts` -- tekstene for i rute, foran, bak og veien tilbake, med entall og flertall
- [x] `src/app/_screens/Progress.tsx` -- foran/bak under andelen, og etterslepet markert
- [x] `src/app/(innlogget)/start/page.tsx` (+ `page.test.ts`) -- send plan og dato. Tester for bak, foran, i rute, ingen plan og plan som ikke kan leses
- [x] `README.md` -- kort om foran/bak i seksjonen om eksamensdato og planstart

**Acceptance Criteria:**
- Gitt at eieren ligger bak, når startsiden vises, så står etterslepet og veien tilbake i framdriftsindikatoren, og en skjermleser leser det som tekst.
- Gitt koden, når den søkes gjennom, så regnes ingen «gjennomført» på egen hånd, og bare `hasNotes` avgjør «har notater».
- Gitt 375 px bredde, når startsiden vises med etterslep, så er det ingen sidelengs rulling.

## Implementation Notes

- Implementert direkte i hovedøkta, uten subagent.
- `planStatus` tar `{ completed, reachable }` (reachable = N), og Progress regner N med `hasNotes`. Veien tilbake øker d dag for dag i stedet for å kalle `studyDaysBetween` per dag.
- Etterslepet står i en boks med `bg-sun`, som er et eksisterende token. Mørk tekst på #fde68a har god kontrast. Ingen nye fargetokener.
- `dailySuggestionSize(r0, studyDays, behind)` og `MAX_DAILY_SUGGESTION` er eksportert for 3.3.
- Sjekker: typecheck og lint er rene, og `npm test` gir 628 grønne tester.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | verification-gap, blind-hunter | `reachable` filter in `Progress` (notes / completed) not covered at page level | medium | Pre-verified: all page fixtures have notes on every subchapter, so dropping the filter passes all tests. | patch |
| 2 | verification-gap, blind-hunter | Singular «1 delkapittel» and «i morgen» never rendered in tests | low | Pre-verified: no test asserts singular; direct test addition. | patch |
| 3 | blind-hunter, edge-case | Catch-up text asks for `perDay` tonight even when fewer reachable subchapters remain | low | `reachable − completed = 1` gives «2 delkapitler i kveld» though only 1 can be taken; direct `Math.min` in `PlanLine`. The «backlog 1, perDay 2» part is correct: planned rises by 1 the next day. | patch |
| 4 | blind-hunter | `relativeDayLabel` boundary at diff = 7 untested | low | One-line assertion. | patch |
| 5 | blind-hunter, edge-case | After the exam a behind owner sees «… om dagen tar deg nærmere planen.» | low | Real, but only after the exam date; fix adds a new state and text. | reject |
| 6 | blind-hunter | `onTrackOn` can be the exam date («i rute i morgen» the day before exam) | false | Frozen rule says t ≤ eksamensdatoen; intended. | reject |
| 7 | edge-case, blind-hunter | Stored `d = 0` divides by zero | false | DB check `d >= 1` and `validateStudyPlanDates` prevent it. | reject |
| 8 | edge-case, blind-hunter | Invalid stored dates make `requireDay` throw and crash the page | false | Columns are `date`; the adapter returns `ÅÅÅÅ-MM-DD`. | reject |
| 9 | edge-case, blind-hunter | `completed < g0` (deactivated subchapter after planstart) gives backlog on day 1; simulation before planstart | low | Needs re-import removing a counted subchapter; no uncheck exists (only `finishQuiz` writes completions). Snapshot staleness is the 3.1 design. | reject |
| 10 | edge-case | Demo would use `OsloClock` | false | Demo renders `DemoCourse`, not `ActiveCourse`, and passes no plan; 3.4 owns the demo clock. | reject |
| 11 | blind-hunter | Far-date label has no year | low | Plans span weeks; cosmetic. | reject |
| 12 | blind-hunter | Module-level `today` in page test only reset in new describe | low | Earlier tests assert nothing plan-related; no harm. | reject |
| 13 | blind-hunter | README omits d ≤ D, d = 0 before planstart, fallback text | low | README is a summary; details live in the domain docs. | reject |
| 14 | blind-hunter | Dark-mode contrast of `bg-sun` not recorded | false | #f3f4f8 on #78591a ≈ 5.9:1, above 4.5:1. | reject |
| 15 | blind-hunter | 375 px criterion has no automated check | low | Manual check listed for Marte; `break-words` and no fixed widths. | reject |

## Design Notes

**«Ikke-gjennomførte med notater» betyr R₀-delkapitlene med notater.** Leser man det som delkapitler som ikke er gjennomført nå, synker taket hver gang eieren fullfører et delkapittel. Da gir 7 gjennomførte på 3.12 «4 foran» i stedet for «2 foran». N teller derfor delkapitler som er gjennomført eller har notater. Det er lik G₀ + R₀ med notater så lenge emnet har de samme aktive delkapitlene som ved planstart.

**Dag i teksten:** «i morgen» for neste dag, ukedagen («søndag») de neste 6 dagene, ellers «mandag 14. desember».

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint` og `npm test` -- ingen feil

**Manual checks:**
- `npm run dev` mot `dev`: startsiden for IBE430 viser foran/bak ut fra planen fra 26.11 (G₀ = 1, R₀ = 8, D = 11).
