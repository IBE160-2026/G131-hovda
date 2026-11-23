---
title: 'Story 2.1: Eieren lager demodata med én kommando'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_commit: 'ed99d36f08acdade4cb4ae97bb9e5675052ac643'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Demoen (2.2 og 2.3) trenger frosne demofiler med IBE430-innholdet, men det finnes verken skjema, filer eller en kommando som lager dem (FR-26, AD-3, NFR-4, NFR-6, NFR-8).

**Approach:** Et skjema for demofilene i `src/application` og et brukstilfelle som bygger demodataene fra en `DataSource`. `npm run export-demo` kjører det mot `prod`, validerer mot skjemaet og skriver `demo-data/demo.json`. En test i CI validerer fila som ligger i repoet.

## Boundaries & Constraints

**Always:**
- Innhold: emnet IBE430 (kode, navn, læringsutbytte, eksamensform), kapittel 1–4 som finnes (nummer, tittel) og de klare delkapitlene (nummer, tittel, teksten i siste klare sammendrag, de aktive spørsmålene i siste klare bank med tema, fire alternativer, riktig indeks og forklaring).
- Bare delkapitler med status `klart` i `listChapterOverview` tas med (Martes valg 23.11.2026). Det samme gjelder et delkapittel med færre enn 20 aktive spørsmål eller et tema med færre enn 2 (NFR-8). Utskriften lister hvert delkapittel som hoppes over, med årsak. Kapitler uten klare delkapitler tas ikke med.
- Skjemaet godtar ikke ukjente felt. Fila har ingen e-post, bruker-ID, database-ID-er, notater, læringsmål, nøkkelbegreper, hasher, tidspunkter, svar, framdrift eller rapporter. ID-ene lages av strukturen: `demo-ibe430`, `demo-1.2`, `demo-1.2-q01`, `demo-1.2-t1` (tema i rekkefølgen de først brukes).
- Rekkefølgen følger kapittel, delkapittel og banken. JSON med to mellomrom og linjeskift til slutt, så samme innhold gir samme fil.
- Valideringen kjøres før noe skrives. Ugyldige data, ingen klare delkapitler, manglende emne eller databasefeil gir kode 1, en norsk melding og ingen endring i `demo-data/`.
- `export-demo` leser alltid fra `prod`, uten `--target` og uten bekreftelse, fordi den bare leser (regelen om at `export-demo` alltid leser fra `prod`, går foran den generelle regelen om `--target`). Skriptet bruker `getDataSourceForScript("prod")` og `.env.prod.local`.
- `src/application` bruker ingen serverkode. Bare `scripts/export-demo.ts` skriver fila.

**Never:**
- Ingen demo-adapter, `DemoClock`, skjermer eller ruter (2.2 og 2.3).
- Ingen nye metoder i `DataSource`, ingen migreringer og ingen skriving til databasen.
- Eksporten kjøres aldri automatisk (ikke i `build`, `postinstall` eller CI).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Vanlig eksport | `prod` med kapittel 1 (alle klare) og 2 (2.1 klar, 2.2 og 2.4 «mangler innhold») | `demo.json` med 1.1–1.6 og 2.1. Utskriften lister 2.2 og 2.4 med årsak og antall delkapitler som er skrevet | Kode 0 |
| Tilbaketrukket spørsmål | Delkapittel med 19 aktive spørsmål | Hoppes over: «færre enn 20 spørsmål» | Kode 0 |
| Tema med ett spørsmål | Ett tema har bare 1 aktivt spørsmål | Hoppes over: «temaet har færre enn 2 spørsmål» | Kode 0 |
| Ingen klare delkapitler | Ingenting er klart | Ingen fil skrives | Kode 1 og melding |
| Emnet mangler | Ikke noe IBE430 hos eieren | Ingen fil skrives | Kode 1 og melding |
| Databasefeil | `unavailable` fra datakilden | Ingen fil skrives | Kode 1 og melding |
| Ny kjøring | Samme innhold i `prod` | Fila er byte for byte lik | N/A |

</frozen-after-approval>

## Code Map

- `src/application/dataSource.ts` -- porten. Bruk `listCourses`, `listChapters`, `listSummaryVersions` (`latestReady.text`) og `listQuizBank` (bare aktive spørsmål i siste klare bank). `QuizQuestion` har `themeId`, men ikke temanavn. Quizen viser aldri navnet, så demoen bruker bare sine egne tema-ID-er. Ikke endre porten.
- `src/application/chapterOverview.ts` -- `listChapterOverview` gir statusen (`klart` krever klar sammendrags- og bankversjon med dagens hash). Gjenbruk den, ikke regn ut status på nytt.
- `src/application/testing/MemoryDataSource.ts` -- for enhetstestene. Se `importChapter.questionBanks.test.ts` for hvordan banker og spørsmål legges inn.
- `src/composition/script.ts` -- `getDataSourceForScript(target)`. Ikke endre.
- `scripts/import.ts` -- mønster for `main()`, kode og norske meldinger.
- `eslint.config.mjs` -- `src/application` kan ikke importere `node:*`. Testen som leser fila, ligger derfor i `scripts/`.
- `demo-data/.gitkeep` -- mappa finnes. Fjern `.gitkeep` når `demo.json` er lagt inn.

## Tasks & Acceptance

**Execution:**
- [x] `src/application/demoData.ts` -- typer (`DemoData` med `schemaVersion: 1`), `validateDemoData(unknown)` med norske feil og stien til feltet, og `buildDemoData(data, courseCode)` som gir data og hoppede delkapitler med årsak, eller en feil -- felles skjema for eksporten og demo-adapteren (AD-3)
- [x] `src/application/demoData.test.ts` -- radene i matrisen med `MemoryDataSource`, at ukjente felt og ugyldige verdier avvises, kapittel 5 tas ikke med, og sorteringen
- [x] `scripts/export-demo.ts` -- leser fra `prod`, bygger, validerer, skriver `demo-data/demo.json` og skriver ut hoppede delkapitler -- kommandoen
- [x] `package.json` -- `"export-demo": "tsx scripts/export-demo.ts"`
- [x] `scripts/demoFiles.test.ts` -- leser `demo-data/demo.json`, validerer den, sjekker NFR-8 og at ingen tekst ligner en e-post eller UUID -- CI-testen
- [x] `README.md` -- avsnitt om `npm run export-demo` under importen
- [x] `demo-data/demo.json` -- lages ved å kjøre `npm run export-demo` mot `prod` (bare lesing). Fjern `.gitkeep`

**Acceptance Criteria:**
- Gitt `demo-data/demo.json` i repoet, når `npm test` kjører i CI, så feiler testen hvis et delkapittel har færre enn 20 spørsmål, et tema færre enn 2, eller fila ikke følger skjemaet.
- Gitt at notatene eller innholdet endres, når ingen kjører `npm run export-demo`, så endres `demo-data/` ikke.
- Gitt den eksporterte fila, når den leses, så har den ingen e-post, ID fra databasen, notater, svar eller framdrift.

## Design Notes

Fila har ingen notater eller hasher, så 2.2 kan ikke regne status med `listChapterOverview` som i appen. Alt i fila er `klart`, og hvordan demoen viser status, avgjøres i 2.2.

Form (forkortet):

```json
{ "schemaVersion": 1,
  "course": { "id": "demo-ibe430", "code": "IBE430", "name": "…", "learningOutcomes": "…", "examForm": "…" },
  "chapters": [{ "number": 1, "title": "…", "subchapters": [{ "id": "demo-1.1", "number": "1.1", "title": "…",
    "summary": "…", "themes": [{ "id": "demo-1.1-t1" }],
    "questions": [{ "id": "demo-1.1-q01", "themeId": "demo-1.1-t1", "question": "…", "options": ["…","…","…","…"], "correctIndex": 0, "explanation": "…" }] }] }] }
```

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test` -- ingen feil
- `npm run export-demo` -- kode 0. Kjørt to ganger gir det ingen endring i `git diff demo-data/`

## Implementation Notes

- `npm run export-demo` er kjørt mot `prod` to ganger: kode 0, 7 delkapitler (1.1–1.6, 2.1), 2.2 og 2.4 hoppet over («mangler innhold»), og den andre kjøringen ga samme SHA-256. I `prod` har IBE430 tomt læringsutbytte og eksamensformen «Muntlig», og det kopieres som det er.
- `demo-data/demo.json` var ikke med i diffen til reviewerne (generert, ca. 100 KB). CI-testen sjekker den.

## Spec Change Log

## Review Triage Log

Første review (blind, kanttilfeller, verifikasjon), 25 funn. Funn som er like fra flere reviewere, står på samme rad (22 rader): 5 rettet (patch) og 17 avvist.

| # | Kilde | Funn | Verdict | Begrunnelse | Rute |
|---|-------|------|---------|-------------|------|
| 1 | blind | `demo.json` mangler i diffen | false | Bevisst holdt utenfor reviewen (generert). CI-testen validerer fila, og innholdet er sjekket i Implementation Notes | avvist |
| 2 | blind, kant ×2 | `writeFileSync` direkte på målfila kan gi halv fil ved krasj | low | Skjer bare ved krasj eller full disk midt i skrivingen. Fila er i git, og CI-testen ville feilet. Rettingen er direkte (midlertidig fil og `renameSync`) | patch |
| 3 | blind | Ingen `.gitattributes` for linjeskift | false | Git normaliserer med `autocrlf`, så `git diff` viser ingen endring. Testen normaliserer bevisst | avvist |
| 4 | blind, kant, verif. | Skjemaet sjekker ikke rekkefølgen på delkapitler | low | Eksporten følger rekkefølgen fra `listChapters` (notatfila), og en ekstra sjekk kan avvise gyldige filer. Ingen skade i 2.2 | avvist |
| 5 | blind, kant, verif. | `validateDemoData` godtar kapittel utenfor 1–4. Bare CI-testen sjekker det | low | Demo-adapteren i 2.2 validerer bare med skjemaet. Rettingen er én linje | patch |
| 6 | blind, verif. | `export-demo` er ikke testet (argumenter, kode 1, ingen fil) | medium | Funnet er verifisert av verifikasjonslaget: ingen test kjører `main()`. Mønsteret finnes i `scripts/import.test.ts` | patch |
| 7 | verif. | `invalid`-grenen i `buildDemoData` er ikke testet | medium | Funnet er verifisert av verifikasjonslaget: å fjerne valideringen gir grønne tester | patch |
| 8 | blind | Ingen test for at eksporten ikke kjøres automatisk | low | Ingen script i `package.json` eller CI kaller den. Lite sannsynlig og ny test | avvist |
| 9 | blind | Service role-nøkkel for en jobb som bare leser | low | Samme mønster som importen (`getDataSourceForScript`, AD-1). Koden kaller bare lesemetoder | avvist |
| 10 | blind | Enhetstestene bruker de ekte notatfilene | low | Samme mønster som testene for importen. Er allerede et åpent punkt i `issues.md` | avvist |
| 11 | blind | CI-testen kaster `TypeError` før valideringen | false | Vitest rapporterer det som feil, og testen «følger skjemaet» feiler med lesbar melding samtidig | avvist |
| 12 | blind | Personverntesten ser bare etter e-post og UUID | low | Skjemaet avviser ukjente felt og krever ID-er laget av strukturen, så ingen database-ID kommer gjennom | avvist |
| 13 | blind | Årsaken for for få per tema nevner ikke temaet | low | Temaene har ikke navn i fila. Kosmetisk | avvist |
| 14 | blind | Validering to ganger med samme melding | low | Bevisst: valider det som faktisk skrives. Kosmetisk | avvist |
| 15 | blind | `epic-2-context.md` sier fortsatt at `--target` må avklares | low | Specen har avgjort det. Rettingen er direkte | patch (med #5–7) |
| 16 | blind | Status i spec og sprint-status er ulik | false | Normalt under review. Sprint-status oppdateres i steg 5 | avvist |
| 17 | blind | Testen av rekkefølge bruker `arrayContaining` | low | Feilene er sjekket. Kosmetisk | avvist |
| 18 | kant ×2 | `invalid` skriver ikke ut hoppede delkapitler | low | Grenen er bare mulig ved data som bryter skjemaet. Rettingen legger til et felt | avvist |
| 19 | kant | Import mellom lesingene kan gi blandede versjoner | low | Eieren kjører begge kommandoene selv. Lite sannsynlig | avvist |
| 20 | kant | `readFileSync` med relativ sti | low | `npm test` kjører alltid fra roten. Samme mønster som andre tester | avvist |
| 21 | kant | Felt med `undefined` slipper gjennom `text()` | low | Verdiene fra datakilden er typet tekst. Eksportens JSON-runde fanger det | avvist |
| 22 | verif. | `noSummary`-grenen er ikke testet | low | Kan bare nås med tom `latestReady.text`, som importen aldri lagrer | avvist |
