---
title: 'Story 1.5a v2: Importen legger inn sammendrag fra innholdsfila'
type: 'feature'
created: '2026-11-19'
status: 'ready-for-dev'
baseline_commit: 'f212cbd89f46d722018444a4c90831226dfe378e'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 1.5a er bygget med KI-kall mot Amazon Bedrock, men appen skal ikke bruke noen KI-leverandør (endringsforslaget 19.11.2026). Delkapitlene i IBE430 har derfor fortsatt ingen sammendrag (FR-8, FR-11).

**Approach:** Sammendragene lages på forhånd i Claude Code etter en versjonert instruksjon og skrives i `notater/<EMNE>/kapittel-<n>.innhold.md`. Importen tolker og validerer fila i `src/domain` og lagrer sammendragene som versjoner i `summary_versions`. Bedrock-koden fjernes.

## Boundaries & Constraints

**Always:**
- Appen og importen kaller aldri en KI-leverandør. Ingen KI-pakker i `package.json`, ingen AWS-nøkler (AD-7).
- Beholdes fra 1.5a: tabellen `summary_versions` (ingen ny migrering), `normalizeNote`, 600-ordsgrensen, `--force <n.m>`, `describeImport` med én linje per delkapittel og `reportImport`.
- `inputHash` = hash av normalisert notat + kapittelets læringsmål og nøkkelbegreper + instruksjonsversjon (`innhold.v1`). Innholdsfila oppgir hashen per delkapittel. Ulik hash betyr utdatert.
- Hele innholdsfila valideres før noe skrives, sammen med notatfila og før prod-bekreftelsen (AD-17-mønsteret). Feil gir norsk melding med linjenummer.
- Hver ny tekst gir en ny versjon med status `klart`, `model_id` og `prompt_version` fra fila. En tidligere klar versjon tas aldri bort (AD-8).
- Sammendragene for IBE430 kapittel 1 lages fra `kapittel-1.md` etter instruksjonen: norsk bokmål, høyst 600 ord, bare fra notatet, kort, ærlig og vennlig.

**Beslutninger (Marte, 19.11.2026):**
- Et utdatert sammendrag lagres ikke og gir kode 1. Et delkapittel uten sammendrag (eller en manglende innholdsfil) gir «mangler innhold» og kode 0.
- Specen beholdes hel (ett mål, over 1600 tokens).

**Never:**
- Ingen endringer i kapittellisten eller nye sider (1.5b). Ingen spørsmålsbank (1.6).
- Ikke kjøre importen mot `prod` uten at Marte har sagt ja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Første import | 1.1 har notat og sammendrag med riktig hash, ingen versjon | Ny versjon `klart`. Utskrift: «sammendrag lagt inn» | N/A |
| Uendret | Samme tekst og hash som siste klare versjon | Ingen ny versjon. «sammendrag uendret» | N/A |
| Rettet tekst | Samme hash, ny tekst | Ny `klart`-versjon | N/A |
| Utdatert | Hashen i fila er ulik notatets hash nå | Ingen ny versjon. «sammendrag utdatert» | Kode 1 |
| Mangler innhold | Delkapittel med notat, men ikke i fila (eller fila finnes ikke) | Ingen versjon. «mangler innhold» | Kode 0 |
| Force | `--force 1.2`, uendret | Ny versjon for 1.2 | 1.2 mangler i innholdsfila: norsk feil, kode 1, ingenting skrives |
| Ugyldig fil | Over 600 ord, tom tekst, ukjent delkapittel, delkapittel uten notat, dobbelt delkapittel, feil `emne`/`kapittel`, mangler `instruksjon`/`modell`, ugyldig hash, ukjent `##`-seksjon | Ingenting skrives, heller ikke kapitlene | Alle feilene listes, kode 1 |

</frozen-after-approval>

## Code Map

- `src/application/importChapter.ts` -- `prepareChapterImport`, `importChapter`, `createSummaries`, `describeImport`, `reportImport`, `importExitCode`, `importMessages`. Byttes fra `AiProvider` til innholdsfila. `summarizeSafely`, `allUnavailable`-mønsteret for databasefeil beholdes.
- `src/domain/notesFile.ts` -- mønster for tolking: frontmatter, `###`-overskrifter, kodeblokker, `Linje n:`-meldinger. Ny `src/domain/contentFile.ts` følger det.
- `src/domain/summary.ts` -- `normalizeNote`, `summaryHashSource` (`promptVersion` → instruksjonsversjon), `validateSummaryText`.
- `src/application/summaryHash.ts` -- `summaryInputHash` med global `crypto.subtle`.
- `src/application/dataSource.ts`, `testing/MemoryDataSource.ts`, `src/adapters/supabase/dataSource.ts` -- `listSummaryVersions`, `addSummaryVersion`. Uendret.
- `scripts/importArgs.ts` -- `notesFilePath`; ny `contentFilePath`. `scripts/import.ts` leser begge filene; prod-teksten om at KI koster penger fjernes.
- `src/composition/script.ts` (+ test) -- `getAiProviderForScript`, `AWS_REQUIRED` og Bedrock-importen fjernes. `readEnv` beholdes.
- Fjernes: `src/adapters/bedrock/` (hele mappa), `src/application/aiProvider.ts`, `src/application/importChapter.summaries.test.ts` skrives om.
- `package.json` -- fjern `@anthropic-ai/bedrock-sdk`, `@anthropic-ai/sdk`, `zod` (bare brukt i Bedrock-modulen). `eslint.config.mjs` -- forbudet mot KI-pakker beholdes.
- `README.md` (l. 59–62), `.env.example` (l. 7, 20–21) -- AWS og «KI koster penger» ut.
- `G131-hovda/notater/IBE430/kapittel-1.md` -- seks delkapitler med notater (1.1–1.6), læringsmål, nøkkelbegreper.

## Tasks & Acceptance

**Execution:**
- [ ] `src/adapters/bedrock/`, `src/application/aiProvider.ts`, `src/composition/script.ts` + test, `package.json` -- fjern Bedrock, porten, `getAiProviderForScript` og pakkene (`npm uninstall`)
- [ ] `src/domain/contentFile.ts` + test -- tolk og valider innholdsfila mot notatfilas delkapitler etter matrisen
- [ ] `src/domain/summary.ts` -- hash-grunnlaget bruker instruksjonsversjonen
- [ ] `src/application/importChapter.ts` + tester -- les sammendrag fra innholdsfila, utfall «lagt inn», «uendret», «utdatert», «mangler innhold»; koder etter matrisen
- [ ] `scripts/importArgs.ts`, `scripts/import.ts` + tester -- `contentFilePath`, les fila (mangler = ingen innhold), valider før prod-bekreftelsen
- [ ] `scripts/contentHashes.ts`, `package.json` -- `npm run innhold:hash -- IBE430 1` skriver `n.m <inputHash>` for delkapitler med notater, uten database
- [ ] `G131-hovda/notater/_instruksjoner/innhold.v1.md` -- instruksjonen for sammendrag: kontekst, regler, filformat
- [ ] `G131-hovda/notater/IBE430/kapittel-1.innhold.md` -- seks sammendrag laget etter instruksjonen, med hash fra `innhold:hash`
- [ ] `README.md`, `.env.example` -- beskriv innholdsfila og arbeidsflyten; AWS ut
- [ ] `ARCHITECTURE-SPINE.md` -- ingen endring (allerede oppdatert)

**Acceptance Criteria:**
- Given koden, when man søker etter `bedrock`, `AiProvider`, `@anthropic-ai` og `AWS_` i `src`, `scripts`, `package.json`, README og `.env.example`, then finnes ingen treff (utenom lint-forbudet).
- Given `kapittel-1.innhold.md`, when `npm run import -- --target dev IBE430 1` kjøres to ganger, then legger første kjøring inn seks sammendrag og andre gir «sammendrag uendret» for alle.
- Given et endret notat i en test, when importen kjøres, then sier den «sammendrag utdatert» og lagrer ingen ny versjon.

## Design Notes

Filformat (golden example):

```markdown
---
emne: IBE430
kapittel: 1
instruksjon: innhold.v1
modell: claude-code/claude-opus-5-5
---

## Sammendrag

### 1.1 Tittel som i notatfila
<!-- inputHash: 64 hex-tegn -->
Teksten …
```

Tittelen i `###` trenger ikke stemme med notatfila; nummeret er nøkkelen (AD-5). `instruksjon` i fila må være lik den importen kjenner (`innhold.v1`), ellers er alt utdatert.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` -- expected: ingen feil
- `npm run innhold:hash -- IBE430 1` -- expected: seks linjer, samme som i innholdsfila
- `npm run import -- --target dev IBE430 1` to ganger -- expected: seks «lagt inn», så seks «uendret», kode 0
- `npm run test:dev` -- expected: passerer
