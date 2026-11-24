---
title: 'Story 2.2: Hvem som helst kan åpne demoen og lese sammendrag'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: 'c6e3400a48fd06eddc15713c3dadc44599c53cac'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Faglærer og sensor kan ikke prøve appen uten konto. Demofila fra 2.1 finnes, men ingen inngang, datakilde eller skjerm bruker den (FR-26, UJ-5, AD-3, NFR-5, NFR-8).

**Approach:** Knappen «Prøv demoen» på forsiden åpner `/demo` uten innlogging. Demosidene kjører i nettleseren med en egen komposisjonsrot (`DemoDataSource` på `demo-data/demo.json` og `DemoClock`) og bruker de samme brukstilfellene og skjermkomponentene som appen. Skrivefunksjonene er skjult.

## Boundaries & Constraints

**Always:**
- Rutene er `/demo` (emnelisten med IBE430), `/demo/emner/[id]` (emnekortet med eksamensform, læringsutbytte og kapittellisten med status) og `/demo/emner/[id]/delkapitler/[nummer]` (lesesiden).
- I emnelisten er IBE430 en lenke rett til kapittellisten, uten «Velg» og uten aktivt emne (Martes valg 24.11.2026).
- Et merke øverst på hver demoside (felles `layout.tsx`): «Demo. Du prøver Studievenn uten konto, og ingenting lagres.», med lenken «Avslutt demoen» til `/`.
- Skjermene i appen og i demoen bruker de samme komponentene for emnekortet, framdriften, kapittellisten og sammendraget. Komponentene får data og lenker som props og importerer ingen komposisjonsrot eller server action.
- `listChapterOverview` og `getSubchapterSummary` brukes uendret. `DemoDataSource` gir hvert delkapittel en fast plassholdertekst som notat og bruker `subchapterInputHash` som `inputHash` på sammendraget og banken, så status blir «klart».
- `DemoDataSource` validerer fila med `validateDemoData`. Ugyldig fil gjør at alle lesinger gir `unavailable`, og skjermene viser `unavailableMessage`. Skrivemetodene gir `unavailable` (2.3 legger til quiztilstanden).
- Porten `Clock` (`today(): string`, `ÅÅÅÅ-MM-DD`) i `src/application`, og `DemoClock` med den faste datoen `2026-12-01`.
- Komposisjonsroten `src/composition/demo.ts` importerer bare demo- og klokkeadapteren. En test i CI følger importene fra `src/composition/demo.ts` og fra alle filer under `src/app/demo/` og feiler hvis den når `@/adapters/supabase`, `@supabase/*` eller `@/composition/server`.
- Norsk bokmål, ingen sidelengs rulling på mobil, og de samme stilene som appen.

**Never:**
- Ingen quiz, avkrysning eller `sessionStorage` (2.3). «Ta quizen» vises ikke.
- Ingen knapper for å velge, opprette, endre eller slette emne, ingen feilrapporter og ingen «Logg ut».
- Ingen endring i `DataSource`, i Supabase-adapteren, i databasen eller i `demo-data/demo.json`.
- Ingen egne demoversjoner av skjermene og ingen kopiert markup.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Inngang | Uinnlogget på `/` | «Prøv demoen» fører til `/demo` med IBE430 og merket | N/A |
| Kapittellisten | `/demo/emner/demo-ibe430` | Kapittel 1 (1.1–1.6) og 2 (2.1), alle «klart» og lenket. Framdriften viser 0 av 7 | N/A |
| Lesesiden | `.../delkapitler/1.2` | Sammendraget fra fila, uten quizknapp eller feilrapport | N/A |
| Ukjent delkapittel | `.../delkapitler/9.9` | `subchapterNotFoundMessage` og lenke tilbake til kapitlene | N/A |
| Ukjent emne | `/demo/emner/x` | Melding om at emnet ikke finnes, med lenke til `/demo` | N/A |
| Ugyldig fil | `validateDemoData` feiler | `unavailableMessage` på alle sidene | Ingen krasj |

</frozen-after-approval>

## Code Map

- `src/app/page.tsx` -- forsiden. Legg «Prøv demoen» (`secondaryButton`) ved siden av «Logg inn».
- `src/app/(innlogget)/start/page.tsx` -- `ActiveCourse`, `Progress`, `ChapterList` (lenkene er hardkodet til `/emner/...`). Flytt markupen ut og behold datahentingen.
- `src/app/(innlogget)/emner/page.tsx` -- `CourseList` har emnekortet inline, med «Velg», «Endre» og «Slett».
- `src/app/(innlogget)/emner/[id]/delkapitler/[nummer]/page.tsx` -- `SubchapterSummary`, `SummaryText` og `Inline` (ikke eksportert). Importerer `startQuizAction` og `reportSummaryAction`.
- `src/app/(innlogget)/emner/styles.ts`, `formState.ts` -- stiler og meldinger. Importerer bare `@/domain`, så de kan brukes i nettleseren.
- `src/application/chapterOverview.ts` -- status regnes fra `hasNotes(noteText)` og `subchapterInputHash(chapter, noteText)` (`crypto.subtle`, virker i nettleseren).
- `src/application/demoData.ts` -- `validateDemoData`, `DemoData`-typene.
- `src/application/testing/MemoryDataSource.ts` -- mønster for en `DataSource` i minnet.
- `src/composition/server.ts` -- må aldri importeres fra demoen.
- `eslint.config.mjs` -- `src/app` kan ikke importere `@/adapters`. Demosidene går derfor via `@/composition/demo`.
- Testene for sidene (`start/page.test.ts`, `delkapitler/[nummer]/page.test.ts`) mocker `@/composition/server` og bruker `renderToStaticMarkup`. De må fortsatt være grønne etter flyttingen.
- `src/app/(innlogget)/ownerOnlyPages.test.ts` -- gjelder bare `(innlogget)`. Demosidene ligger utenfor.

## Tasks & Acceptance

**Execution:**
- [x] `src/application/clock.ts` -- porten `Clock` -- AD-11, kreves av komposisjonsroten
- [x] `src/adapters/clock/demoClock.ts` -- `DemoClock` med fast dato
- [x] `src/adapters/demo/dataSource.ts` (+ `.test.ts`) -- `DemoDataSource(input: unknown)`: validerer, gir emnet, `getActiveCourse` lik emnet, kapitler med plassholdernotat, sammendrag og banker med regnet hash, tomme avkrysninger og rapporter. Testen kjører `listChapterOverview` og `getSubchapterSummary` mot `demo.json` og en ugyldig fil
- [x] `src/composition/demo.ts` -- `getDemo()` gir `{ data, clock }` fra `demo-data/demo.json` (JSON-import)
- [x] `src/app/_screens/` -- `CourseHeader`, `Progress`, `ChapterList` (med `subchapterHref`), `SummaryArticle` (med valgfri `actions`-slot) og `SummaryText`. Ingen datahenting
- [x] `src/app/(innlogget)/start/page.tsx`, `emner/[id]/delkapitler/[nummer]/page.tsx` -- bruk `_screens`, med samme markup og oppførsel som før
- [x] `src/app/demo/layout.tsx` og `page.tsx`, `emner/[id]/page.tsx`, `emner/[id]/delkapitler/[nummer]/page.tsx` -- klientkomponenter (`"use client"`) som kaller brukstilfellene med `getDemo().data` i en effekt, viser «Laster …» og tegner med `_screens`. Rutene har samme `title`-mønster som appen
- [x] `src/composition/demo.test.ts` -- testen av importene (NFR-5, NFR-8)
- [x] `src/app/page.tsx` -- knappen «Prøv demoen»
- [x] `README.md` -- kort avsnitt om demoen

**Acceptance Criteria:**
- Gitt forsiden, når den besøkende trykker «Prøv demoen», så vises emnelisten med IBE430 uten innlogging, og merket står øverst på hver demoside.
- Gitt en demoside, når den er lastet, så går ingen forespørsel til Supabase (Network-fanen viser ingen kall til `*.supabase.co`).
- Gitt komposisjonsroten for demoen, når `npm test` kjører i CI, så feiler testen hvis demoen kan nå Supabase-adapteren eller `@/composition/server`.
- Gitt appen for eieren, når skjermene er flyttet til `_screens`, så er sidetestene grønne og sidene ser ut som før.

## Design Notes

Demoen kjører i nettleseren (AD-3), så 2.3 kan legge quiztilstanden i `sessionStorage` uten ny arkitektur. Plassholdernotatet gjør at de uendrede brukstilfellene gir «klart». Det er sant, for eksporten tar bare med klare delkapitler. `Clock` har ingen bruker i 2.2 utover komposisjonsroten. Datoen tas i bruk i Epic 3.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test` -- ingen feil
- `npm run build` -- ingen feil, og demorutene bygges

**Manual checks:**
- `npm run dev`: `/` → «Prøv demoen» → IBE430 → 1.2. Sjekk merket, at skriveknappene er borte, at det ikke er sidelengs rulling ved 375 px, og at det ikke går kall til Supabase.

## Implementation Notes

- `page.tsx` under `src/app/demo/` er tynne serverkomponenter, fordi en klientkomponent ikke kan eksportere `metadata` (titlene). Klientkomponentene ligger ved siden av (`DemoCourses.tsx`, `emner/[id]/DemoCourse.tsx`, `emner/[id]/delkapitler/[nummer]/DemoSummary.tsx`), leser `params` med `use()` i `<Suspense>` (Cache Components) og laster med `useDemoResult` i en effekt. Feiler lesingen (for eksempel uten `crypto.subtle` på http utenom localhost), vises `unavailableMessage`.
- `_screens` fikk også `CourseCard` (emnet i emnelisten, brukt av `emner/page.tsx` og `/demo`) og `UnavailableMessage`, så demoen ikke kopierer markup.
- `createDemo(input)` i `src/composition/demo.ts` lar testene i `src/app/demo/` lage en demo med ugyldig fil uten å importere adapteren (lint-regelen).
- Lenken «Avslutt demoen» har tekstfargen, ikke aksentfargen, fordi aksent mot `bg-sun` har for lav kontrast i mørk modus.
- Titlene: «Demo – Studievenn», «Emne i demoen – Studievenn», «Sammendrag i demoen – Studievenn».
- `src/app/page.test.ts` dekker raden «Inngang» i matrisen: forsiden lenker «Prøv demoen» til `/demo`.

## Spec Change Log

## Review Triage Log

Første review (blind, kanttilfeller, verifikasjon), 20 funn: 7 rettet (patch), 1 delvis utsatt (defer) og 12 avvist.

| # | Kilde | Funn | Verdict | Begrunnelse | Rute |
|---|-------|------|---------|-------------|------|
| 1 | blind | Kommentaren i `clock.ts` sier at all datologikk går via porten, men ingen bruker den | low | Stemmer: Supabase-adapteren bruker `new Date()`. Rettingen er direkte (kommentaren) | patch |
| 2 | blind | `DEMO_CREATED_AT` gjentar `DEMO_TODAY` | low | Tidspunktene vises aldri. Rettingen kobler to adaptere | avvist |
| 3 | blind | Testen «lagrer aldri noe» sjekker 4 av 13 skrivemetoder | low | Alle metodene er `return unavailable`. Lite sannsynlig feil | avvist |
| 4 | blind | Testen av ugyldig fil mangler 4 lesinger, som heller ikke har returtype | low | De fire gir `this.demo ? ok([]) : unavailable`. Kosmetisk | avvist |
| 5 | blind | `_screens` og demoen importerer tekster og stiler fra `(innlogget)`, så serverkode der kan lekke inn i demoen | low | Å flytte filene er mer enn en direkte retting. Testen av importene får i stedet `server-only`, `next/headers` og `next/server` som forbudte (se #6) | patch (med #6) |
| 6 | blind, kant ×2 | Hull i testen av importene: `server-only`, mal-strenger, `.js`, `composition/server/index.ts` | low | `server-only` og `next/*` legges til (direkte). Resten er hypotetisk: ingen slike importer finnes, og specifieren `@/composition/server` fanges uansett | patch (delvis) |
| 7 | blind | Ukjent emne på lesesiden lenker til `/demo/emner/x`, som er en ny «fant ikke»-side | low | Neste side lenker til `/demo`. Rettingen trenger en ny gren | avvist |
| 8 | blind | Ukjente demosider gir HTTP 200 og faste titler | false | Appen gjør det samme: lesesiden viser meldingen med 200 og har fast tittel | avvist |
| 9 | blind, kant | Uten JavaScript står «Laster …» for alltid | low | Rettingen er direkte: ett `<noscript>` i layouten | patch |
| 10 | blind | Hele demofila er med i nettleserkoden | false | Det er valgt i spec (AD-3), og 2.3 trenger spørsmålene | avvist |
| 11 | blind | Importen i `demoScreens.test.ts` er dårlig formatert | low | Direkte retting | patch |
| 12 | blind | Testfila «ugyldig» sier ikke hvilken regel den bryter | low | Kosmetisk | avvist |
| 13 | blind | `DemoCourseView` kopierer kortet (`section` med `bg-mint`-strek) fra startsiden | low | Spec sier ingen kopiert markup. Rettingen er en liten felles komponent | patch |
| 14 | blind | Lenken «Til kapitlene» ligger bak `Suspense` på lesesiden | low | Vises straks `params` er klare. Kosmetisk | avvist |
| 15 | blind | Specen og `sprint-status.yaml` mangler i diffen | false | Holdt utenfor reviewen med vilje. De committes med koden | avvist |
| 16 | kant | `page.tsx` i demoen er ikke klientkomponenter, som spec sier | low | Avviket står i Implementation Notes (`metadata` krever serverkomponent). Oppførselen er den samme | avvist |
| 17 | verif. | Ingen test tegner `CourseCard` med `active`, så merket for aktivt emne kan forsvinne | medium | Funnet er verifisert av verifikasjonslaget. Ny test | patch |
| 18 | verif. | `useDemoResult` og wrapperne kjøres ikke i noen test | medium | Funnet er verifisert av verifikasjonslaget. Lastingen og feilmappingen flyttes til `runDemoLoad` og testes. Effekten og `id`/`nummer` i wrapperne trenger DOM-tester | patch + defer |
| 19 | blind | `DemoClock` har ingen test | low | Én konstant. Lite sannsynlig feil | avvist |
| 20 | blind | Kommentarer og strenger kan gi falske treff i testen av importene | low | Et falskt treff feiler høylytt, og det er riktig oppførsel | avvist |
