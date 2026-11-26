---
title: 'Retro epic 3, A1 og A2: framdriften motsier ikke dagens forslag'
type: 'bugfix'
created: '2026-11-26'
status: 'ready-for-dev'
baseline_commit: '0211328ab9c1e6cf44283932afcf68d11a1e4500'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-3-retro-2026-11-26.md'
  - '{project-root}/G131-hovda/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Framdriften (3.2) og dagens forslag (3.3) står på samme side, men sier ulike ting.
- **Etter eksamensdatoen (A1):** forslaget sier «Fullført.», mens framdriften viser «7 delkapitler bak planen. 2 delkapitler om dagen tar deg nærmere planen.».
- **Når kveldens økt er gjort (A2):** forslaget sier «Dagens økt er gjort.», mens framdriften sier «1 delkapittel bak planen. 2 delkapitler i kveld, så er du i rute i morgen.».

Funnene er F1 og F2 i retrospektiven for epic 3.

**Approach:** Én regel for når planen er fullført, felles for forslaget og framdriften. «I kveld» i framdriften er det som er igjen av dagens forslag, så framdriften og forslaget sier det samme om kvelden.

## Boundaries & Constraints

**Always:**
- **Planen er fullført** når `today > examDate`. Regelen står én gang i domenet (`planFinished`) og brukes av `dailySuggestion` og framdriften. På eksamensdatoen gjelder planen som før.
- **Tallet for i kveld (Martes valg 26.11.2026, erstatter `perDay − fullført i dag` etter review):** `tonight` er antallet delkapitler i dagens forslag (`dailySuggestion`, `kind: "subchapters"`) som ikke er gjennomført nå. Ved repetisjon, fleksibel dag, ingenting klart eller «Dagens økt er gjort.» er `tonight = 0`. Delkapitler utenfor forslaget teller ikke. Framdriften og forslaget regner forslaget på samme måte, med samme inndata.
- **Veien tilbake** (`onTrackOn`) regnes med `tonight` i kveld og `perDay` fra i morgen. «N delkapitler i kveld, så er du i rute X» bruker `tonight`. Uten dag («om dagen tar deg nærmere planen») brukes tempoet `perDay`, som før.
- **Eksamensdatoen med kveldens økt gjort (Martes valg 26.11.2026):** når `today = examDate`, eieren er bak og `tonight = 0`, står bare «N delkapitler bak planen.», uten noe om i morgen.
- Andelen («5 av 9 gjennomført») og etterslepet regnes som før, med alt som er gjennomført nå.
- **Etter eksamensdatoen (Martes valg 26.11.2026):** framdriften viser bare andelen og hvor mange som er igjen til målet, ingenting om foran/bak og ingen ny linje.
- **Kveldens økt er gjort (Martes valg 26.11.2026):** når tonight = 0 og eieren fortsatt er bak, står det «1 delkapittel bak planen.» og så «Fortsett i morgen med 2 delkapitler, så er du i rute fredag.». Veien tilbake regnes fra i morgen. Uten dag («ikke i rute før eksamen») står det «Fortsett i morgen med 2 delkapitler om dagen, så kommer du nærmere planen.».
- Ingen skyldspråk (UX-3).

**Never:**
- Ingen endring i `dailySuggestion` utover å bruke `planFinished`. Ingen endring i andelen, målet eller demofila.
- Ingen ny definisjon av «gjennomført»: `completedAt` kommer fra `listChapterOverview`.

## I/O & Edge-Case Matrix

Plan: planstart 26.11, eksamen 10.12, G₀ = 1, R₀ = 8, D = 10 og 9 delkapitler.

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Etter eksamen | 11.12, 2 gjennomført | Forslaget sier «Fullført.». Framdriften viser andelen, men ikke bak eller veien tilbake (A1) | N/A |
| På eksamensdatoen | 10.12, bak | Som før: bak og veien tilbake | N/A |
| Kveldens økt gjort | 3.12, 2 gjennomført før i dag, 1.3 og 1.4 i dag | «1 delkapittel bak planen.» og teksten for tonight = 0 (A2) | N/A |
| Halvveis | 3.12, 2 før i dag, 1.3 i dag | tonight = 1: «1 delkapittel i kveld, så er du i rute …» | N/A |
| Færre klare enn perDay | 3.12, 2 før i dag, bare 1.3 klar, 1.3 gjort i dag | Forslaget «Dagens økt er gjort.», framdriften «Fortsett i morgen …» | N/A |
| Utenfor forslaget | 3.12, 2 før i dag, 1.5 og 1.6 i dag | Forslaget 1.3 og 1.4 med «Start økta», framdriften «… i kveld» med tonight = 2 | N/A |
| Eksamensdatoen, økta gjort | 10.12, bak, alle foreslåtte gjort i dag | Bare «N delkapitler bak planen.» | N/A |
| Ingenting i dag | 3.12, 2 før i dag | Som før: «2 delkapitler i kveld, så er du i rute søndag.» | N/A |

</frozen-after-approval>

## Code Map

- `src/domain/studyPlan.ts` -- `planStatus(plan, progress, today)` regner `perDay`, `onTrackOn` og løkka for veien tilbake. `dailySuggestion` har `if (today > plan.examDate) return { kind: "finished" }`. Legg til `planFinished(plan, today)` og `suggestionLeft(suggestion, subchapters)` (de foreslåtte som ikke er gjennomført, 0 for andre slag). `planStatus` får `tonight` (standard `perDay`) i `progress`, og `behind` gir `tonight`.
- `src/domain/studyPlan.test.ts` -- `planStatus`-testene (linje 162–214). Testen «bruker d = D etter eksamen» beholdes for domenet. Det er skjermen som skjuler linja.
- `src/app/_screens/todaysSuggestion.ts` (ny) -- `todaysSuggestion(plan, subchapters, today)`: mappingen fra `SubchapterOverview` til `SuggestionCandidate` (`ready`, `hasNotes`, `completedAt`), som nå står i `DailySuggestion.tsx:40-47`, og kallet til `dailySuggestion`. Brukes av både `DailySuggestion` og `Progress`, så de regner forslaget likt.
- `src/app/_screens/Progress.tsx` -- `PlanLine`. Skjules når `planFinished`. Regner `tonight` med `suggestionLeft(todaysSuggestion(...))`. Nå er tallet `Math.min(status.perDay, reachable - completed)`.
- `src/app/(innlogget)/emner/formState.ts` -- `catchUpText(perDay, label)`. Ny `catchUpTomorrowText` for tonight = 0.
- `src/app/(innlogget)/start/page.test.ts` -- `render(..., completed, plan)` og `subchapterInputHash` for klare hasher. Ny describe-blokk som sjekker forslaget og framdriften sammen.
- `src/app/demo/demoScreens.test.ts` -- `planLine(completed)` bruker `planStatus`. Gi den `tonight` fra forslaget (`suggested` minus de fullførte).
- `README.md` -- avsnittet om framdriftsindikatoren og dagens forslag.
- Gjenbruk fra første forsøk: `git stash` `retro-a1a2-forsok-1` har `planFinished`, `catchUpTomorrowText`, løkka med `tonight`, README-teksten og testene for A1.

## Tasks & Acceptance

**Execution:**
- [ ] `src/domain/studyPlan.ts` (+ test) -- `planFinished`, `suggestionLeft` og `tonight` i `planStatus`, og `dailySuggestion` bruker `planFinished`
- [ ] `src/app/_screens/todaysSuggestion.ts` -- felles utregning av forslaget, brukt av `DailySuggestion.tsx` og `Progress.tsx`
- [ ] `src/app/(innlogget)/emner/formState.ts` -- `catchUpTomorrowText`
- [ ] `src/app/_screens/Progress.tsx` -- skjul foran/bak etter eksamen, `tonight` fra forslaget, og bare etterslepet på eksamensdatoen med økta gjort
- [ ] `src/app/(innlogget)/start/page.test.ts` -- forslaget og framdriften sammen for alle matriseradene
- [ ] `src/app/demo/demoScreens.test.ts` -- `planLine` med `tonight` fra forslaget
- [ ] `README.md` -- kort om regelen

**Acceptance Criteria:**
- Gitt startsiden, når forslaget sier «Fullført.» eller «Dagens økt er gjort.», så ber ikke framdriften om mer i kveld.
- Gitt demoen, når den besøkende fullfører delkapitler, så stemmer framdriften fortsatt med forslaget.

## Implementation Notes

- Implementert direkte i hovedøkta. Branch `framdriften-folger-forslaget` fra `main`, med retrospektiven og loggen (`19e7fc4`, `0211328`), som ikke var pushet.
- Når økta er gjort, er dagen for i rute 3.12 søndag (ikke fredag som i eksempelet i godkjenningen). Fredag kveld gir 6 mot planlagt 7, lørdag kveld 8.

## Spec Change Log

- **Runde 1 (review, intent_gap):** alle tre reviewerne fant at `tonight = perDay − fullført i dag` kan motsi forslaget. Med færre klare delkapitler enn `perDay` sier forslaget «Dagens økt er gjort.», mens framdriften sier «1 delkapittel i kveld». Med avkrysninger utenfor forslaget sier framdriften «Fortsett i morgen», mens forslaget viser «Start økta». Det brøt akseptansekriteriet. På eksamensdatoen med økta gjort sto det dessuten «Fortsett i morgen …».
  - **Endret med Martes valg 26.11:** `tonight` er det som er igjen av dagens forslag. På eksamensdatoen med økta gjort står bare etterslepet. Tre nye rader i matrisen.
  - **Unngår:** to uavhengige tellinger av kveldens økt.
  - **Beholdes:** `planFinished` i domenet, `tonight` som input til `planStatus` med første kveld i løkka, `catchUpTomorrowText`, tekstene fra Martes første valg og testblokken som sjekker forslaget og framdriften sammen.

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | blind-hunter, edge-case, verification-gap | `tonight = perDay − fullført i dag` motsier forslaget når færre enn `perDay` er klare | high | Bekreftet: `dailySuggestion` tar `open.slice(0, size)` av de klare. `Progress` bruker `perDay`. Bryter AC 1. | intent_gap (løst av Marte) |
| 2 | blind-hunter, edge-case | Avkrysninger utenfor forslaget gjør at framdriften sier «Fortsett i morgen» mens forslaget viser «Start økta» | medium | Bekreftet: `doneToday` teller alle med `completedAt` i dag. | intent_gap (samme rotårsak som #1) |
| 3 | blind-hunter, edge-case | På eksamensdatoen med økta gjort står «Fortsett i morgen … om dagen», men i morgen er planen fullført | low | Bekreftet: løkka kjører ikke når `today = examDate`, så `onTrackOn` er `null`. | intent_gap (løst av Marte) |
| 4 | blind-hunter | Ingen test for Oslo-midnatt i «fullført i dag» | low | Med ny regel er det `dailySuggestion` (alt testet ved midnatt) som avgjør. | reject (bortfaller) |
| 5 | blind-hunter | `doneToday` er valgfri med standard 0 | low | Erstattes av `tonight` med standard `perDay`, som er riktig uten avkrysninger i dag. | reject (bortfaller) |
| 6 | blind-hunter | `catchUpTomorrowText(…, null)` er bare testet som tekst, ikke på siden | low | Én test på siden. | patch (i ny runde) |
| 7 | blind-hunter | Logikken for veien tilbake er kopiert i demotestens `planLine` | low | Stemmer, men testen må regne forventningen selv. | reject |
| 8 | blind-hunter | «tar deg nærmere planen» og «så kommer du nærmere planen» er ulikt formulert | low | Teksten er Martes valg i den låste delen. | reject |
| 9 | blind-hunter | README mangler regelen for eksamensdatoen og hva som teller i dag | low | Stemmer. | patch (i ny runde) |
| 10 | blind-hunter | Én kommentarlinje i `Progress.tsx` er for lang | low | Direkte rettelse. | patch (i ny runde) |
| 11 | blind-hunter | `planFinished` er bare testet med datoer | false | Testene på siden dekker 10.12 og 11.12 med samme plan. | reject |
| 12 | edge-case | `today` i `page.test.ts` nullstilles ikke etter testene | low | Hver `show` og `beforeEach` setter `today` selv. Rettelsen er ny `afterEach`. | reject |

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint` og `npm test` -- ingen feil
