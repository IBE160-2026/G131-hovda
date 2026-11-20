---
title: 'Story 1.5b: Status i kapittellisten og lesesiden for sammendraget'
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

**Problem:** Etter 1.5a ligger sammendragene for IBE430 kapittel 1 i `summary_versions`, men eieren ser dem ikke. Kapittellisten på startsiden viser bare «mangler notater», og det finnes ingen side for å lese et sammendrag (FR-11, NFR-3).

**Approach:** Et brukstilfelle i `src/application` regner ut status per delkapittel fra notatet, siste klare versjon og hashen notatet har nå. Kapittellisten viser statusen, og klare delkapitler lenker til en ny leseside som viser den siste klare versjonen med enkel Markdown.

## Boundaries & Constraints

**Always:**
- Status per delkapittel, i denne rekkefølgen: «mangler notater» (`hasNotes` er false), «mangler innhold» (ingen klar versjon), «utdatert» (siste klare versjon har en annen `inputHash` enn `subchapterInputHash` for notatet og kapittelet nå), ellers «klart».
- Statusen gjelder bare sammendraget til 1.6 legger til spørsmålsbanken. Gjennomført kommer i 1.8.
- Ingen ny migrering og ingen nye metoder i `DataSource`. Kapittellisten henter alle versjonene med ett kall til `listSummaryVersions`.
- Lesesiden er `/emner/[id]/delkapitler/[nummer]` (nummer = «n.m», AD-5) og pakkes i `OwnerOnly`.
- Markdown vises uten `dangerouslySetInnerHTML` og uten ny pakke: avsnitt, punktlister med `- ` og `**fet**`. Annen tekst vises som den står.
- Norsk bokmål, tastatur og kontrast som ellers i appen, ingen sidelengs rulling på mobil.

**Beslutninger (Marte, 20.11.2026):**
- Et «utdatert» delkapittel lenker til lesesiden som «klart». Lesesiden viser siste klare versjon med merknaden «Notatet er endret etter at dette sammendraget ble laget.»
- Specen beholdes hel (ett mål, over 1600 tokens).

**Never:**
- Ingen quiz, økt eller avkrysning (1.7, 1.8). Ingen endringer i importen.
- Ikke kjøre importen eller deploye mot `prod` uten at Marte har sagt ja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Klart | Notat, klar versjon med samme hash | Merket «klart» og lenke til lesesiden | N/A |
| Utdatert | Notatet er endret etter importen | Merket «utdatert» og lenke. Lesesiden viser merknaden | N/A |
| Mangler innhold | Notat, ingen klar versjon | Merket «mangler innhold», ingen lenke | N/A |
| Mangler notater | Tomt notat eller plassholderen | Merket «mangler notater», ingen lenke | N/A |
| Lesesiden | Klart delkapittel | Tittel, kapittel og siste klare versjon | N/A |
| Ukjent | Emne eller nummer finnes ikke, eller er ikke eierens | «Fant ikke delkapittelet.» og lenke til startsiden | N/A |
| Uten sammendrag | Delkapittel uten klar versjon | «Dette delkapittelet har ikke noe sammendrag ennå.» | N/A |
| Databasefeil | `listChapters` eller `listSummaryVersions` gir `unavailable` | `unavailableMessage` med `role="alert"` | N/A |

</frozen-after-approval>

## Code Map

- `src/app/(innlogget)/start/page.tsx` -- `ActiveCourse` og `ChapterList`. `ChapterList` tar i dag `ReadResult<Chapter[]>` og viser «mangler notater» med `hasNotes`. Kommentaren «Delkapitlene blir lenker i 1.7» oppdateres. Merkelappen `rounded-full bg-sun px-3 py-0.5 text-sm font-semibold` er mønsteret for status.
- `src/app/(innlogget)/start/page.test.ts` -- rendrer `ActiveCourse` med `renderToStaticMarkup` og en mock-`DataSource`. Utvid med `listSummaryVersions`.
- `src/app/(innlogget)/emner/[id]/page.tsx` -- mønster for en side med `params`, `getDataSourceForRender`, `unavailableMessage` og `notFoundMessage` fra `../formState`, `pageMain` og `textLink` fra `../styles`.
- `src/app/(innlogget)/ownerOnlyPages.test.ts` -- finner nye `page.tsx` selv. Ingen endring.
- `src/application/dataSource.ts` -- `Chapter` (med `learningGoals`, `keyConcepts`), `Subchapter`, `listSummaryVersions` → `SubchapterSummaries` (`latestReady`). Uendret.
- `src/application/summaryHash.ts` -- `subchapterInputHash(chapter, noteText)` gjenbrukes.
- `src/application/testing/MemoryDataSource.ts` -- brukes i testen av brukstilfellet.
- `src/domain/hasNotes.ts`, `src/domain/summary.ts` -- `hasNotes`; ny ren statusfunksjon kan ligge i `summary.ts`.

## Tasks & Acceptance

**Execution:**
- [ ] `src/domain/summary.ts` + test -- `subchapterStatus` (ren) etter rekkefølgen i Always.
- [ ] `src/domain/summaryMarkdown.ts` + test -- tolk teksten til blokker (avsnitt, liste) med tekst- og fet-segmenter.
- [ ] `src/application/chapterOverview.ts` + test -- `listChapterOverview(data, courseId)` (kapitler med status per delkapittel) og `getSubchapterSummary(data, courseId, number)` (delkapittel, kapittel, status og siste klare versjon, eller `notFound`). Tester mot `MemoryDataSource` etter matrisen.
- [ ] `src/app/(innlogget)/start/page.tsx` + test -- `ChapterList` bruker oversikten, viser status og lenker der matrisen sier det.
- [ ] `src/app/(innlogget)/emner/[id]/delkapitler/[nummer]/page.tsx` + test -- lesesiden med `OwnerOnly`, lenke tilbake til startsiden og Markdown-visning.

**Acceptance Criteria:**
- Given IBE430 kapittel 1 importert mot `dev` med `kapittel-1.innhold.md`, when eieren åpner startsiden, then har 1.1–1.6 «klart», og hvert av dem åpner lesesiden med sammendraget.
- Given lesesiden for 1.1, when den rendres, then vises **fet** tekst som `<strong>` og punktlister som `<ul>`, og ingen `**` eller `- ` står igjen i teksten.
- Given en ukjent eller fremmed `id`, when lesesiden åpnes, then vises ingen data fra andre eiere (RLS gir tom liste).

## Design Notes

Hashen regnes i appen med samme funksjon som importen, så «utdatert» betyr nøyaktig det samme i kapittellisten som i importutskriften. Kostnaden er én SHA-256 per delkapittel med notater, godt under NFR-3.

Markdown-tolkingen er bevisst liten: blokker skilles med tomme linjer, en blokk der alle linjer starter med `- ` er en liste, og `**…**` innenfor en linje blir fet. Ulukkede `**` vises som tekst.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` -- expected: ingen feil
- `npm run dev` og åpne `/start` mot `dev` -- expected: status og lenker for kapittel 1, lesesiden viser sammendraget

## Implementation Notes

## Spec Change Log

## Review Triage Log
