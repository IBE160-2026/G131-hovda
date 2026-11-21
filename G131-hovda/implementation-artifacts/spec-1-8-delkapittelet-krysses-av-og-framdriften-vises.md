---
title: 'Story 1.8: Delkapittelet krysses av, og framdriften vises'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_commit: 'dd618b64f0bf00d12b5345c598e95df03d548214'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En ferdig quiz gir et resultat, men delkapittelet krysses ikke av, og startsiden viser ikke hvor langt eieren har kommet mot målet (FR-15, FR-20 del 1, AD-13).

**Approach:** Ved minst 80 % riktige skriver `finishQuiz` en `subchapter_completion` i samme transaksjon som resultatet fryses. Under 80 % får eieren tilbud om å lese sammendraget igjen og ta en ny quiz. Startsiden viser en framdriftsindikator øverst («5 av 19 gjennomført, mål 18»), og kapittellisten merker gjennomførte delkapitler. Begge leser fra `subchapter_completion`.

## Boundaries & Constraints

**Always:**
- 80 %-regelen er en ren funksjon i `src/domain`: `isCompleted(correct, counted)`, der `correct / counted ≥ 0,8` regnes med heltall. Enhetstester for 8/10 (ja), 7/10 (nei) og 8/9 (ja). `finishQuiz` bruker `counted = 10` til 1.9 tar bort spørsmål.
- Én `subchapter_completion` per delkapittel, med tidspunkt og quiz-ID. Bare `finishQuiz` skriver den, og den angres aldri: ikke av senere quizer, feilrapporter, ny import eller endrede notater. Det er ingen update og ingen delete for innlogget bruker. Raden forsvinner bare når emnet slettes (cascade).
- Resultatet og avkrysningen lagres i én transaksjon (databasefunksjon, som `create_quiz` i 1.7). Feiler den, er ingenting lagret, og quizen kan avsluttes på nytt.
- Målet er 90 % av de aktive delkapitlene i emnet, rundet opp: 21 → 19, 19 → 18, 6 → 6. Det regnes fra antallet som finnes, og hardkodes ikke. Fjernede delkapitler teller ikke.
- Framdriften og kapittellisten regner «gjennomført» ut fra `subchapter_completion` og aldri fra quizresultater.
- Ny migrering mot `dev` før `prod`, med RLS, `GRANT` og sammensatt eier-FK som i 1.7. Norsk bokmål, tastatur, kontrast og mobil som ellers i appen.

**Never:**
- Ingen plan, ingen «foran/bak planen» og ingen dagens forslag (Epic 3). Ingen feilrapport (1.9).
- Ingen migrering eller deploy mot `prod` uten at Marte har sagt ja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Gjennomført | Siste svar gir 8 av 10, ikke gjennomført før | «8 av 10 riktige» og «Delkapittelet er krysset av som gjennomført.» Én rad med tidspunkt og quiz-ID | N/A |
| Under 80 % | 7 av 10 | Ingen rad. «Under 80 % riktige …», lenke til sammendraget og knappen «Ta en ny quiz» | N/A |
| Alt gjennomført, ny ≥ 80 % | Rad fra en tidligere quiz | Ingen ny rad, og tidspunkt og quiz-ID er uendret. Resultatet sier «Delkapittelet er alt gjennomført.» | N/A |
| Alt gjennomført, ny < 80 % | Rad fra en tidligere quiz | Raden står. Tilbudet vises, og «Delkapittelet er alt gjennomført.» | N/A |
| Gjenopptatt avslutning | Resultatet feilet, så «Se resultatet» med 9 av 10 | Én rad, i samme transaksjon som resultatet | N/A |
| Endrede notater | Gjennomført delkapittel blir «utdatert» etter import | Fortsatt gjennomført i liste og framdrift | N/A |
| Framdrift | 5 av 19 aktive gjennomført | «5 av 19 gjennomført, mål 18» og «13 igjen til målet» | N/A |
| Målet nådd | Gjennomført ≥ målet | «Målet er nådd!» i stedet for «igjen» | N/A |
| Ingen delkapitler | Emnet har ingen kapitler | Ingen framdriftsindikator | N/A |
| Databasefeil | Avslutningen feiler | Ingen rad, ingen frosset quiz, `unavailableMessage` (som i 1.7) | Ny avslutning via «Se resultatet» |
| Lesefeil | Avkrysningene kan ikke leses | `unavailableMessage` med `role="alert"` i kapittellisten, ingen framdrift | N/A |

</frozen-after-approval>

## Code Map

- `src/domain/quiz.ts` (+ test) -- legg til `COMPLETION_SHARE`/`isCompleted(correct, counted)`. Ny `src/domain/progress.ts` (+ test): `courseProgress(total, completed)` → `{ completed, total, goal, remaining }`, der `goal = ceil(total · 9 / 10)` regnes med heltall.
- Ny `supabase/migrations/<ts>_subchapter_completions.sql`:
  - Tabellen `subchapter_completions` med `owner_id`, `subchapter_id` og `quiz_id`, sammensatte FK-er med `on delete cascade`, og `completed_at`. Unik `(owner_id, subchapter_id)`. Bare policyer for `select` og `insert`, og `GRANT select, insert`.
  - Funksjonen `public.finish_quiz(p_quiz_id uuid, p_correct_count int, p_carry_theme_id uuid, p_completes boolean) returns boolean`, med `security invoker` og `search_path = ''`. Den oppdaterer quizen fra `pågår` til `ferdig` med `total` 10, og gir `false` når ingenting ble endret. Når `p_completes` er sann, settes en rad inn med `on conflict do nothing`.
  - Mønsteret er `20261121130000_quiz_functions.sql`.
- `src/application/dataSource.ts`, `testing/MemoryDataSource.ts` og `src/adapters/supabase/dataSource.ts` (+ test):
  - `saveQuizResult(quizId, { correctCount, carryThemeId, completes })` kaller `rpc("finish_quiz")` i stedet for `update`.
  - Ny `listCompletions(subchapterIds)` gir `{ subchapterId, quizId, completedAt }[]` (som `listQuestionBanks`).
  - Memory: én rad per delkapittel, og `resultWritesDown` hindrer både resultatet og raden.
- `src/application/quiz.ts` (+ test):
  - `finishQuiz` sender `completes: isCompleted(correctCount, QUIZ_LENGTH)`.
  - `getQuiz` sitt `result`-trinn får `completedBy: "this" | "earlier" | null` (fra `listCompletions`) og `passed: boolean`.
- `src/application/chapterOverview.ts` (+ test) -- `listChapterOverview` leser `listCompletions` i samme `Promise.all` og gir `completed: boolean` per delkapittel.
- `src/app/(innlogget)/start/page.tsx` (+ test):
  - Framdriftsindikatoren står øverst i emnekortet: tekst og `<progress>` med etikett.
  - `ChapterList` viser merket «gjennomført» ved siden av statusen.
- `quiz/page.tsx` (+ test) -- teksten om avkrysning eller tilbudet under resultatet. «Ta en ny quiz» bruker `startQuizAction`.
- `src/app/(innlogget)/emner/formState.ts` -- de nye meldingene.
- `src/adapters/supabase/rls.dev.test.ts`:
  - RLS for tabellen og at `update`/`delete` gir feil.
  - `finish_quiz` med og uten avkrysning, og at en ny quiz ikke endrer raden.
  - At raden slettes med emnet.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/quiz.ts`, `src/domain/progress.ts` + tester -- 80 %-regelen og målet etter matrisen
- [x] `supabase/migrations/…_subchapter_completions.sql` -- tabellen og `finish_quiz`. Push mot `dev`
- [x] `dataSource.ts`, `MemoryDataSource.ts`, Supabase-adapter + tester -- `saveQuizResult` via RPC og `listCompletions`
- [x] `src/application/quiz.ts` + test -- `finishQuiz` og resultattrinnet etter matrisen
- [x] `chapterOverview.ts` + test, `start/page.tsx` + test -- `completed`, framdriftsindikator og merket «gjennomført»
- [x] `quiz/page.tsx` + test, `formState.ts` -- avkrysning og tilbudet under 80 %
- [x] `rls.dev.test.ts` -- RLS, frys og cascade for `subchapter_completions`

**Acceptance Criteria:**
- Given IBE430 kapittel 1 i `dev`, when eieren fullfører en quiz på 1.1 med minst 8 riktige og åpner startsiden, then er 1.1 merket «gjennomført», og indikatoren viser «1 av 6 gjennomført, mål 6».
- Given at 1.1 er gjennomført, when kapittel 1 importeres på nytt og eieren tar en ny quiz med 3 riktige, then er 1.1 fortsatt gjennomført med samme tidspunkt.

## Design Notes

Resultatet og avkrysningen skrives i samme transaksjon, fordi det ikke finnes noe senere tidspunkt for å prøve avkrysningen igjen: `finishQuiz` kalles bare for quizer som `pågår`. Avgjørelsen om avkrysning tas i domenet. Databasen lagrer den og sørger for at det blir én rad.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` -- expected: ingen feil
- `npx supabase db push --remote` mot `dev` -- expected: migreringen kjører
- `npm run test:dev` -- expected: passerer

**Manual checks:**
- `npm run dev` mot `dev`: én quiz under og én over 80 % på et delkapittel. Se tilbudet, avkrysningen og framdriften på startsiden.

## Implementation Notes

- Migreringen `20261121140000_subchapter_completions.sql` er kjørt mot `dev` (studievenn-dev), og `npm run test:dev` passerer (19 tester). Ikke kjørt mot `prod`. De manuelle sjekkene står igjen.
- Quizer som ble ferdige med minst 8 riktige før migreringen (1.7), har ingen avkrysning. Resultatsiden viser da verken avkrysning eller tilbud. Delkapittelet krysses av ved neste quiz med minst 80 %.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | blind, edge | Direct INSERT on `subchapter_completions` bypasses `finish_quiz` | low | Real but only reachable by the sole owner hand-crafting API calls against their own rows; spec mandates `security invoker` + `GRANT select, insert` as in 1.7. Fix (definer + revoke) adds surface | reject |
| 2 | blind, edge | No DB tie between `quiz_id` and `subchapter_id` | low | Only reachable through the same owner-only direct insert as #1; `finish_quiz` takes `subchapter_id` from the quiz row itself | reject |
| 3 | blind, edge | Deleting a session/quiz cascades away the completion | low | Only `deleteCourse` deletes anything in the app (`dataSource.ts:340`); a session delete needs a hand-made API call by the owner. Changing the FK needs a new migration | reject |
| 4 | blind, edge | `finish_quiz` trusts `p_completes`/`p_correct_count` | low | Same owner-only direct-RPC path; spec puts the decision in the domain (Design Notes) | reject |
| 5 | edge | `p_correct_count` out of range or null | false | `quizzes_counts_check` (0..10, ≤ total) and `quizzes_result_check` (non-null when ferdig) in `20261121120000_quizzes.sql:41-46` reject it | reject |
| 6 | blind | No backfill for 1.7 quizzes ≥ 80 % | low | Real for quizzes finished before the migration, but the intent says only `finishQuiz` writes completions, which rules out a migration backfill; noted in Implementation Notes | reject (intent) |
| 7 | blind | `total = 10` duplicated in SQL and `QUIZ_LENGTH` | low | Spec mandates `total` 10 in the function until 1.9; 80 % is not duplicated in SQL | reject |
| 8 | blind | Failed completions read hides the chapter list / result | false | Matrix row «Lesefeil» requires `unavailableMessage` with `role="alert"` and no progress; implemented as specified | reject |
| 9 | blind | Progress total counts subchapters without notes | false | `listChapters` filters `removed_at is null` (`dataSource.ts:398`), so only active subchapters count; notes-less ones are active | reject |
| 10 | blind | RLS "no owner completions" test passes on empty table | low | Test-quality only; same pattern as the other tables' RLS tests; fix needs seeding owner data | reject |
| 11 | blind | No cross-user RPC test | low | `finish_quiz` filters `owner_id = auth.uid()`; RLS also blocks the update. Adding a test needs the owner's quiz id | reject |
| 12 | blind | `isInvalidId` maps a malformed theme id to `false` | low | `carryThemeId` comes from stored theme rows, never user input | reject |
| 13 | blind | Spec changes not in diff | false | Spec excluded from the diff on purpose; reviewed separately as claims file | reject |
| 14 | verification-gap | Real `finish_quiz` SQL only verified by `npm run test:dev`, not CI | medium | Pre-verified; CI has no Supabase keys, the repo's deliberate pattern for all migrations | defer |
