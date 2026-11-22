---
title: 'Story 1.9a: Eieren sier fra om feil i quizspørsmål'
type: 'feature'
created: '2026-11-22'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Et feil quizspørsmål (feil fasit, uklart spørsmål) blir stående i banken og teller i resultatet og 80 %-grensen, og eieren kan ikke si fra (FR-16, AD-18).

**Approach:** Eieren melder feil på et spørsmål i quizen, med en valgfri kort kommentar. Spørsmålet trekkes tilbake fra banken med en gang. I en quiz som er i gang, tas det også ut av quizen, og resultatet og 80 %-grensen regnes av de gjenværende (for eksempel 8 av 9). Importen lister de meldte spørsmålene med kommentar, så de kan rettes i innholdsfila.

## Boundaries & Constraints

**Always:**
- Rapporten skrives i én transaksjon (databasefunksjon, som `finish_quiz`): rapportraden, `quiz_questions.status = 'trukket'` med `retired_at`, og at quiz-elementet tas ut når quizen er i gang. Én rapport per spørsmål. Å melde på nytt endrer ingenting.
- Et tilbaketrukket spørsmål velges aldri til en ny quiz. Det slettes aldri.
- I en quiz som `pågår` kan eieren melde spørsmålet som vises nå og et besvart spørsmål i tilbakemeldingen. Elementet får status `trukket`, og quizen går videre til neste ubesvarte. Står ingen ubesvarte igjen, avsluttes quizen med `finishQuiz`.
- Resultatet regnes av elementene som teller (aktive, ikke `trukket`). `finishQuiz` bruker `isCompleted(correct, counted)` med det antallet i stedet for `QUIZ_LENGTH`, og `total` i quizen blir det samme antallet. Et erstatningsspørsmål som alt er lagt inn for temaet, blir stående.
- En ferdig quiz endres aldri. Melder eieren spørsmålet på resultatsiden, trekkes det tilbake fra banken og listes av importen, men resultatet og avkrysningen står.
- Kommentaren er valgfri, trimmes og er maks 500 tegn. Tom kommentar lagres som `null`.
- «Spørsmål n av N» teller bare elementene som teller, så et uttatt spørsmål gir ikke hull.
- Importen skriver ut de meldte spørsmålene for kapittelet etter at den har lagret: delkapittel, spørsmålstekst, tema og kommentar. De listes ved hver import, til 1.6b legger inn erstatningen.
- Ny migrering mot `dev` før `prod`, med RLS, `GRANT` og sammensatte eier-FK-er som i 1.8. Norsk bokmål, tastatur, kontrast og mobil som ellers i appen.

**Never:**
- Ingen feilrapport på sammendrag (story 1.9b, se `deferred-work.md`).
- Importen legger ikke inn nye spørsmål i en bank som finnes. Påfylling og erstatning hører til 1.6b.
- Ingen angring av en rapport, og ingen endring av en ferdig quiz.
- Ingen migrering eller deploy mot `prod` uten at Marte har sagt ja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Meld spørsmålet som vises | Quiz pågår, spørsmål 4 ubesvart | Ute av quizen og banken. Neste ubesvarte vises som «Spørsmål 4 av 9» med «Spørsmålet er meldt som feil og tatt ut av quizen.» | N/A |
| Meld i tilbakemeldingen | Spørsmål 3 besvart feil, erstatning lagt inn | Spørsmål 3 teller ikke, erstatningen står. Svarene til slutt gir «8 av 9 riktige» og avkrysning | N/A |
| Meld det siste ubesvarte | 9 besvart, det 10. meldes | Quizen avsluttes med `total` 9, og 80 %-regelen bruker 9 | Feiler avslutningen: «Se resultatet» som i 1.7 |
| Meld på resultatsiden | Quizen er ferdig, 8 av 10 | Spørsmålet er trukket tilbake, men resultatet «8 av 10 riktige» og avkrysningen står. «Spørsmålet er meldt som feil og tatt ut av banken.» | N/A |
| Meldt fra før | Spørsmålet er alt trukket tilbake | Ingen ny rad. Resultatsiden viser «Spørsmålet er meldt som feil.» i stedet for skjemaet | N/A |
| Kommentar | 501 tegn | Ingenting lagres. Feilmelding ved feltet | Skjemaet beholder teksten |
| Alle meldt | Alle 10 i quizen meldes | Quizen avsluttes med 0 av 0, ikke gjennomført, og meldingen «Alle spørsmålene ble meldt som feil, så quizen har ikke noe resultat.» | N/A |
| For få igjen | Banken har færre enn 10 aktive etter rapporter | Ny quiz kan ikke startes (`tooFewQuestionsMessage` fra 1.7) | N/A |
| Import | To meldte spørsmål i kapittel 1 | Importen skriver ut begge med delkapittel, tekst, tema og kommentar. Utgangskoden endres ikke | N/A |
| Databasefeil | Rapporten feiler | Ingenting er endret, `unavailableMessage` med `role="alert"` | Eieren kan melde på nytt |

</frozen-after-approval>

## Code Map

- Ny `supabase/migrations/<ts>_question_reports.sql`, med `20261121140000_subchapter_completions.sql` som mønster:
  - Tabellen `question_reports`: `owner_id`, `question_id` og `quiz_item_id` (null tillatt) med sammensatte FK-er og `on delete cascade`, `comment` (null, eller 1–500 tegn), `reported_at`. Unik `(owner_id, question_id)`. Bare policyer for select og insert. `GRANT select, insert` til `authenticated`, og `select` til `service_role` for importen.
  - `quiz_items`: `quiz_items_status_check` får `'trukket'`. `quiz_items_replaced_unanswered` gjelder bare `erstattet`. `quiz_items_freeze_answered` tillater bare at et besvart element går fra `aktiv` til `trukket`, med alle andre kolonner uendret.
  - `public.report_quiz_question(p_item_id uuid, p_comment text) returns boolean`, med `security invoker` og `search_path = ''`. Den finner elementet (eierens), setter inn rapporten `on conflict do nothing`, trekker spørsmålet tilbake hvis det er `aktiv`, og setter elementet til `trukket` når quizen `pågår` og elementet er `aktiv`. `false` når elementet ikke finnes.
  - `create or replace` av `finish_quiz` med samme signatur: `total` er antallet `aktiv`-elementer i quizen, ikke 10. Den gamle koden virker da fortsatt i overgangen.
- `src/domain/quiz.ts` (+ test) -- `QuizItemState.status` får `"trukket"`. `quizOutcome` gir også `counted`. Elementer som er `trukket`, er med verken i `counted`, `correctCount` eller `carryThemeId`.
- `src/application/dataSource.ts`, `testing/MemoryDataSource.ts`, `src/adapters/supabase/dataSource.ts` (+ test):
  - `QuizItem.status` får `"trukket"`.
  - Ny `reportQuizItem(itemId, comment)` gir `WriteResult<boolean>` via `rpc("report_quiz_question")`.
  - Ny `listQuestionReports(subchapterIds)` gir `{ subchapterId, question, theme, comment, reportedAt }[]`.
  - Memory: én rapport per spørsmål, og et nytt flagg `reportWritesDown` gjør at ingenting endres. `saveQuizResult` setter `total` til antallet aktive elementer.
- `src/application/quiz.ts` (+ test):
  - Ny `reportQuizQuestion(data, courseId, number, quizId, position, comment)`. Den validerer kommentaren, finner elementet (aktivt i en quiz som pågår, eller det siste i en ferdig quiz) og kaller `finishQuiz` når ingen ubesvarte står igjen.
  - `finishQuiz` bruker `counted`. `getQuiz` sin `total` og «n av N» regnes av de aktive elementene. `QuizItemView` får `reported: boolean` (spørsmålet er `trukket`).
- `quiz/actions.ts` (+ test) -- ny `reportQuizQuestionAction`, med eiersjekk og redirect som `answerQuizAction`. Meldingen vises via en søkeparameter.
- `quiz/page.tsx` (+ test) -- på spørsmåls-, tilbakemeldings- og resultatsteget en `<details>` med «Meld feil i spørsmålet». Den har et valgfritt tekstfelt med etikett, `maxLength` 500, og knappen «Send feilrapport».
- `src/app/(innlogget)/emner/formState.ts` -- de nye meldingene.
- `src/application/importChapter.ts` (+ test), `scripts/import.ts` -- les `listQuestionReports` for kapittelets delkapitler etter lagringen, og legg en seksjon «Meldt som feil (rett i innholdsfila):» i `describeImport`. `importExitCode` endres ikke.
- `src/adapters/supabase/rls.dev.test.ts`:
  - RLS og GRANT for `question_reports`, og at update og delete gir 42501.
  - `report_quiz_question` i en quiz som pågår og i en ferdig quiz.
  - At et besvart element bare kan gå til `trukket`.
  - At `finish_quiz` gir `total` 9 etter en rapport.

## Tasks & Acceptance

**Execution:**
- [ ] `src/domain/quiz.ts` + test -- `trukket` og `counted` i `quizOutcome`
- [ ] `supabase/migrations/…_question_reports.sql` -- tabellen, endringene i `quiz_items`, `report_quiz_question` og `finish_quiz`. Push mot `dev`
- [ ] `dataSource.ts`, `MemoryDataSource.ts`, Supabase-adapter + tester -- `reportQuizItem` og `listQuestionReports`
- [ ] `src/application/quiz.ts` + test -- `reportQuizQuestion`, `counted` i `finishQuiz` og visningen, etter matrisen
- [ ] `quiz/actions.ts`, `quiz/page.tsx` + tester, `formState.ts` -- skjemaet og meldingene
- [ ] `importChapter.ts` + test, `scripts/import.ts` -- listen over meldte spørsmål
- [ ] `rls.dev.test.ts` -- RLS, rapport, frys og `total`

**Acceptance Criteria:**
- Given en quiz på IBE430 1.1 i `dev`, when eieren melder spørsmål 2 med kommentaren «Fasit er feil» og svarer riktig på 8 av de 9 andre, then viser resultatet «8 av 9 riktige», delkapittelet er krysset av, og `npm run import -- --target dev IBE430 1` skriver ut spørsmålet med kommentaren.
- Given at spørsmålet er meldt, when eieren starter en ny quiz på 1.1, then er det meldte spørsmålet ikke med.

## Design Notes

Rapporten peker på quiz-elementet, ikke bare på spørsmålet, så den alltid gjelder et spørsmål eieren faktisk har sett i en quiz. Databasefunksjonen avgjør om elementet tas ut (bare når quizen pågår), så en ferdig quiz forblir fryst selv om rapporten kommer etterpå. `finish_quiz` teller `total` selv, så klienten ikke kan sette den, og den gamle koden virker i overgangen mellom migrering og deploy.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` -- expected: ingen feil
- `npx supabase db push --remote` mot `dev` -- expected: migreringen kjører
- `npm run test:dev` -- expected: passerer

**Manual checks:**
- `npm run dev` mot `dev`: meld ett spørsmål i en quiz som pågår og ett på resultatsiden. Se «n av 9», resultatet, at det står i importen, og at det ikke kommer igjen.

## Implementation Notes

## Spec Change Log

## Review Triage Log
