---
title: 'Story 1.7: Eieren tar en quiz på et delkapittel'
type: 'feature'
created: '2026-11-20'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Delkapitlene i kapittel 1 har sammendrag og spørsmålsbank, men eieren kan ikke ta en quiz (FR-10 del 1, FR-14, AD-6, AD-16).

**Approach:** Fra lesesiden starter eieren en quiz med 10 spørsmål fra banken. Quizen hører til en ny økt (`session`). Hvert svar lagres med en gang. Ved feil svar vises riktig svar og forklaring, og et nytt spørsmål om samme tema erstatter et av de gjenstående. Til slutt vises og fryses resultatet («8 av 10 riktige»).

## Boundaries & Constraints

**Always:**
- En quiz kan startes når delkapittelet har en klar versjon av både sammendrag og bank (status «klart» eller «utdatert», AD-8). Spørsmålene kommer fra siste klare bankversjon og har status `aktiv`.
- Utvalg: 10 ulike spørsmål. Først ett spørsmål om et tema som ble overført fra forrige quiz, så spørsmål eieren aldri har fått, så spørsmål eieren fikk for lengst siden. Har banken færre enn 10 aktive spørsmål, startes ingen quiz.
- Et spørsmål er brukt når det er valgt til en quiz (AD-6). Valgte og erstattede spørsmål lagres, og quizen beholder spørsmålene sine.
- Feil svar: riktig svar og forklaring vises med en gang. Et nytt spørsmål om samme tema, som ikke har vært i denne quizen, erstatter et av de gjenstående. Kandidatene er først spørsmål eieren aldri har fått, så de som ble brukt for lengst siden. Finnes ingen kandidat, erstattes ingenting. Er det ingen gjenstående spørsmål, overføres temaet til neste quiz på delkapittelet.
- Quizen har alltid 10 spørsmål, og resultatet regnes av 10. Når siste spørsmål er besvart, fryses resultatet og endres aldri.
- Én quiz i gang per delkapittel. Startes den på nytt, fortsetter den på neste ubesvarte spørsmål, med samme spørsmål og svarene så langt.
- Valgreglene ligger som rene funksjoner i `src/domain` og har enhetstester for erstatning midt i quizen, feil på siste spørsmål og tema uten flere ubrukte spørsmål.
- Ny migrering mot `dev` før `prod`, med RLS, `GRANT` og eier-FK som i 1.6a. Norsk bokmål, tastatur, kontrast og mobil som ellers i appen.

**Never:**
- Ingen avkrysning, `subchapter_completion` eller framdrift (1.8). Intet tilbud om å lese på nytt under 80 % (1.8). Ingen feilrapport (1.9). `endSession` og vurdering kommer i senere epics, så økta avsluttes ikke ennå.
- Ikke kjøre migrering eller deploy mot `prod` uten at Marte har sagt ja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Start | Klart delkapittel, ingen quiz i gang | Ny økt og quiz med 10 spørsmål, side for spørsmål 1 | N/A |
| Fortsett | En quiz er i gang | Samme quiz, neste ubesvarte spørsmål | N/A |
| Riktig svar | Valgt alternativ er riktig | «Riktig!» og forklaringen, så neste spørsmål | N/A |
| Feil midt i | Feil på spørsmål 4, temaet har kandidater | Riktig svar og forklaring. Siste gjenstående spørsmål som ikke selv er en erstatning, byttes mot ett om samme tema | N/A |
| Feil uten kandidat | Ingen andre spørsmål om temaet utenfor quizen | Riktig svar og forklaring, ingen erstatning | N/A |
| Feil på siste | Feil på spørsmål 10 | Temaet lagres på quizen, og neste quiz begynner med et spørsmål om det | N/A |
| Ferdig | Spørsmål 10 besvart | «8 av 10 riktige», resultatet fryses | N/A |
| Ikke klar | «mangler innhold» eller «mangler notater» | Ingen startknapp. Direkte adresse gir «Dette delkapittelet har ikke quiz ennå.» | N/A |
| For få | Færre enn 10 aktive spørsmål | «Spørsmålsbanken har for få spørsmål til en quiz.» | N/A |
| Dobbelt svar | Samme spørsmål sendes to ganger | Første svar gjelder, ingenting endres | N/A |
| Ukjent | Emne, delkapittel eller quiz finnes ikke, eller er ikke eierens | «Fant ikke delkapittelet.» | N/A |
| Databasefeil | Lesing eller skriving feiler | `unavailableMessage` med `role="alert"`, svar som alt er lagret, beholdes | N/A |

</frozen-after-approval>

## Code Map

- Ny `src/domain/quiz.ts` (+ test) -- `QUIZ_LENGTH = 10`, `selectQuizQuestions(bank, history, random)`, `chooseReplacement(quiz, wrongPosition, bank, history)` (gir posisjon og nytt spørsmål, `null` eller «overfør tema»), `quizResultText(correct, total)`. `random` injiseres, så testene er deterministiske.
- `src/application/dataSource.ts`, `testing/MemoryDataSource.ts`, `src/adapters/supabase/dataSource.ts` (+ test) -- nye metoder:
  - `listQuizBank(subchapterId)`: aktive spørsmål i siste klare bankversjon, med `themeId`.
  - `listQuizzes(subchapterId)`: quizene med elementene, nyeste først.
  - `createQuiz({ subchapterId, questionIds })`: økt, quiz og elementer.
  - `answerQuizItem(itemId, chosenIndex, correct)`: skriver bare et ubesvart element.
  - `replaceQuizItem(itemId, questionId)`: markerer elementet `erstattet` og lager nytt på samme posisjon.
  - `saveQuizResult(quizId, correctCount, carryThemeId)`.

  `listQuestionBanks`/`addQuestionBank` fra 1.6a er mønsteret.
- Ny `src/application/quiz.ts` (+ test mot `MemoryDataSource`) -- `startQuiz`, `getQuiz` (visningen: delkapittel, nåværende posisjon, siste tilbakemelding, resultat) og `answerQuiz`, som erstatter og avslutter. Avslutningen ligger i en egen `finishQuiz`, som 1.8 utvider med avkrysning (AD-13). Delkapittelet slås opp som i `getSubchapterSummary` i `chapterOverview.ts`.
- `src/application/chapterOverview.ts` -- `getSubchapterSummary` får `quizReady` (samlet status «klart» eller «utdatert»).
- Ny `supabase/migrations/<ts>_quizzes.sql` med tre tabeller:
  - `sessions` (`started_at`, `ended_at`).
  - `quizzes`: `session_id`, `subchapter_id`, status `pågår`/`ferdig`, `correct_count`, `total`, `carry_theme_id`, `finished_at`. Delvis unik indeks på én `pågår` per delkapittel.
  - `quiz_items`: `quiz_id`, `position` 1–10, `question_id`, status `aktiv`/`erstattet`, `chosen_index`, `correct`, `answered_at`. Unik `(quiz_id, position)` der status er `aktiv`.

  `question_banks.sql` er mønsteret for RLS, `GRANT` og sammensatt FK.
- `src/adapters/supabase/rls.dev.test.ts` -- de nye tabellene.
- Ny `src/app/(innlogget)/emner/[id]/delkapitler/[nummer]/quiz/page.tsx` (+ test) og `actions.ts` (+ test) -- startside eller nåværende spørsmål som `<fieldset>` med radioknapper, tilbakemelding etter svar og resultat. Server Actions bruker `getDataSource()` og `redirect` som i `emner/actions.ts`. Siden pakkes i `OwnerOnly`.
- `src/app/(innlogget)/emner/[id]/delkapitler/[nummer]/page.tsx` -- knappen «Ta quizen» (`primaryButton`) når `quizReady`.
- `src/app/(innlogget)/emner/formState.ts` -- nye meldinger.

## Tasks & Acceptance

**Execution:**
- [ ] `src/domain/quiz.ts` + test -- utvalg, erstatning og resultattekst etter matrisen
- [ ] `supabase/migrations/…_quizzes.sql` -- tabellene. Push mot `dev`
- [ ] `src/application/dataSource.ts`, `MemoryDataSource.ts`, Supabase-adapter + tester -- de seks metodene
- [ ] `src/application/quiz.ts` + test -- `startQuiz`, `getQuiz`, `answerQuiz`, `finishQuiz` etter matrisen
- [ ] `chapterOverview.ts` + test, lesesiden + test -- `quizReady` og knappen «Ta quizen»
- [ ] `quiz/page.tsx`, `quiz/actions.ts` + tester, `formState.ts` -- quizsiden
- [ ] `rls.dev.test.ts` -- RLS for de nye tabellene

**Acceptance Criteria:**
- Given IBE430 kapittel 1 i `dev`, when eieren åpner 1.1 fra startsiden og trykker «Ta quizen», then vises spørsmål 1 av 10 med fire alternativer, og 10 spørsmål er lagret som brukt.
- Given en quiz der spørsmål 3 er besvart, when siden lastes på nytt, then vises spørsmål 4 med de samme spørsmålene.
- Given to fullførte quizer på 1.1, when den tredje startes, then er ingen spørsmål fra de to første med, så lenge banken har nok spørsmål eieren aldri har fått.

## Design Notes

Erstatning midt i quizen: målposisjonen er den siste ubesvarte posisjonen etter den gale, og helst en som ikke selv er en erstatning. Det gamle elementet blir `erstattet` og står igjen som brukt. Nytt element får samme posisjon.

Overført tema: `carry_theme_id` på den ferdige quizen leses av `selectQuizQuestions` fra den siste ferdige quizen på delkapittelet.

Siden etter svar: action lagrer og sender til `?svar=<posisjon>`, som viser tilbakemeldingen og «Neste spørsmål». Uten parameter vises neste ubesvarte. Etter siste svar sendes eieren til resultatet.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` -- expected: ingen feil
- `npx supabase db push --remote` mot `dev` -- expected: migreringen kjører
- `npm run test:dev` -- expected: passerer

**Manual checks:**
- `npm run dev` mot `dev`: ta en quiz på 1.1 med ett feil svar, last siden på nytt midt i, og se resultatet.

## Implementation Notes

## Spec Change Log

## Review Triage Log
