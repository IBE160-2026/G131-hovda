---
title: 'Story 3.3: Startsiden viser dagens forslag'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_commit: '4f438313336dc660ee932b3bd6c3e6528314b5d0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Startsiden viser framdrift og foran/bak, men ikke hva eieren skal gjøre i kveld. Hun må selv velge delkapittel i den korte kveldstida (FR-10 del 2, AD-8, AD-15, UX-1, UX-2).

**Approach:** En ren funksjon `dailySuggestion` i `src/domain/studyPlan.ts` velger dagens delkapitler ut fra planen og tilstanden ved starten av dagen i Oslo. Øverst på startsiden står forslaget med en «Start økta»-knapp. Kapittellisten står som før, så eieren kan velge et annet delkapittel selv.

## Boundaries & Constraints

**Always:**
- **Tilstanden ved starten av dagen:** Et delkapittel regnes som gjennomført i forslaget bare når Oslo-datoen for `completedAt` er før i dag (`osloDate(completedAt) < today`). Etterslepet for forslaget er `planStatus` med dette antallet. Da endres forslaget ikke før midnatt, selv om eieren fullfører et delkapittel i løpet av dagen.
- **Klart** = samlet `status` er «klart» eller «utdatert», det samme som avgjør om quizen kan tas (`quizReady`). «mangler notater» og «mangler innhold» foreslås aldri.
- **Antall** k = `dailySuggestionSize(r0, d, behind)` fra 3.2 (⌈R₀ / D⌉, minst 1, +1 bak, høyst 3).
- **Studiedag**, eller fleksibel dag når eieren ligger bak: de k første klare delkapitlene som ikke var gjennomført ved starten av dagen, i nummerrekkefølge (rekkefølgen fra `listChapterOverview`). Finnes færre enn k, foreslås de som finnes.
- **Fleksibel dag uten etterslep:** ingen forslag. Teksten sier at det er en fleksibel dag, og at eieren kan velge et delkapittel selv i listen under.
- **Repetisjon:** Er ingen ikke-gjennomførte delkapitler klare, foreslås k klare delkapitler som var gjennomført ved starten av dagen, for en ny quiz. **Martes valg 26.11.2026:** de som ble gjennomført for lengst siden (`completedAt`), kommer først. Finnes heller ingen slike, står det at ingen delkapitler er klare ennå.
- **Fullført i dag (Martes valg 26.11.2026):** Et foreslått delkapittel som er gjennomført i dag, står fortsatt i forslaget, merket «✓ gjennomført». «Start økta» går til det første som ikke er gjennomført nå. Er alle gjort, står det «Dagens økt er gjort.» uten knapp. Ved repetisjon merkes ingenting, og knappen går alltid til det første.
- **Tekst:** «I kveld: delkapittel 3.2, deretter quiz.» For flere: «I kveld: delkapittel 3.2 og 3.3, med quiz etter hvert.» Repetisjon: «I kveld: repetisjon med ny quiz på delkapittel 1.1 og 1.2.» Under står delkapitlene med nummer og tittel som lenker til lesesiden.
- **«Start økta»** er én lenke (`primaryButton`) til lesesiden for det første delkapittelet i forslaget, der «Ta quizen» allerede finnes.
- «I dag» kommer fra `getClock().today()`. Uten plan, eller når planen eller delkapitlene ikke kan leses, vises ikke forslaget, og siden er som før.
- Forslagsmodellen tåler flere slags elementer senere (Epic 4 og 5): resultatet har en `kind`.

**Never:**
- Ingen endring i demoen (3.4). Ingen skriving og ingen migrering.
- Ingen ny definisjon av «gjennomført» eller «har notater»: `completedAt` kommer fra `subchapter_completion` via `listChapterOverview`, og «har notater» bare fra `hasNotes`.

## I/O & Edge-Case Matrix

Plan: planstart tor 26.11.2026, eksamen tor 10.12, G₀ = 1, R₀ = 8, D = 10, så ⌈R₀ / D⌉ = 1. Delkapitler 1.1–1.9, 1.1 gjennomført før planstart, alle klare hvis ikke annet står.

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Vanlig dag | Tor 26.11, i rute | Forslag: 1.2 | N/A |
| Etterslep | Tor 3.12, 2 gjennomført (bak 3) | k = 2: 1.3 og 1.4 | N/A |
| Maks 3 | R₀ = 25, D = 10, bak | k = 3 | N/A |
| Fleksibel dag, i rute | Lør 28.11, 1.2 og 1.3 gjennomført fredag (rettet med Martes godkjenning 26.11: med bare 1.2 er eieren 1 bak) | Ingen forslag, tekst om fleksibel dag | N/A |
| Fleksibel dag, bak | Lør 5.12, 2 gjennomført | k = 2, to delkapitler | N/A |
| Ikke klart hoppes over | 1.2 «mangler innhold» | Forslag: 1.3 | N/A |
| Ingen klare igjen | Alle ikke-gjennomførte mangler innhold | Repetisjon på gjennomførte, klare | N/A |
| Ingenting klart | Ingen klare delkapitler i det hele tatt | «Ingen delkapitler er klare ennå.» | N/A |
| Fullført midt på dagen | 1.2 foreslått, gjennomført kl. 14 i dag | Forslaget er fortsatt 1.2, merket «✓ gjennomført», «Dagens økt er gjort.» | N/A |
| Repetisjon, eldst først | Ingen ikke-gjennomførte klare, 1.3 gjennomført 20.11, 1.2 gjennomført 22.11 | 1.3 før 1.2 | N/A |
| Rett etter midnatt | 1.2 gjennomført 23:59 i går (Oslo) | Forslag: 1.3 | N/A |
| Plan eller delkapitler kan ikke leses | `unavailable` | Ingen forslag, siden som før | Ingen ny feilmelding |

</frozen-after-approval>

## Code Map

- `src/domain/studyPlan.ts` (+ test) -- har `planStatus`, `dailySuggestionSize`, `isStudyDay`, `osloDate`. Legg til `dailySuggestion(plan, subchapters, today)`. Inndata per delkapittel: `number`, `ready`, `reachable` (gjennomført eller `hasNotes`), `completedAt: string | null`. Resultat: `{ kind: "subchapters" | "review", numbers }`, `{ kind: "flexibleDay" }` eller `{ kind: "nothingReady" }`.
- `src/application/chapterOverview.ts` -- `SubchapterOverview` får `completedAt: string | null` fra `listCompletions` (som allerede hentes). `completed` beholdes. Oppdater `chapterOverview.test.ts`.
- `src/app/_screens/DailySuggestion.tsx` (ny) -- tar `chapters`, `plan`, `today` og `subchapterHref`, som `Progress`. Regner `ready` og `reachable` med `hasNotes` og `status`, slik `Progress` regner `reachable`.
- `src/app/(innlogget)/emner/formState.ts` -- tekstene ved siden av `catchUpText`, med `subchapterCount`-mønsteret.
- `src/app/(innlogget)/emner/styles.ts` -- `primaryButton`, `textLink`.
- `src/app/(innlogget)/start/page.tsx` -- vis `DailySuggestion` over `Progress`, med samme `plan`, `today` og `subchapterHref(course.id)`.
- `src/app/(innlogget)/start/page.test.ts` -- `render(..., completed, plan)`. `completedAt` er fast `2026-11-21T10:00:00Z`. Utvid så testen kan sette `completedAt` per delkapittel.
- `src/app/demo/emner/[id]/DemoCourse.tsx` -- bruker `Progress` og `ChapterList`. Ikke endre.
- `README.md` -- seksjonen «Eksamensdato og planstart».

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/studyPlan.ts` (+ test) -- `dailySuggestion` og alle matriseradene, også klokka rett før og etter midnatt
- [x] `src/application/chapterOverview.ts` (+ test) -- `completedAt` i `SubchapterOverview`
- [x] `src/app/(innlogget)/emner/formState.ts` -- tekstene for forslag, repetisjon, fleksibel dag og ingenting klart
- [x] `src/app/_screens/DailySuggestion.tsx` -- forslaget, lenkene og «Start økta»
- [x] `src/app/(innlogget)/start/page.tsx` (+ `page.test.ts`) -- forslaget øverst. Tester for forslag, fleksibel dag, repetisjon, fullført i dag, ingen plan og plan som ikke kan leses
- [x] `README.md` -- kort om dagens forslag

**Acceptance Criteria:**
- Gitt en plan, når startsiden vises, så står dagens forslag øverst, over framdriftsindikatoren, og «Start økta» lenker til lesesiden for det første delkapittelet.
- Gitt forslaget, når startsiden vises, så står kapittellisten fortsatt under, så eieren kan velge et annet delkapittel.
- Gitt 375 px bredde, når forslaget vises med tre delkapitler med lange titler, så er det ingen sidelengs rulling.
- Gitt en skjermleser, når forslaget leses, så er det en egen seksjon med overskrift, og lenkene har nummer og tittel.

## Implementation Notes

- Implementert direkte i hovedøkta, uten subagent. Branch `story-3-3-dagens-forslag`.
- Matriseraden «Fleksibel dag, i rute» var selvmotsigende: med bare 1.2 gjennomført er eieren 1 bak lørdag 28.11. Tilstanden er rettet til «1.2 og 1.3» med Martes godkjenning 26.11.
- `dailySuggestion` tar `hasNotes` per delkapittel og regner selv både «gjennomført ved starten av dagen» og N, så etterslepet i forslaget alltid følger tilstanden ved starten av dagen. Framdriftsindikatoren (3.2) bruker fortsatt gjennomført nå.
- Forslaget har `bg-sky`, et eksisterende token. Ingen nye fargetokener.
- Sjekker: typecheck og lint er rene, og `npm test` gir 650 grønne tester.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | verification-gap | «utdatert» som klar er ikke testet | medium | Pre-verified: alle forslagstestene har «klart». | patch |
| 2 | verification-gap | `reachable` (delkapitler uten notater) i `dailySuggestion` er ikke testet | medium | Pre-verified: alle fixtures har `hasNotes: true`. | patch |
| 3 | verification-gap | Teksten for tre numre og repetisjon med to er ikke testet | low | Pre-verified: ingen test på `numberList` med 3. | patch |
| 4 | blind-hunter, edge-case | Klar-status og notater leses live, så «fast til midnatt» gjelder bare avkrysninger | low | Stemmer, og den frosne regelen definerer starttilstanden ved `completedAt`. Å fryse klar-status krever øyeblikksbilde. README og kommentaren lovet mer. | patch (ordlyd) |
| 5 | blind-hunter | Svak `toMatchObject` i midnattstesten | low | Direkte endring til `toEqual`. | patch |
| 6 | blind-hunter | Forsprang på en studiedag er ikke testet | low | Én testlinje. | patch |
| 7 | blind-hunter, edge-case | Etter eksamen vises fortsatt «I kveld: …» | low | Bare etter eksamensdatoen. Krever ny tilstand og tekst. Samme avgjørelse som 3.2 #5. | reject |
| 8 | blind-hunter | Forslag før planstart | false | d = 0 før planstart er regelen fra 3.2. Forslaget gjelder da som vanlig dag. | reject |
| 9 | blind-hunter | Repetisjon merkes aldri som gjort | false | Den frosne regelen sier at ingenting merkes ved repetisjon. | reject |
| 10 | blind-hunter | «Ny quiz» lenker til lesesiden | false | Den frosne regelen sier at «Start økta» går til lesesiden, der «Ta quizen» står. | reject |
| 11 | blind-hunter | h2 «Dagens forslag» står før emnets h1 | low | Stemmer, men den frosne regelen krever forslaget øverst med overskrift. Rekkefølgen er en anbefaling, ikke et WCAG-brudd. | reject |
| 12 | blind-hunter | Framdriften og forslaget kan si noe ulikt i løpet av dagen | false | Tilsiktet etter AD-15: framdriften følger nå, forslaget starten av dagen. | reject |
| 13 | blind-hunter | Teksthjelperne gir rar tekst for tom liste | false | `dailySuggestion` gir aldri tom liste for `subchapters` eller `review`. | reject |
| 14 | blind-hunter, edge-case | Oppslag på nummer med `!` kan krasje ved like numre | false | Numrene er unike i emnet. `getSubchapterSummary` og lenkene bygger på det. | reject |
| 15 | blind-hunter | To lenker til samme delkapittel | low | Listelenken og knappen har ulik tekst. Å endre krever ny struktur. | reject |
| 16 | blind-hunter | Diffen mangler spec og sprint-status | false | Med vilje: specen er påstandsfila. | reject |
| 17 | edge-case | Ugyldig `completedAt` gjør at `osloDate` kaster | false | Kolonnen er `timestamptz`, og adapteren gir ISO-tidspunkt. Samme som 3.2 #8. | reject |
| 18 | edge-case | Lagret `d = 0` gir NaN | false | DB-sjekk `d >= 1` og `validateStudyPlanDates`. Samme som 3.2 #7. | reject |
| 19 | edge-case | En avkrysning som fjernes i løpet av dagen endrer forslaget | false | Avkrysninger angres aldri (AD-13). | reject |
| 20 | edge-case | AC sier «det første», koden går til det første som ikke er gjort | false | Den frosne regelen om fullført i dag sier nettopp det. | reject |

## Design Notes

**Hvorfor `completedAt` og ikke en lagret plan for dagen:** Forslaget kan regnes ut på nytt ved hver visning fra avkrysningene og deres tidspunkt. Det som ble krysset av i dag, telles ikke før midnatt, så resultatet blir det samme hele dagen uten ny tabell eller skriving. `planStatus` får det samme antallet, så +1 ved etterslep og fleksible dager følger også tilstanden ved starten av dagen.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint` og `npm test` -- ingen feil

**Manual checks:**
- `npm run dev` mot `dev`: startsiden for IBE430 viser dagens forslag øverst, og «Start økta» åpner lesesiden. Ingen sidelengs rulling ved 375 px.
