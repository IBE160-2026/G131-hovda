---
title: 'Story 2.3: Den demobesøkende tar quiz og ser framdriften'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: 'cc0fc022275150663d8f368814127e14e5b86891'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Demoen fra 2.2 kan bare lese. Den besøkende ser ikke quizen og framdriften, som er det som skiller appen fra en vanlig quiz (FR-26, FR-14, FR-15, FR-20).

**Approach:** `DemoDataSource` får quiztilstand i minnet, speilet til `sessionStorage`, så `startQuiz`, `answerQuiz`, `getQuiz` og `finishQuiz` kjører uendret i nettleseren. Quizskjermen deles mellom appen og demoen. Lesesiden i demoen får «Ta quizen», og framdriften og «gjennomført» kommer fra avkrysningene i besøket.

## Boundaries & Constraints

**Always:**
- Reglene er de samme som i appen og kommer fra de uendrede brukstilfellene: 10 spørsmål, riktig svar og forklaring ved feil, nytt spørsmål om samme tema, resultatet som «8 av 10 riktige» og avkrysning ved minst 80 %.
- `DemoDataSource` implementerer `listQuizzes`, `createQuiz`, `answerQuizItem`, `replaceQuizItem`, `saveQuizResult` og `listCompletions` slik `MemoryDataSource` gjør. Det gjelder også `duplicate`, `false` for et element som alt er besvart, og at den første avkrysningen står. Elementer som opprettes sammen, får samme `createdAt`, som `now()` i én transaksjon i Postgres.
- Tilstanden (quizer, elementer og avkrysninger) lagres etter hver skriving under én nøkkel i lageret komposisjonsroten gir. Det er `sessionStorage` i nettleseren og ingenting ellers. Ugyldig, utdatert eller ulesbar tilstand, eller ID-er som ikke finnes i demofila, gir en ny, tom tilstand uten feilmelding. Kaster lageret, fortsetter demoen bare i minnet.
- Quizskjermen (spørsmål, tilbakemelding og resultat) flyttes til `src/app/_screens/`. Den tar handlinger som `(formData) => void` og lenker som props, så appen sender server actions og demoen sender funksjoner i nettleseren. Spørringsparameterne er de samme som i appen (`svar`, `resultat`, `feil`).
- Ruten `/demo/emner/[id]/delkapitler/[nummer]/quiz` har merket fra layouten. Lesesiden i demoen viser «Ta quizen» når `quizReady` er sann.
- Når banken er brukt opp, stokkes spørsmålene som er brukt like lenge siden, i domenet (`byLeastRecentlyUsed` bruker `random` også på dem). Demoen og appen følger samme regel, og de eldste kommer fortsatt først (Martes valg 24.11.2026).
- `reportQuizItem` og `reportSummaryVersion` gir fortsatt `unavailable`, og feilrapportene vises ikke i demoen.

**Never:**
- Ingen endring i `DataSource`, i brukstilfellene i `src/application/quiz.ts`, i Supabase-adapteren eller i databasen.
- Ingen `localStorage`, cookies eller kall til serveren for tilstanden.
- Ingen egen demoversjon av quizreglene.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Feil svar | Svar feil på spørsmål 3 | Riktig svar og forklaring. Et gjenstående spørsmål byttes mot et om samme tema | N/A |
| Bestått | 8 av 10 riktige | «8 av 10 riktige», delkapittelet er «gjennomført», og framdriften viser 1 av 7 | N/A |
| Ikke bestått | 7 av 10 | Ingen avkrysning, og tilbud om ny quiz | N/A |
| Omlasting | Quiz på spørsmål 5, siden lastes på nytt | Spørsmål 5 med de samme spørsmålene og svarene | N/A |
| Ny fane | Tomt `sessionStorage` | Ingen quizer og ingen avkrysning, 0 av 7 | N/A |
| Ødelagt lager | Ugyldig JSON eller ukjente ID-er i lageret | Ny, tom tilstand | Ingen feilmelding |
| Lageret kaster | `setItem` kaster (privat modus, fullt) | Quizen virker i minnet | Ingen feilmelding |
| Brukt opp | Tredje quiz på et delkapittel med 20 spørsmål | Spørsmålene kommer igjen, i en annen rekkefølge enn i første quiz | N/A |

</frozen-after-approval>

## Code Map

- `src/application/quiz.ts` -- `startQuiz(data, id, nummer, random)`, `answerQuiz`, `getQuiz` (`QuizStage`: start, question, feedback, unfinished, result) og `finishQuiz`. Ikke endre.
- `src/domain/quiz.ts` -- `selectQuizQuestions`, `byLeastRecentlyUsed` og `shuffled`. Spørsmål med lik `lastUsed` stokkes når `random` er med. `chooseReplacement` sender ikke `random` og er uendret.
- `src/application/testing/MemoryDataSource.ts:333-470` -- mønster for quizmetodene: `createQuiz` med `duplicate`, `answerQuizItem` og `replaceQuizItem` som gir `false`, og `saveQuizResult` med én avkrysning per delkapittel.
- `src/adapters/demo/dataSource.ts` -- har skrivemetoder som gir `unavailable` og `listQuizzes`/`listCompletions` som gir tomme lister. Konstruktøren får et valgfritt lager (`Pick<Storage, "getItem" | "setItem">`).
- `src/composition/demo.ts` -- `getDemo()` gir `sessionStorage` når `window` finnes. `createDemo(input, storage?)` brukes i testene.
- `src/app/(innlogget)/emner/[id]/delkapitler/[nummer]/quiz/page.tsx` -- `QuizContent` og `Feedback`. Markupen flyttes til `_screens/Quiz.tsx`. Datahentingen, server actions og `ReportForm` blir igjen.
- `.../quiz/actions.ts` -- hvordan utfallet blir til spørringsparametere. Demoen gjør det samme med `router.push`.
- `src/app/demo/emner/[id]/delkapitler/[nummer]/DemoSummary.tsx` -- får «Ta quizen».
- `src/app/demo/useDemoResult.ts` -- `runDemoLoad`. Quizsiden må laste på nytt etter hver handling.
- Testene for quizsiden (`quiz/page.test.ts`, `quiz/actions.test.ts`) må fortsatt være grønne.

## Tasks & Acceptance

**Execution:**
- [x] `src/adapters/demo/dataSource.ts` (+ test) -- quiztilstanden, lagring og gjenoppretting, og matriseradene for lageret, med et lager i minnet
- [x] `src/composition/demo.ts` -- lageret
- [x] `src/domain/quiz.ts` (+ test) -- stokk spørsmål med lik `lastUsed`. Test at den tredje quizen på 20 spørsmål får andre plasseringer enn den første med en injisert `random`, og at de eldste fortsatt kommer før de nyere
- [x] `src/app/_screens/Quiz.tsx` -- quizskjermen. `quiz/page.tsx` bruker den, med uendret markup for eieren
- [x] `src/app/demo/emner/[id]/delkapitler/[nummer]/quiz/page.tsx` og `DemoQuiz.tsx` -- quizen i demoen, uten feilrapport
- [x] `src/app/demo/.../DemoSummary.tsx` -- «Ta quizen»
- [x] `src/app/demo/demoScreens.test.ts` -- bestått quiz gir «gjennomført» og 1 av 7. Ingen feilrapport på quizen
- [x] `README.md` -- avsnittet om demoen

**Acceptance Criteria:**
- Gitt en demoside, når den besøkende tar en quiz, så går ingen forespørsel til Supabase, og testen av importene er grønn.
- Gitt eierens app, når quizskjermen er flyttet, så er testene for quizsiden grønne, og siden ser ut som før.

## Design Notes

`DemoDataSource` tar et lager i stedet for å lese `window`, så testene kjører i node med et lager i minnet. Tilstanden har `version: 1`. Et tidspunkt som øker for hver skriving (`DEMO_TODAY` + teller), gir entydig rekkefølge, som i `MemoryDataSource`.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test` og `npm run build` -- ingen feil

**Manual checks:**
- Produksjonsbygget ved 375 px (CDP, som i 2.2): ta en quiz i demoen til resultatet, last siden på nytt midt i, og sjekk at framdriften flytter seg og at det ikke går kall utenfor localhost.

## Implementation Notes

- `DemoDataSource(input, storage?)` leser tilstanden fra lageret første gang den trengs og skriver hele tilstanden under `studievenn-demo` etter hver skriving. `parseState` sjekker formen, versjonen, at delkapitler og spørsmål finnes i fila, at elementer og avkrysninger viser til kjente quizer, og at bare én quiz pågår per delkapittel. Telleren for tidspunktene settes forbi alle lagrede tidspunkter, så nye skrivinger alltid er nyest.
- `createQuiz` og `replaceQuizItem` gir `unavailable` for spørsmål eller delkapitler som ikke finnes i fila (som en brutt fremmednøkkel), så ugyldige ID-er aldri lagres.
- `getDemo()` gir `window.sessionStorage` i nettleseren (null hvis tilgangen kaster), og ingenting i node.
- `_screens/Quiz.tsx` (`QuizScreen`) tar `startAction`, `answerAction(quizId, position)`, lenkene (`summaryPath`, `quizPath`, `home`) og en valgfri `reportForm`. Uten `reportForm` vises verken skjemaet eller beskjedene om meldte spørsmål. En midlertidig test som tegnet den gamle og den nye `QuizContent` i alle tilstander, ga byte for byte lik markup (fjernet etterpå).
- `DemoQuiz` leser `svar`, `resultat` og `feil` med `useSearchParams`. Handlingene kjører `startQuiz`/`answerQuiz` og gir adressen på samme måte som `actions.ts`. Endres ikke adressen (for eksempel «Start quizen» fra quizsiden), lastes quizen på nytt med en teller i `load`.
- «Ta quizen» på lesesiden i demoen er et skjema som starter quizen og går til quizsiden, som i appen.
- Manuell sjekk (produksjonsbygget, Edge uten vindu, CDP, 375 px): `scrollWidth` 375 på alle trinn, omlasting på spørsmål 5 ga samme spørsmål, feil svar viste riktig svar og forklaring, 9 av 10 krysset av, emnekortet gikk fra 0 til 1 av 7, ingen feilrapport, bare nøkkelen `studievenn-demo` i `sessionStorage`, tomt `localStorage` og ingen cookies, ingen forespørsler utenfor localhost, og en ny fane viste 0 av 7.

## Spec Change Log

## Review Triage Log

Første review (blind, kanttilfeller, verifikasjon), 17 funn: 4 rettet (patch), 1 utsatt (defer) og 12 avvist.

| # | Kilde | Funn | Verdict | Begrunnelse | Rute |
|---|-------|------|---------|-------------|------|
| 1 | verif., blind | `startDemoQuiz` og `answerDemoQuiz` (adressen etter en handling) er ikke testet | medium | Funnet er verifisert av verifikasjonslaget: skjermtestene sender `noop` | patch |
| 2 | verif., blind | Ingen test sjekker at `getDemo()` bruker `sessionStorage` og tåler at den kaster | medium | Funnet er verifisert av verifikasjonslaget: node har ikke `window` | patch |
| 3 | verif., blind | Omlastingen i `useDemoNavigate` når adressen er den samme, er ikke testet | medium | Trenger DOM og mock av `next/navigation`. Den manuelle CDP-sjekken dekker den | defer |
| 4 | blind | README sier at en ny fane starter tom, men en duplisert fane tar med seg `sessionStorage` | low | Direkte retting av teksten | patch |
| 5 | blind | Skjermtestene har «0 av 7» og fire alternativer hardkodet | low | `npm run export-demo` med kapittel 3–4 vil knekke dem. Direkte retting | patch |
| 6 | blind | Specen og sprint-status mangler i diffen | false | Holdt utenfor reviewen med vilje | avvist |
| 7 | blind | Endringen i domenet gjelder også appen, uten at README sier det | low | Martes valg står i specen og i PR-beskrivelsen | avvist |
| 8 | blind, kant | `useDemoNavigate` sammenligner adresser som tekst | low | `demo-ibe430` og `n.m` kodes likt av `encodeURIComponent` og nettleseren. Lite sannsynlig | avvist |
| 9 | blind, kant ×2 | `parseState` sjekker ikke at tilstanden henger sammen (to aktive på samme posisjon, status mot felt) | low | Kan bare skje hvis noen redigerer `sessionStorage` for hånd. Rettingen er nye sjekker | avvist |
| 10 | blind | `?svar=` blir 0 | false | Ingen posisjon er 0, så `getQuiz` viser det nåværende spørsmålet | avvist |
| 11 | blind | `_screens/Quiz.tsx` importerer fra `(innlogget)` og `DemoSummary` fra quizmodulen | low | Samme som #5 i 2.2. Testen av importene fanger serverkode | avvist |
| 12 | blind | Knappene viser ikke at noe pågår, og kan trykkes flere ganger | low | Gjelder appen fra før. Brukstilfellene gjør et nytt svar til ingen endring | avvist |
| 13 | blind | Demoen på serveren deler tilstand i minnet mellom besøkende | low | Ingenting på serveren skriver. Skrivingene skjer i nettleseren | avvist |
| 14 | kant | Et for stort `tick` i lageret gjør at `now()` kaster | low | Bare ved redigert lager | avvist |
| 15 | kant | Feiler `setItem` etter tidligere lagringer, laster en omlasting en eldre tilstand | low | Tilstanden er liten, og fullt lager er lite sannsynlig | avvist |
| 16 | kant | Regex-en i testen bytter `quizId` på et element, ikke på avkrysningen | false | Mønsteret starter på `"completions":[{`, så det treffer avkrysningen | avvist |
| 17 | kant | LCG-en i testene mister presisjon | low | Testene er deterministiske uansett | avvist |
