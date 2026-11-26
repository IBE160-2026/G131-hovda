---
title: 'Story 3.4: Demoen viser dagens forslag og foran/bak'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_commit: '52a25285fe000bf26da1a72660191f6cb635c6b7'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Demoen har ingen studieplan, så sensor og faglærer ser verken dagens forslag eller foran/bak, og ser ikke at appen tar beslutningen for brukeren (FR-26 del 2).

**Approach:** Demofila får faste planinndata (demo-eksamensdato, planstart, demo-dag) fra `export-demo`, validert mot skjemaet. `DemoDataSource` gir en studieplan ut fra dem, `DemoClock` gir demo-dagen, og demosiden viser de samme skjermene som startsiden: `DailySuggestion` og `Progress` med plan.

## Boundaries & Constraints

**Always:**
- **Faste datoer:** `DEMO_PLAN = { examDate: "2026-12-10", planStart: "2026-11-30", today: "2026-12-01" }` i `src/application/demoData.ts`. Demo-dagen er den samme som i dag (tirsdag 1.12), så tidspunktene i besøket er som før.
- **Planen i demoen:** `getStudyPlan` gir planen med `planSnapshot` over alle delkapitlene i fila og ingen avkrysninger før planstart: G₀ = 0, R₀ = antall delkapitler, D = studiedager (8). Med dagens 7 delkapitler er studenten 1 bak, forslaget er 1.1 og 1.2, og veien tilbake er «2 delkapitler i kveld, så er du i rute i morgen».
- **Skjemaet:** `DEMO_SCHEMA_VERSION` blir 2, og fila får feltet `plan` med nøyaktig `examDate`, `planStart` og `today`. Validatoren krever gyldige datoer, at `validateStudyPlanDates` godtar planstart og eksamensdato, og at `planStart <= today < examDate`. Feil gir en norsk melding med stien, som de andre feltene.
- `buildDemoData` legger `DEMO_PLAN` i fila. `demo-data/demo.json` oppdateres med `schemaVersion: 2` og `plan`, ellers uendret.
- **Klokka:** `DemoClock` gir `today` fra den validerte fila (`DEMO_PLAN.today` når fila er ugyldig). `DemoDataSource` regner tidspunktene i besøket fra den samme datoen. `DEMO_TODAY` fjernes.
- **Forslaget ligger fast:** Avkrysninger i besøket får tidspunkt på demo-dagen og teller derfor ikke i forslaget (AD-15), men framdriften oppdateres. Etter 1.1 viser forslaget 1.1 merket «✓ gjennomført», og framdriften sier i rute.
- Alle besøkende ser det samme. Ingen forespørsler til Supabase, ingen varig lagring (NFR-5).
- Kan planen ikke leses, vises emnet uten forslag og uten foran/bak, som på startsiden.
- **Plassering (Martes valg 26.11.2026):** Forslaget står på emnekortet `/demo/emner/demo-ibe430`, over framdriften, slik startsiden har det. `/demo` (emnelisten) endres ikke.

**Never:**
- Ingen ny planlogikk eller ny tekst: `dailySuggestion`, `planStatus`, `DailySuggestion` og `Progress` brukes uendret.
- Ingen falske avkrysninger i demofila. Ingen endring i appen for eieren.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Første visning | Nytt besøk, 1.12 | Forslag 1.1 og 1.2, 1 bak, «i rute i morgen» | N/A |
| Fullført i besøket | 1.1 gjennomført | Forslaget uendret, 1.1 merket, framdriften i rute, 1 av 7 | N/A |
| Begge fullført | 1.1 og 1.2 | «Dagens økt er gjort.», 1 foran | N/A |
| Fila mangler `plan` | `schemaVersion: 1` | Ugyldig fil, feilmeldingen på alle demosider | `unavailable` |
| Ugyldige datoer | `today` etter eksamen, eller planstart etter eksamen | Valideringsfeil med sti | Eksporten skriver ingenting |

</frozen-after-approval>

## Code Map

- `src/application/demoData.ts` -- skjema, `validateDemoData`, `buildDemoData`. Legg til `DEMO_PLAN`, typen `DemoPlan`, feltet `plan` og valideringen. Bruk `isValidDate` og `validateStudyPlanDates` fra `@/domain/studyPlan`.
- `src/application/demoData.test.ts` -- fixture med `schemaVersion: 1` (linje 93), serialiseringen (252) og versjonsfeil (278–284).
- `demo-data/demo.json` -- legg til `plan` etter `course`, `schemaVersion: 2`. `scripts/demoFiles.test.ts` validerer fila i CI.
- `src/adapters/clock/demoClock.ts` -- `DemoClock(today)`, fjern `DEMO_TODAY`.
- `src/adapters/demo/dataSource.ts` -- `DEMO_START_MS` og `DEMO_CREATED_AT` fra fila. `getStudyPlan(courseId)` med `planSnapshot`: kjent emne gir planen, ukjent `null`, ugyldig fil `unavailable`. Fjern kommentaren «Demoplanen kommer i 3.4». En offentlig `today` som komposisjonsroten bruker.
- `src/adapters/demo/dataSource.test.ts` -- tester for planen.
- `src/composition/demo.ts` -- `new DemoClock(source.today)`.
- `src/app/demo/emner/[id]/DemoCourse.tsx` -- `loadDemoCourse` henter også `getStudyPlan`. Vis `DailySuggestion` over `Progress` med `plan`, `today` (`getDemo().clock.today()`) og samme `subchapterHref` som `ChapterList`. `CourseHeader` får `examDate`. Mønsteret er `ActiveCourse` i `src/app/(innlogget)/start/page.tsx`.
- `src/app/demo/demoScreens.test.ts` -- tester for demosiden.
- `README.md` -- linje 50 («Demoen har ingen plan ennå») og seksjonen «Demoen» (linje 112–114).

## Tasks & Acceptance

**Execution:**
- [x] `src/application/demoData.ts` (+ test) -- `DEMO_PLAN`, `plan` i skjemaet og i `buildDemoData`, versjon 2, valideringsfeil
- [x] `demo-data/demo.json` -- `schemaVersion: 2` og `plan`
- [x] `src/adapters/clock/demoClock.ts`, `src/adapters/demo/dataSource.ts` (+ test), `src/composition/demo.ts` -- demo-dagen fra fila og planen
- [x] `src/app/demo/emner/[id]/DemoCourse.tsx` (+ `demoScreens.test.ts`) -- forslaget, foran/bak og eksamensdatoen. Tester for matriseradene
- [x] `README.md` -- demoplanen og de faste datoene

**Acceptance Criteria:**
- Gitt demofilene, når `export-demo` kjøres, så har fila `plan` med de faste datoene, og samme innhold gir byte for byte samme fil.
- Gitt demoen, når den demobesøkende åpner emnet, så står dagens forslag med «Start økta» øverst og framdriften med etterslep og veien tilbake under.
- Gitt demoen, når importene sjekkes i CI, så når demoen fortsatt ikke Supabase-adapteren.
- Gitt 375 px bredde, når forslaget og etterslepet vises, så er det ingen sidelengs rulling.

## Implementation Notes

- Implementert direkte i hovedøkta, uten subagent, som 3.3. Branch `story-3-4-demo-forslag`.
- `DemoDataSource` har en offentlig `today` (demo-dagen fra fila, `DEMO_PLAN.today` når fila er ugyldig). `createDemo` gir den til `DemoClock`, så fila valideres bare én gang. Tidspunktene i besøket og versjonene starter på `<today>T00:00:00.000Z` (kl. 01 i Oslo, samme dato).
- `DemoCourse` henter klokka i `load`, som bare kjører i nettleseren (`useEffect`), så serverrenderingen ikke lager en demo uten `sessionStorage`.
- Manglende `plan` gir bare «demo.plan: mangler», uten en ekstra «skal være et objekt».
- `demo-data/demo.json` er endret for hånd med samme rekkefølge som `serializeDemoData` (`schemaVersion`, `course`, `plan`, `chapters`). `export-demo` er ikke kjørt mot prod.
- Merketesten i `demoScreens.test.ts` ser nå bare på kapittellisten, fordi forslaget også merker 1.2.
- Sjekker: typecheck og lint er rene, og `npm test` gir 668 grønne tester.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | verification-gap | Klokka i `DemoCourse` sin lasting er ikke testet: testene sender `today` selv | medium | Pre-verified: ingen test kjører `load` fra `DemoCourse`. | patch (`demoCourseLoader` + test) |
| 2 | blind-hunter | Testene og README antar 7 delkapitler (1 bak, 1.1 og 1.2), og en ny eksport kan gi flere | medium | Stemmer: med flere enn 8 delkapitler blir forslaget og etterslepet større. De andre demotestene bruker `subchapterCount` av samme grunn. | patch (forventningene regnes fra fila, egen test for «litt bak», README sier «med de 7 delkapitlene nå») |
| 3 | blind-hunter | Ingen test sjekker at `plan` i `demo.json` er lik `DEMO_PLAN` | low | Stemmer, og fila kan endres for hånd. Én testlinje. | patch |
| 4 | blind-hunter | Valideringsgreiner uten test: `plan` som ikke er objekt, ugyldig `examDate`, `noStudyDays` | low | Stemmer. Bare nye tester. | patch |
| 5 | blind-hunter | `Date.parse(this.createdAt)` regnes ved hvert kall | low | Stemmer. Direkte endring til `startMs`. | patch |
| 6 | blind-hunter | Kommentaren «kl. 01 i Oslo» gjelder bare normaltid | low | Stemmer. Direkte rettelse. | patch |
| 7 | edge-case, blind-hunter | Demo-dagen kan være lørdag eller søndag | low | Datoen er en fast konstant (tirsdag). Er studenten bak, vises forslaget også i helgen. Rettelsen er en ny regel. | reject |
| 8 | edge-case, blind-hunter | Lagret tilstand fra en tidligere demo-dag overlever en endret `today` | low | Bare når `today` i fila endres mens en fane er åpen. Rettelsen er et nytt felt i tilstanden. | reject |
| 9 | edge-case | `suggestionPart` gir resten av siden når `</section>` mangler | low | `DailySuggestion` lukker alltid seksjonen. Rettelsen er en ny vakt i testen. | reject |
| 10 | edge-case | Merketesten skjærer fra feil sted når forslaget mangler | false | Uten forslag starter utsnittet etter framdriften, og kapittellisten sjekkes fortsatt. | reject |
| 11 | blind-hunter | Diffen mangler spec og sprint-status | false | Med vilje: specen er påstandsfila. | reject |
| 12 | blind-hunter | «I dag» har to kilder som kan være ulike | false | `useDemoResult` og `demoCourseLoader` bruker samme `getDemo()`, så klokka og datakilden er fra samme demo. | reject |
| 13 | blind-hunter | `getStudyPlan` ser bort fra avkrysningene i besøket | false | Alle avkrysninger i besøket får tidspunkt på demo-dagen, og validatoren krever `today >= planStart`, så ingen er før planstart. | reject |
| 14 | blind-hunter | Funnet om antall delkapitler og README (#2) også for perDay-teksten | false | Del av #2. `planLine` regner veien tilbake fra fila. | reject (dekket av #2) |
| 15 | blind-hunter | Datoer skrevet for hånd tre steder uten sjekk | low | Samme rotårsak som #3, og testen fra #3 lukker det. | patch (som #3) |

## Design Notes

**Hvorfor `planSnapshot` i adapteren og ikke `startPlan`:** Demoen skriver aldri planer (`saveStudyPlan` gir `unavailable`). Planen er avledet av de faste datoene og fila, og regnes med samme domenefunksjon som `startPlan` bruker, så G₀, R₀ og D betyr det samme. Ingen avkrysninger før planstart gir G₀ = 0, og etterslepet kommer av at planstart er dagen før demo-dagen.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint` og `npm test` -- ingen feil

**Manual checks:**
- `npm run dev`: `/demo/emner/demo-ibe430` viser forslaget 1.1 og 1.2, 1 bak og «i rute i morgen». Ta quizen på 1.1 med bestått resultat: forslaget står fast, 1.1 er merket, og framdriften sier i rute.
