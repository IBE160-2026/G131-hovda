---
title: 'Story 1.9b: Eieren sier fra om feil i sammendrag'
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

**Problem:** Et feil sammendrag blir stående, og eieren kan ikke si fra om det (FR-12, AD-18).

**Approach:** Eieren melder feil på sammendraget på lesesiden, med en valgfri kort kommentar. Sammendraget merkes, og det gamle vises til neste import. Importen lister merkede sammendrag, så de kan rettes i innholdsfila. Når importen legger inn en ny versjon, gjelder ikke merket lenger.

## Boundaries & Constraints

**Always:**
- Rapporten gjelder versjonen som vises (siste klare). Én rapport per versjon. Å melde på nytt endrer ingenting.
- Merket gjelder så lenge den meldte versjonen er siste klare. En ny klar versjon (rettet tekst, eller `--force n.m`) gjør at merket ikke vises og ikke listes lenger. Ingenting slettes.
- Sammendraget vises som før. Merket vises bare på lesesiden (Martes valg 22.11.2026). Kapittellisten og statusen der endres ikke. Lesesiden viser «Sammendraget er meldt som feil. Det vises til neste import.» i stedet for skjemaet når versjonen er meldt.
- Kommentaren er som i 1.9a: valgfri, CRLF blir LF, trimmes, maks 500 tegn, tom blir `null`. Samme skjema (`ReportForm`) og samme oppførsel ved feil.
- Importen skriver ut de merkede sammendragene for kapittelet etter at den har lagret: delkapittel, tittel og kommentar. Et sammendrag som fikk en ny versjon i samme import, listes ikke. `importExitCode` endres ikke.
- Ny migrering mot `dev` før `prod`, med RLS, `GRANT` (bare select og insert) og sammensatte eier-FK-er som i 1.9a. Norsk bokmål, tastatur, kontrast og mobil som ellers i appen.

**Never:**
- Ingen endring av en sammendragsversjon, og ingen angring av en rapport.
- Ingen endring av feilrapporten på quizspørsmål (1.9a).
- Ingen migrering eller deploy mot `prod` uten at Marte har sagt ja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Meld sammendraget | Lesesiden for 1.1, ikke meldt | Rapporten lagres. Siden viser sammendraget og «Sammendraget er meldt som feil. Det vises til neste import.» | N/A |
| Meldt fra før | Siste klare versjon er meldt | Ingen skjema, bare meldingen. Å sende på nytt gir ingen ny rad | N/A |
| Gammel side | Eieren sender fra en side med en eldre versjon | Ingenting lagres. Siden lastes på nytt med den nyeste versjonen | N/A |
| Kommentar | 501 tegn | Ingenting lagres. Feilmelding ved feltet | Skjemaet beholder teksten |
| Import uten retting | 1.1 er meldt, teksten i innholdsfila er uendret | «uendret», og 1.1 listes med tittel og kommentar. Utgangskoden endres ikke | N/A |
| Import med retting | 1.1 er meldt, teksten er rettet | «sammendrag lagt inn», 1.1 listes ikke, og lesesiden viser det nye uten merke og med skjema | N/A |
| Ingen sammendrag | Delkapittelet har ingen klar versjon | Ingen skjema | N/A |
| Databasefeil | Rapporten feiler | Ingenting lagret, `unavailableMessage` med `role="alert"` | Eieren kan melde på nytt |

</frozen-after-approval>

## Code Map

- Ny `supabase/migrations/<ts>_summary_reports.sql`, med `20261122120000_question_reports.sql` som mønster:
  - `summary_versions` får `unique (owner_id, id)`, så rapporten kan ha en sammensatt eier-FK.
  - Tabellen `summary_reports`: `owner_id`, `summary_version_id` (FK `(owner_id, summary_version_id)` til `summary_versions`, `on delete cascade`), `comment` (null eller 1–500 tegn), `reported_at`. Unik `(owner_id, summary_version_id)`. Policyer for select og insert. `GRANT select, insert` til `authenticated`, `select` til `service_role`.
  - Ingen databasefunksjon: rapporten er én rad (`insert … on conflict do nothing`, via `upsert` med `ignoreDuplicates`).
- `src/application/dataSource.ts`, `testing/MemoryDataSource.ts`, `src/adapters/supabase/dataSource.ts` (+ test):
  - Ny `reportSummaryVersion(versionId, comment)` gir `WriteResult<boolean>` (`false` når versjonen ikke finnes).
  - Ny `listSummaryReports(subchapterIds)` gir `{ subchapterId, summaryVersionId, comment, reportedAt }[]`.
  - Memory: flaggene `summaryReportWritesDown` og `summaryReportReadsDown`. Rapportene fjernes med versjonene.
- `src/application/chapterOverview.ts` (+ test):
  - `getSubchapterSummary` gir også `reported: boolean` (siste klare versjon har en rapport).
  - Ny `reportSummary(data, courseId, number, versionId, comment)`. Den bruker `reportComment` fra `src/application/quiz.ts`, og gir `notFound` når `versionId` ikke er siste klare.
- `delkapitler/[nummer]/actions.ts` (ny, + test) -- `reportSummaryAction` med eiersjekk som `reportQuizQuestionAction`, og redirect til lesesiden.
- `delkapitler/[nummer]/page.tsx` (+ test) -- under sammendraget enten `ReportForm` (flytt eller gjenbruk fra `quiz/ReportForm.tsx`, med etiketten «Meld feil i sammendraget») eller meldingen. Ingen skjema uten klar versjon.
- `src/app/(innlogget)/emner/formState.ts` -- de nye meldingene.
- `src/application/importChapter.ts` (+ test) -- etter `createSummaries`: les `listSummaryReports`, og behold bare rapporter for siste klare versjon. Ny seksjon «Sammendrag meldt som feil (rett i innholdsfila):» i `describeImport`, med linjen `n.m Tittel: kommentar`. Kan rapportene ikke leses, skrives en melding på stderr, som i 1.9a.
- `src/adapters/supabase/rls.dev.test.ts` -- RLS og GRANT for `summary_reports` (update og delete gir 42501), én rapport per versjon, og at en ny versjon ikke arver merket.

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/…_summary_reports.sql` -- unik nøkkel og tabellen. Push mot `dev`
- [ ] `dataSource.ts`, `MemoryDataSource.ts`, Supabase-adapter + tester -- `reportSummaryVersion` og `listSummaryReports`
- [ ] `chapterOverview.ts` + test -- `reported` og `reportSummary`, etter matrisen
- [ ] `[nummer]/actions.ts`, `[nummer]/page.tsx` + tester, `formState.ts`, `ReportForm` -- skjemaet og meldingene
- [ ] `importChapter.ts` + test -- listen over merkede sammendrag
- [ ] `rls.dev.test.ts` -- RLS, én per versjon, ny versjon uten merke

**Acceptance Criteria:**
- Given sammendraget for IBE430 1.1 i `dev`, when eieren melder det med kommentaren «Feil definisjon», then står sammendraget med meldingen, og `npm run import -- --target dev IBE430 1` skriver ut 1.1 med kommentaren.
- Given at teksten for 1.1 er rettet i innholdsfila, when importen kjøres, then viser lesesiden den nye teksten uten merke, og importen lister ikke 1.1.

## Design Notes

Rapporten peker på versjonen, ikke på delkapittelet. Da trengs ingen opprydding: en ny klar versjon har ingen rapport, så merket forsvinner av seg selv, og den gamle rapporten står igjen som historikk. `--force n.m` blir veien ut når rapporten var feil og teksten skal stå.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` -- expected: ingen feil
- `npx supabase db push --remote` mot `dev` -- expected: migreringen kjører
- `npm run test:dev` -- expected: passerer

**Manual checks:**
- `npm run dev` mot `dev`: meld sammendraget for et delkapittel, se meldingen, se det i importen, rett teksten og importer, og se at merket er borte.

## Implementation Notes

## Spec Change Log

## Review Triage Log
