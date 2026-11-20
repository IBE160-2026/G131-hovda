---
title: 'Story 1.6a: Importen legger inn spørsmålsbanken fra innholdsfila'
type: 'feature'
created: '2026-11-20'
status: 'done'
route: 'dispatch'
baseline_commit: '94451903c60f42899f98d6a7edb69625d47e4dd6'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Delkapitlene har sammendrag, men ingen spørsmålsbank, så ingen kan bli «klart» etter AD-8 og quizen i 1.7 har ingenting å trekke fra (FR-13, AD-6, AD-14).

**Approach:** Innholdsfila får seksjonen `## Quizspørsmål` med temaliste og 20 flervalgsspørsmål per delkapittel, laget i Claude Code etter en ny instruksjon `innhold.v2`. Importen tolker også `## Spørsmålsbank` i notatfila, validerer alt før den skriver, og lagrer temaer, spørsmål og en bankversjon. Kapittellisten sier «klart» bare når både sammendrag og bank er klare.

## Boundaries & Constraints

**Always:**
- Per delkapittel med notater i `## Quizspørsmål`: `inputHash`, en temaliste (unike navn), nøyaktig 20 spørsmål totalt (brukerens egne regnes med), hvert med fire alternativer, nøyaktig ett riktig, ikke-tom forklaring og ett tema fra listen. Hvert tema har minst 2 spørsmål. Samme spørsmålstekst kan ikke stå to ganger i delkapittelet.
- `## Spørsmålsbank` i notatfila (tabell `#`, `Delkapittel`, `Spørsmål`, `Fasit`): hvert spørsmål som ikke er hoppet over, må stå nøyaktig én gang i innholdsfila for sitt delkapittel, merket med kildenummeret. Det riktige alternativet er lik fasiten. Er fasiten «Ja» eller «Nei», er spørsmålet omskrevet, og originalteksten må stå med og lagres.
- Spørsmål hoppes over når nummeret står i den fete starten av et punkt under «**Må avklares før bruk:**» (for eksempel «**Spørsmål 4 og 7**»). Tall ellers i punktteksten teller ikke. Importen skriver ut hvilke som ble hoppet over. En henvisning i innholdsfila til et hoppet-over eller ukjent nummer er en feil.
- `## Spørsmålsbank` inngår ikke i notattekst eller `inputHash`. Én instruksjonsversjon for hele fila: `CONTENT_INSTRUCTION_VERSION` blir `innhold.v2`.
- Er noe ugyldig i en av filene, skrives ingenting, og alle feilene listes med linjenummer.
- Bankversjonen har status (`lages` → `klart`, `feilet` bare hvis lagringen feiler underveis), `model_id`, `prompt_version` og `input_hash`. Spørsmål har stabil ID og status og slettes aldri. Temaer er egne rader per delkapittel.
- Status i kapittellisten: «mangler notater», så «mangler innhold» (sammendrag eller bank mangler klar versjon), så «utdatert» (en av dem har annen hash enn nå), ellers «klart». Lesesiden og merknaden der gjelder fortsatt bare sammendraget.
- Ny migrering kjøres mot `dev` før `prod`, med RLS, `GRANT` og eier-FK som i `summary_versions`.

**Beslutninger (Marte, 20.11.2026):**
- Story 1.6 deles. 1.6a er dette. Endringshåndtering (utdatert bank, tilbaketrekking, påfylling, «færre enn 10 ubesvarte») og innhold og prod-import for kapittel 2–5 er utsatt.
- `innhold.v2` gjelder hele innholdsfila. Sammendragene i kapittel 1 får ny hash med samme tekst i denne storyen.
- 20 spørsmål totalt per delkapittel, brukerens egne medregnet.
- Etter review: lenken til lesesiden følger bare sammendraget. Et delkapittel med klart sammendrag uten bank viser «mangler innhold», men lenker til lesesiden.
- Etter review: «skrives ingenting for det delkapittelet» under Never gjelder banken. Et endret sammendrag lagres som før.

**Never:**
- Ingen erstatning, påfylling eller tilbaketrekking av spørsmål. Finnes en klar bank og fila har en annen bank, skrives ingenting for det delkapittelet (kode 1).
- Ingen quiz, økt eller avkrysning. Ingen KI-pakker.
- Ikke kjøre migrering, import eller deploy mot `prod` uten at Marte har sagt ja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Første import | Gyldig bank, gjeldende hash, ingen klar bank | Temaer, 20 spørsmål og klar versjon. «spørsmålsbank lagt inn» | N/A |
| Uendret | Samme hash og samme innhold som klar bank | «spørsmålsbank uendret», ingenting skrives | N/A |
| Endret | Klar bank finnes, fila har annet innhold eller ny gjeldende hash | «spørsmålsbanken er endret, erstatning kommer senere», ingenting skrives | Kode 1 |
| Utdatert | Hashen i fila er ikke notatets hash nå | «spørsmålsbank utdatert», ingenting skrives | Kode 1 |
| Mangler | Ingen bank i fila for delkapittelet | «mangler innhold» | Kode 0 |
| Ugyldig | 3 alternativer, to riktige, tema utenfor lista, tema med 1 spørsmål, 19 spørsmål, manglende eget spørsmål, feil fasit | Alle feil med linjenummer | Ingenting skrives, kode 1 |
| Hoppet over | Nr. under «Må avklares før bruk» | Ikke med, nummeret skrives ut | N/A |
| Ja/Nei | Fasit «Ja.» | Omskrevet, original lagret | Mangler `Original:` → feil |
| Lagringsfeil | Feil etter at versjonen er opprettet | Versjonen settes til `feilet`, tidligere klare røres ikke | Kode 1 |

</frozen-after-approval>

## Code Map

- `src/domain/contentFile.ts` (+ test) -- legg til `## Quizspørsmål` i samme løkke (seksjoner, `###`, kodeblokker, `Linje n:`). `CONTENT_INSTRUCTION_VERSION` → `innhold.v2`. `ContentFile` får `questionBanks`.
- `src/domain/notesFile.ts` (+ test) -- les `## Spørsmålsbank` (tabell og «Må avklares før bruk») til `ownQuestions` og `skipped`, utenfor `chapter`, så hash og notattekst er uendret.
- Ny `src/domain/questionBank.ts` (+ test) -- regler (20, 4, 1, tema ≥ 2, Ja/Nei), sammenligning av fasit (trim, mellomrom), og kanonisk innhold for `contentHash`.
- `src/domain/summary.ts` -- `subchapterStatus` tar også bankens hash.
- `src/application/importChapter.ts` (+ tester) -- `createSummaries` er mønsteret. Ny `createQuestionBanks` med samme `allUnavailable`-mønster. `describeImport`, `reportImport`, `importExitCode`, `importMessages` utvides.
- `src/application/summaryHash.ts` -- `sha256Hex` trekkes ut og brukes også til `contentHash`.
- `src/application/chapterOverview.ts` (+ test) -- hent banker med ett kall i tillegg til sammendragene.
- `src/application/dataSource.ts`, `testing/MemoryDataSource.ts`, `src/adapters/supabase/dataSource.ts` (+ test) -- `listQuestionBanks(subchapterIds)` (siste klare versjon per delkapittel) og `addQuestionBank(bank)` (versjon `lages`, temaer, spørsmål, så `klart`, eller `feilet`). `listSummaryVersions`/`addSummaryVersion` er mønsteret.
- Ny `supabase/migrations/<ts>_question_banks.sql` -- `question_bank_versions`, `themes`, `quiz_questions`. Kopier `summary_versions.sql` for RLS, `GRANT`, `service_role` og sammensatt FK `(owner_id, subchapter_id)`.
- `src/adapters/supabase/rls.dev.test.ts` -- de nye tabellene.
- `src/app/(innlogget)/start/page.test.ts` -- mock trenger `listQuestionBanks`.
- `scripts/import.ts` -- skriv ut hoppede spørsmål. `scripts/contentHashes.ts` uendret.
- `G131-hovda/notater/_instruksjoner/innhold.v2.md` -- ny (v1 beholdes som historikk).
- `G131-hovda/notater/IBE430/kapittel-1.innhold.md` -- ny hash for sammendragene og `## Quizspørsmål` for 1.1–1.6. Hoppes over: 2, 4, 6, 7, 8. Egne: 1 (1.1), 3 (1.6), 5 (1.2).

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/notesFile.ts` + test -- tabellen og hoppede numre
- [x] `src/domain/questionBank.ts`, `src/domain/contentFile.ts` + tester -- tolking og validering etter matrisen
- [x] `supabase/migrations/…_question_banks.sql` -- tabellene. Push mot `dev`
- [x] `src/application/dataSource.ts`, `MemoryDataSource.ts`, Supabase-adapter + tester -- de to metodene
- [x] `src/application/importChapter.ts` + tester -- utfallene i matrisen
- [x] `src/domain/summary.ts`, `src/application/chapterOverview.ts`, `start/page.test.ts` -- samlet status
- [x] `scripts/import.ts` -- utskrift av hoppede spørsmål
- [x] `innhold.v2.md`, `kapittel-1.innhold.md`, `README.md` -- instruksjon, innhold for kapittel 1, arbeidsflyt
- [x] `rls.dev.test.ts` -- RLS for de nye tabellene

**Acceptance Criteria:**
- Given `kapittel-1.innhold.md`, when `npm run import -- --target dev IBE430 1` kjøres to ganger, then gir første seks «sammendrag lagt inn» og seks «spørsmålsbank lagt inn», og andre bare «uendret», kode 0.
- Given importen mot `dev`, when eieren åpner startsiden, then har 1.1–1.6 «klart».
- Given at en klar bank finnes, when en ugyldig innholdsfil importeres, then er banken uendret og fortsatt klar.

## Design Notes

Golden example under `## Quizspørsmål`:

```markdown
### 1.1 Tittel
<!-- inputHash: 64 hex-tegn -->
Temaer:
- Forretningsprosess
- Kjerneprosesser

#### Hva er en forretningsprosess?
- [ ] Gal 1
- [x] Riktig
- [ ] Gal 2
- [ ] Gal 3
Forklaring: …
Tema: Forretningsprosess
Kilde: spørsmålsbank 1
Original: (bare for omskrevne Ja/Nei-spørsmål)
```

`contentHash` = SHA-256 av kanonisk JSON (temaer og spørsmål i filrekkefølge) lagres på versjonen, så «uendret» kan avgjøres uten å lese spørsmålene. `lages` → `klart` er én `update` på versjonen. PostgREST har ikke transaksjoner, så delvis lagring ender som `feilet` og leses aldri.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` -- expected: ingen feil
- `npx supabase db push --remote` mot `dev` -- expected: migreringen kjører
- `npm run import -- --target dev IBE430 1` to ganger -- expected: som første AC
- `npm run test:dev` -- expected: passerer

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Lag | Funn | Dom | Rute | Bevis |
|---|-----|------|-----|------|-------|
| 1 | blind | Lenken til lesesiden forsvinner når bare banken mangler | medium | intent_gap → besluttet | `canRead` brukte samlet status. Marte valgte at lenken følger sammendraget. Rettet med `summaryStatus` og test. |
| 2 | edge | Endret bank: sammendraget lagres likevel, mens Never sier «skrives ingenting for det delkapittelet» | low | intent_gap → besluttet | Marte valgte at Never gjelder banken. Ingen kodeendring. |
| 3 | verif | Instruksjonssjekken for banker er utestet | low | patch | Ingen banktest med annen `instruksjon`. Test lagt til. |
| 4 | verif | «Alt er uendret» testes aldri som fraværende når bare banken endres | low | patch | Assertion lagt til i «endret»- og retry-testen. |
| 5 | verif, blind | RLS for insert i `quiz_questions` er utestet | low | patch | Insert med annen eier → 42501 lagt til i `rls.dev.test.ts`, kjørt grønt mot dev. |
| 6 | blind, edge | Alle tall i den fete starten teller, også «1.2» | low | patch | `**Spørsmål 3 (1.6)**` ga 1 og 6. Nå fjernes `n.m` først. Test lagt til. |
| 7 | edge | Innrykket fortsettelseslinje avslutter «Må avklares»-listen | low | patch | Én linje: innrykkede linjer holder listen åpen. Test lagt til. |
| 8 | blind | Like alternativer i et spørsmål godtas | low | patch | Ny regel «to alternativer er like» med test. Den ekte fila består. |
| 9 | blind | Feiltekst i `MemoryDataSource` er ulik adapterens | low | patch | Teksten er nå lik. |
| 10 | blind | Prod viser feilmelding hvis koden deployes før migreringen | medium | patch | `listChapterOverview` gir `unavailable` uten tabellene. README sier nå at migreringen kjøres mot prod før merge til `main`. |
| 11 | blind | `--force` gjelder ikke banker, og dokumentasjonen sier det ikke | low | patch | Én setning i README. |
| 12 | blind | Instruksjonens steg 4 lover at ny hash løser det, men det gir «endret» og kode 1 | low | patch | Steg 4 i `innhold.v2.md` forklarer nå kode 1 til 1.6b. |
| 13 | blind, edge | `listQuestionBanks` kan avkortes av PostgREST max-rows | maybe-false (medium if true) | defer | Samme mønster som `listSummaryVersions`, som allerede er ført opp. Ført opp for bankene. |
| 14 | blind, edge | Eget spørsmål ignoreres stille når delkapittelet mangler bank eller notater | low | reject | Mangler banken, er utfallet «mangler» (matrisen). Kommer banken, kreves spørsmålet. Spørsmål til delkapitler uten notater er usannsynlig og krever en ny guard. |
| 15 | blind | Spørsmål kan peke på tema/versjon i et annet delkapittel | low | reject | Bare importen skriver, alltid med samme `subchapterId`. Fiksen er nye sammensatte nøkler i ny migrering. |
| 16 | blind | Ingen `unique (bank_version_id, position)` | low | reject | Importen skriver `i + 1` i én insert. Usannsynlig, krever ny migrering. |
| 17 | blind | Temaer knyttes ikke til versjon og hoper seg opp | false | reject | AD-14: temaer er egne enheter per delkapittel og gjenbrukes ved påfylling. |
| 18 | blind | Linjen om hoppede spørsmål skrives ved hver kjøring | low | reject | Matrisen sier at numrene skrives ut. Ufarlig. |
| 19 | blind | Matrisens «Mangler»-rad sier «mangler innhold», koden sier «mangler spørsmålsbank» når sammendraget finnes | low | reject | Fiksen er å endre specen. |
| 20 | edge | Hoppet spørsmål med tom fasit eller ukjent delkapittel blokkerer importen | low | reject | Usannsynlig i de ekte filene, fiksen krever omordning av valideringen. |
| 21 | edge | Escapet `\|` i en celle gir feil kolonneantall | low | reject | Ingen celler i notatfilene har pipe-tegn. Fiksen er en ny parser. |
| 22 | edge | Ny tabell eller kodeblokk i `## Spørsmålsbank` | low | reject | Ikke i noen notatfil. Ny guard. |
| 23 | edge | Tom `readyInputHashes` gir «klart» | false | reject | Begge kallere sender alltid 1 eller 2 elementer. |
| 24 | edge | To samtidige importer kan lage to klare banker | low | reject | Importen kjøres manuelt av én eier. Fiksen er en delvis unik indeks. |
| 25 | edge | Parsefeil i en bank skjuler regelfeilene til neste kjøring | low | reject | Samme bevisste mønster som i 1.5a (#26). Feilene vises ved neste kjøring. |
| 26 | edge | `on delete cascade` og DELETE-grant motsier «slettes aldri» | false | reject | AD-10 krever cascade fra eier/delkapittel. «Slettes aldri» gjelder importen, som bare oppdaterer status. |
