---
title: 'Story 4.1: Importen legger inn gjennomgangsspørsmålene'
type: 'feature'
created: '2026-11-27'
baseline_commit: '4c99e125fb20be26bc9f941534ab12b16f1105bd'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Gjennomgangsspørsmålene faglæreren har gitt står under `## Gjennomgangsspørsmål` i notatfilene, men importen hopper over seksjonen. Kapittelgjennomgangen (4.2–4.4) har derfor ingen spørsmål å bruke (FR-27, AD-2, AD-6, AD-17).

**Approach:** En ren, deterministisk tolking i `src/domain` leser seksjonen. Importen lagrer spørsmålene på kapittelet i en ny tabell `review_questions` med stabil ID, og trekker tilbake gamle spørsmål med status. Kapittellisten viser antallet per kapittel.

## Boundaries & Constraints

**Always:**
- Tolkingen: en linje som starter med heltall og punktum («1.», bare først på linja) starter et nytt spørsmål. Linjer uten nummer hører til spørsmålet over. Linjer før første nummer (innledningen) ignoreres. Spørsmålsteksten lagres uten nummeret, med linjeskift og innrykk for underpunkter («- a) …») bevart. Tolkingen bruker ikke KI.
- Slutten på lista (Martes valg 27.11.2026): bare innrykkede linjer og linjer rett under (uten blank linje) hører til spørsmålet over. En ikke-innrykket linje uten nummer etter en blank linje avslutter lista, og resten av seksjonen ignoreres. Blokken «**Må avklares før bruk:**» i kapittel 3 blir dermed ikke en del av spørsmål 5.
- Kapittellisten (Martes valg 27.11.2026) viser «29 gjennomgangsspørsmål» under kapitteltittelen (aktive spørsmål, «1 gjennomgangsspørsmål» i entall), og ingenting når kapittelet har 0. Demoen ser derfor lik ut til 4.6.
- Normalisert tekst er teksten med whitespace slått sammen, trimmet og med små bokstaver. Den brukes til å gjenkjenne spørsmål. To like spørsmål i samme fil er en valideringsfeil («Linje N: …»), og da skrives ingenting.
- Importen, for hvert kapittel med seksjonen:
  - Et spørsmål som finnes aktivt med samme normaliserte tekst, beholder ID-en og får ny plass i rekkefølgen.
  - Et nytt spørsmål lages, eller et tilbaketrukket spørsmål med samme tekst blir aktivt igjen.
  - Aktive spørsmål som ikke står i fila lenger, får `status = 'trukket'` og `retired_at`. Ingenting slettes.
- Mangler seksjonen, røres ikke kapittelets spørsmål.
- Importen skriver en linje per kapittel, som «Gjennomgangsspørsmål: 29 (3 nye, 1 trukket tilbake)».
- `review_questions` har eier-FK til `auth.users` med `on delete cascade`, sammensatt FK til `chapters (owner_id, id)`, `position`, `text`, `normalized_text`, `status in ('aktiv','trukket')` med `retired_at`-sjekk som for `quiz_questions`, og unik normalisert tekst blant aktive per kapittel. RLS og `GRANT` som i `study_plans`. Migreringen kjøres mot `dev` først.
- Bare importen skriver `review_questions`.

**Never:**
- Ingen kapittelgjennomgang, svar, modellsvar eller endring i dagens forslag (4.2–4.4).
- Ingen KI-lagde gjennomgangsspørsmål (4.5) og ingen spørsmål i demofila (4.6).
- Migreringen kjøres ikke mot `prod` uten Martes ja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Addendumet | Kapittel 1 fra PRD-addendumet | 29 spørsmål i rekkefølgen 1–29, innledningen er ikke med | N/A |
| Underpunkter | Kapittel 3, spørsmål 5 med «- a) …» til «- e) …» | Ett spørsmål med de fem underpunktene | N/A |
| Tekst etter lista | Kapittel 3, «**Må avklares før bruk:**» etter en blank linje | Lista slutter, spørsmål 5 har bare a)–e) | N/A |
| Nummer midt på linja | «Fra innliming 2. Spørsmålene …» før «1.» | Ikke et spørsmål | N/A |
| Første import | Ingen lagrede spørsmål | Alle lagres som aktive i filrekkefølge | N/A |
| Ny kjøring | Samme fil | Ingen nye rader, samme ID-er | N/A |
| Endret tekst | Spørsmål 4 omformulert | Nytt aktivt spørsmål, det gamle `trukket` | N/A |
| Bare stor/liten bokstav eller mellomrom endret | «forklar  …» mot «Forklar …» | Samme spørsmål | N/A |
| Seksjonen mangler | Lagrede spørsmål finnes | Urørt | N/A |
| Dobbelt spørsmål | Samme tekst to ganger | Ingenting skrives | «Linje N: spørsmålet står to ganger» |
| Databasefeil | `unavailable` | Importen stopper som i dag | `importMessages` |

</frozen-after-approval>

## Code Map

Stier er relative til git-rota.

- `src/domain/notesFile.ts` -- `parseNotesFile` (l.79) har seksjonskonstanter (l.21-24) og samler `bankLines` for `readQuestionBank` (l.244). Legg til `SECTION_REVIEW_QUESTIONS` og feltet `reviewQuestions` på `NotesFile` på samme måte. Oppdater toppkommentaren (l.9), som sier at seksjonen hoppes over. Feilformatet er `at(line, msg)`.
- `src/domain/` -- ny `reviewQuestions.ts` (+ test): `readReviewQuestions(lines)` og `normalizeReviewQuestion(text)`. `normalizeAnswer` i `questionBank.ts:60` er privat og fjerner punktum, så den gjenbrukes ikke.
- `src/domain/notesFile.test.ts` -- de ekte filene leses med `?raw` (l.42). Mønster for testene av kapittel 1–5.
- `G131-hovda/planning-artifacts/prds/prd-G131-hovda-2026-09-27/addendum.md` l.73-112 -- testdataene (29 spørsmål). Kopier dem inn i en fixture i testen. Ikke les planleggingsfila i testen.
- `src/application/importChapter.ts` -- `importChapter` (l.149): legg et nytt steg `syncReviewQuestions` etter `findSavedChapter`. Utskriften går via `describeImport` (l.433) og `importMessages` (l.77).
- `src/application/dataSource.ts` (l.215) -- ny type `ReviewQuestion` (`id`, `chapterId`, `position`, `text`, `status`) og `listReviewQuestions(chapterId)` og `syncReviewQuestions(chapterId, texts)`. Synkroniseringen bør gå i én RPC i Supabase, så den blir atomisk.
- `src/application/testing/MemoryDataSource.ts` -- tilbaketrekking som i l.486 (`status = "trukket"`).
- `src/adapters/supabase/dataSource.ts` -- radtypene er skrevet for hånd (som `QuizQuestionRow` l.134). RPC-mønster i `report_quiz_question` (l.842).
- `src/adapters/demo/dataSource.ts` -- `listReviewQuestions` gir tom liste, og skrivemetoden gir `unavailable` (l.546-560).
- `supabase/migrations/20261126120000_study_plans.sql` -- mal for eier-FK, RLS og `GRANT`. `20261120220000_question_banks.sql` l.75-80 er mal for status og `retired_at`. Den nye fila heter `20261127xxxxxx_review_questions.sql`.
- `src/application/chapterOverview.ts:41` -- `ChapterOverview` får `reviewQuestionCount` (aktive).
- `src/app/_screens/ChapterList.tsx` l.49-51 -- antallet vises ved kapitteltittelen. Brukes av `start/page.tsx:108` og `demo/emner/[id]/DemoCourse.tsx:84`.
- `src/adapters/supabase/rls.dev.test.ts` -- par med «gir testkontoen ingen av …» og «stopper … med en annen eier» (l.153/161).

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/reviewQuestions.ts` (+ test) -- tolking og normalisering, matriseradene for tolking og 29 spørsmål fra addendumet
- [x] `src/domain/notesFile.ts` (+ test) -- seksjonen, kontroll av doble spørsmål, og de ekte filene 1–5
- [x] `supabase/migrations/…_review_questions.sql` -- tabell, RLS, `GRANT` og RPC-en for synkronisering
- [x] `src/application/dataSource.ts` og de tre adapterne -- `listReviewQuestions` og `syncReviewQuestions`
- [x] `src/application/importChapter.ts` (+ ny `importChapter.reviewQuestions.test.ts`) -- steget, utskriften og matriseradene for import
- [x] `src/application/chapterOverview.ts`, `src/app/_screens/ChapterList.tsx` (+ `chapterOverview.test.ts`, `start/page.test.ts`) -- antallet
- [x] `src/adapters/supabase/rls.dev.test.ts` -- `review_questions`
- [x] `README.md` -- kort om gjennomgangsspørsmål i importen

**Acceptance Criteria:**
- Gitt migreringen, når den er kjørt mot `dev` og `npm run test:dev` kjøres, så kan eieren bare lese sine egne gjennomgangsspørsmål, og den innloggede brukeren kan ikke skrive dem.
- Gitt `npm run import -- --target dev` for IBE430 kapittel 1, når den kjøres to ganger, så har kapittelet 29 aktive spørsmål etter begge kjøringene, og kapittellisten viser «29 gjennomgangsspørsmål».
- Gitt koden, når den søkes gjennom, så kaller bare importen `syncReviewQuestions`.

## Implementation Notes

- Eieren gis som argument til `sync_review_questions` (`p_owner_id`), fordi importen kjører med service role uten `auth.uid()`. Bare `service_role` kan kalle funksjonen.
- Den normaliserte teksten regnes ut i appen med `normalizeReviewQuestion` og lagres, så domenet og databasen aldri er uenige.
- Valg utenfor specen: en seksjon uten spørsmål trekker tilbake alle lagrede, teksten oppdateres til filens skrivemåte når bare store/små bokstaver eller mellomrom er endret (samme ID), og kapittellisten gjør ett kall per kapittel.
- Migreringen `20261127120000_review_questions.sql` er kjørt mot `dev` (27.11.2026). Etter review kom `20261127130000_review_questions_sync_guard.sql` med vern i funksjonen, også kjørt mot `dev`.
- `reviewQuestions.dev.test.ts` kjører den ekte SQL-funksjonen med service role. `SUPABASE_SERVICE_ROLE_KEY` er tom i `.env.local`, så testen leser nøkkelen fra `.env.dev.local` (samme dev-prosjekt) når den mangler der.

## Spec Change Log

## Review Triage Log

| # | Kilde | Funn | Vurdering | Begrunnelse | Rute |
|---|---|---|---|---|---|
| 1 | blind, edge | `p_questions` som SQL NULL trekker tilbake alle, og et element uten `normalized_text` gjør `NOT IN` null | low | Adapteren sender alltid en liste med begge feltene, men vernet er en direkte rettelse | patch |
| 2 | blind | Ny kjøring oppdaterer alle rader og flytter `updated_at` | low | Stemmer (oppdateringen har ingen `is distinct from`). En linje i SQL | patch |
| 3 | blind | Ingen Unicode-normalisering (NFC) | low | Stemmer for innlimt tekst. `.normalize("NFC")` er en direkte rettelse | patch |
| 4 | blind, edge | «1.Hva?» uten mellomrom starter ikke et spørsmål | low | `NUMBERED` krever mellomrom, men intensjonen sier «heltall og punktum» | patch |
| 5 | verifisering | SQL-kroppen i `sync_review_questions` kjøres ikke i noen test | high | Forhåndsverifisert. Den ekte importen mot `dev` dekket bare første kjøring og uendret | patch |
| 6 | blind, edge | Flytting eller endret skrivemåte rapporteres som «uendret» | low | Stemmer, men sjeldent, og rettelsen krever et nytt felt i `ReviewQuestionSync` | avvist |
| 7 | blind, edge | Importen stopper med `unavailable` når synkroniseringen feiler, etter at kapittelet er lagret | low | Matrisen sier «stopper som i dag». Importen er idempotent, så en ny kjøring retter det | avvist |
| 8 | blind | Nummererte linjer etter at lista slutter forsvinner uten varsel | low | Følger Martes valg («resten av seksjonen ignoreres»). Tilbaketrekkingen kan reverseres med samme ID | avvist |
| 9 | blind, edge | Hull i nummereringen, eller en fortsettelseslinje som starter med «2024.», fanges ikke | false | Regelen i intensjonen bruker bare «heltall og punktum», ikke rekkefølge | avvist |
| 10 | blind | Ingen unik indeks på aktiv `position` | low | RPC-en setter alle plasser fra filen i én transaksjon. Ingen skriver ellers | avvist |
| 11 | blind | Ett kall per kapittel og fulle rader for å telle | low | Fem kapitler. Signaturen i specen | avvist |
| 12 | blind | Feil ved lesing av spørsmålene gir feil for hele kapittellisten | low | Samme mønster som for de andre lesningene i `listChapterOverview` | avvist |
| 13 | blind, edge | Tilbaketrukne spørsmål sorteres ulikt i Supabase og i minnet | low | Ingen bruker rekkefølgen på tilbaketrukne ennå | avvist |
| 14 | blind | Anon-kall til RPC-en og `.order` er ikke testet | low | Anon har `revoke execute`, og funn 5 dekker oppførselen | avvist |
| 15 | blind | Feilene i notatfila kommer ikke i linjerekkefølge | low | Kosmetisk | avvist |
| 16 | blind | Specen og sprint-status mangler i diffen | false | De ble holdt utenfor diffen med vilje. `implementation-artifacts` er ikke kode | avvist |
| 17 | edge | Kodeblokk eller `###` inne i seksjonen | low | Finnes ikke i notatfilene. Rettelsen krever nye grener | avvist |
| 18 | blind | Databasen stoler på `normalized_text` fra klienten | low | Bare importen med service role skriver. Et valg i implementasjonen | avvist |

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint` og `npm test` -- passerer
- `npm run test:dev` -- passerer etter at migreringen er kjørt mot `dev`

**Manual checks (if no CLI):**
- `npm run dev` mot `dev`: kapittellisten viser antallet for kapittel 1–5, og det er ingen sidelengs rulling ved 375 px.
