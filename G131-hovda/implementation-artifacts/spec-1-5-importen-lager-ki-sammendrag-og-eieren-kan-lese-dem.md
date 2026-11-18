---
title: 'Story 1.5a: Importen lager KI-sammendrag'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: '4050989693e2f4b9a0939ae206bcebe4bc35487d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Delkapitlene i IBE430 har notater i databasen, men ingen sammendrag. Uten dem har eieren ingenting å lese om kvelden (FR-8, FR-11).

**Approach:** En ny KI-modul bak porten `AiProvider` lager et sammendrag per delkapittel med notater når importen kjøres. Sammendragene lagres som versjoner med status, og uendret innhold gir ingen nye KI-kall.

## Boundaries & Constraints

**Always:**
- Sammendraget er på norsk bokmål, høyst 600 ord og bare fra delkapittelets notat. Emnets læringsutbytte og kapittelets læringsmål og nøkkelbegreper sendes med som kontekst. Tonen er kort, ærlig og vennlig.
- `inputHash` = hash av normalisert notat + kapittelets læringsmål og nøkkelbegreper + promptversjon (AD-4). Uendret hash gir ingen KI-kall. `--force <n.m>` tvinger ny generering.
- Modell og effort per oppgave står i én innstillingsfil i `src/adapters/bedrock`, og effort settes eksplisitt. Prompten ligger i en versjonert fil. Svaret valideres mot et skjema før lagring, og modell-ID og promptversjon lagres (AD-7).
- Hver generering gir en ny versjon med status `klart` eller `feilet`. En feilet versjon tar aldri bort en klar, og importen fortsetter med neste delkapittel. Neste import prøver feilede på nytt (AD-8).
- Delkapitler uten notater (`hasNotes` false) og fjernede delkapitler får aldri KI-kall.
- Ny tabell med eier-FK og `on delete cascade`, RLS og `GRANT` (også `service_role`), via migrering, `dev` før `prod`.

**Beslutninger (Marte, 18.11.2026):**
- **Klient:** `AnthropicBedrockMantle` fra `@anthropic-ai/bedrock-sdk` med regionalt endepunkt i `eu-central-1`, så all behandling skjer i Frankfurt. Modell for sammendrag: `anthropic.claude-sonnet-5-5`. Det globale endepunktet brukes aldri. EU-regelen i testen erstatter `eu.`-prefikset i AD-7: modell-ID-ene starter med `anthropic.`, og regionen er `eu-central-1`. AD-7 får en merknad om endringen.
- **Bygges nå uten AWS.** All logikk testes med en falsk `AiProvider`. Det ekte KI-kallet verifiseres når AWS-kontoen, modelltilgangen og IAM-nøklene er klare, og storyen står på `review` til da.
- **Delt i to.** Status i kapittellisten og siden der eieren leser sammendraget er 1.5b.

**Never:**
- Ingen endringer i kapittellisten eller nye sider (1.5b). Ingen spørsmålsbank (1.6).
- Ingen KI-kall i automatiske tester.
- Ikke kjøre migreringen eller importen mot `prod` uten at Marte har sagt ja. Ingen AWS-nøkler går gjennom Claude.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Første import | 1.1 har notat, ingen versjon | KI-kall. Ny versjon `klart` med tekst, modell-ID, promptversjon og hash. Utskrift: «sammendrag laget» | N/A |
| Uendret | Samme notat og kontekst | Ingen KI-kall. Utskrift: «sammendrag uendret» | N/A |
| Endret notat | Notatet til 1.2 er endret | Ny `klart`-versjon for 1.2. Den gamle blir liggende | N/A |
| Endret kontekst | Læringsmål eller nøkkelbegreper er endret | Nye sammendrag for alle delkapitler med notater | N/A |
| Force | `--force 1.2`, uendret hash | Bare 1.2 lages på nytt | `--force 2.1` i kapittel 1: norsk feil, kode 1, ingenting skrives |
| Uten notater | `*Ingen notater ennå.*` | Ingen KI-kall og ingen versjon | N/A |
| KI feiler | Kallet feiler, eller svaret bryter skjemaet (tomt eller over 600 ord) | Ny versjon `feilet` med årsak. En tidligere `klart` står urørt. Importen fortsetter | Utskrift: «sammendrag feilet: <årsak>», kode 1 til slutt |
| Ny kjøring etter feil | Siste versjon er `feilet`, samme hash | Nytt KI-kall | N/A |
| AWS mangler | Ingen AWS-nøkler i env-fila | Kapitlene lagres som før. Ingen KI-kall | «Mangler AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY i .env.<target>.local. Sammendrag er ikke laget.», kode 1 |

</frozen-after-approval>

## Code Map

- `src/application/importChapter.ts` -- `importChapter`, `describeImport`. Sammendragene lages etter `saveChapter`, for aktive delkapitler.
- `src/application/dataSource.ts` -- porten `DataSource`. Får metoder for siste versjon og siste klare versjon per delkapittel og for ny versjon. `listChapters` gir id-ene til delkapitlene.
- `src/application/testing/MemoryDataSource.ts` -- utvides med sammendragsversjoner.
- `src/adapters/supabase/dataSource.ts` -- `guarded()`, filtrer alltid på `owner_id`.
- `src/composition/script.ts` -- `readEnv`, `REQUIRED`. Leser env-fila uten å laste den inn i `process.env`, så nøklene gis klienten direkte. Ny `getAiProviderForScript(target)`.
- `src/domain/hasNotes.ts` -- eneste regel for «har notater». `src/domain/course.ts` -- `learningOutcomes`.
- `scripts/importArgs.ts`, `scripts/import.ts` -- avviser i dag `--force` (testen i `importArgs.test.ts` må endres).
- `supabase/migrations/20261116230000_chapters.sql` -- mønster for sammensatt FK (`owner_id`, `id`), RLS, `GRANT` og `set_updated_at()`.
- `eslint.config.mjs` -- `src/application` og `src/domain` får ikke importere `crypto`, `node:*`, `@anthropic-ai/*` eller `@aws-sdk/*`. Bruk global `crypto.subtle`.
- `G131-hovda/planning-artifacts/architecture/architecture-G131-hovda-2026-10-08/ARCHITECTURE-SPINE.md` -- AD-7 (l. 80–84) får merknaden.
- `src/adapters/bedrock/` -- tom mappe.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- `@anthropic-ai/bedrock-sdk`, `@anthropic-ai/sdk` og `zod` med faste versjoner
- [x] `supabase/migrations/<tidsstempel>_summary_versions.sql` -- `summary_versions` (eier, `subchapter_id` FK med cascade via (`owner_id`, `subchapter_id`), `status` `lages`/`klart`/`feilet`, `text`, `model_id`, `prompt_version`, `input_hash`, `error`, tidsstempler), indeks på (`subchapter_id`, `created_at`), RLS og `GRANT` som `chapters`
- [x] `src/domain/summary.ts` + test -- normalisering av notatet, hash-grunnlaget, ordtelling og validering (ikke tom, høyst 600 ord)
- [x] `src/application/aiProvider.ts` -- porten `AiProvider.summarize(input)`: tekst, modell-ID og promptversjon, eller en årsak til feil
- [x] `src/application/dataSource.ts`, `MemoryDataSource.ts`, `src/adapters/supabase/dataSource.ts` + test -- lese siste versjon og siste klare versjon per delkapittel, og lagre en ny versjon. Filtrerer på eier
- [x] `src/application/importChapter.ts` + test -- lager sammendrag etter matrisen, og `describeImport` skriver én linje per delkapittel. Testene bruker en falsk `AiProvider`
- [x] `src/adapters/bedrock/settings.ts` + `settings.test.ts`, `prompts/summary.v1.ts`, `bedrockAiProvider.ts` -- innstillingene (modell og effort `medium`, region `eu-central-1`), testen av EU-regelen, en versjonert prompt, og en klient som validerer svaret mot et zod-skjema via strukturert utdata
- [x] `src/composition/script.ts` -- `getAiProviderForScript(target)` leser `AWS_ACCESS_KEY_ID` og `AWS_SECRET_ACCESS_KEY` fra `.env.<target>.local`
- [x] `scripts/importArgs.ts`, `scripts/import.ts` + tester -- `--force <n.m>` (må høre til kapittelet) og kode 1 når et sammendrag feilet eller AWS-nøklene mangler
- [x] `src/adapters/supabase/rls.dev.test.ts` -- testkontoen ser ingen fremmede rader i `summary_versions`
- [x] `ARCHITECTURE-SPINE.md` -- merknad under AD-7 om Mantle, `anthropic.`-prefiks og regionalt endepunkt i `eu-central-1` (beslutning 18.11.2026)
- [x] `.env.example`, `README.md` -- AWS-nøklene i `.env.dev.local`/`.env.prod.local`, `--force`, og at importen koster penger

**Acceptance Criteria:**
- Given innstillingsfilen, when en modell-ID ikke starter med `anthropic.` eller regionen ikke er `eu-central-1`, then feiler en enhetstest.
- Given migreringen, when den kjøres mot `dev`, then finnes `summary_versions` med FK, cascade, RLS og `GRANT`.
- Given AWS-nøkler i `.env.dev.local`, when `npm run import -- --target dev IBE430 1` kjøres to ganger, then lager første kjøring seks sammendrag og andre kjøring ingen KI-kall.

## Implementation Notes

- Migreringen `20261118120000_summary_versions.sql` er skrevet, men ikke kjørt mot `dev`: `npx supabase db push --remote` ble stoppet av tillatelsessjekken. Marte kjører den (lenket prosjekt er `studievenn-dev`). Til da feiler `npm run test:dev` på `summary_versions`.
- `DataSource` fikk `listSummaryVersions(ids)` (siste og siste klare per delkapittel) og `addSummaryVersion`. Hashen ligger i `src/application/summaryHash.ts` med global `crypto.subtle`, hash-grunnlaget i `src/domain/summary.ts`.
- Bare en siste versjon med status `klart` og samme hash hopper over KI-kallet. En feilet siste versjon prøves alltid på nytt.
- `--force` sjekkes to steder: `parseImportArgs` (må høre til kapittelet, før noe leses) og `prepareChapterImport` (må finnes i notatfilen, før prod-bekreftelsen).
- `describeImport` legger sammendragsstatus på samme linje som delkapittelet («1.1 En: uendret, sammendrag laget»). Delkapitler uten notater får «mangler notater».
- Klienten får region, endepunkt (`https://bedrock-mantle.eu-central-1.api.aws/anthropic`) og nøkler som konstruktørvalg, og `apiKey: null`, så verken `AWS_REGION`, `ANTHROPIC_BEDROCK_MANTLE_BASE_URL` eller `AWS_BEARER_TOKEN_BEDROCK` fra miljøet kan styre kallet. `AWS_REGION` er tatt ut av `.env.example`.
- Lint-regelen for `src/application` avviser nå også `@anthropic-ai/*` og `@aws-sdk/*`.
- Pakker: `@anthropic-ai/bedrock-sdk` 1.1.2, `@anthropic-ai/sdk` 1.10.0, `zod` 4.6.7.

## Spec Change Log

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | `--force n.m` for et delkapittel uten notater gjør ingenting og gir kode 0 (edge, blind, verification-gap) | low | patch | `prepareChapterImport` sjekker bare at nummeret finnes; `createSummaries` gir `noNotes`. Direkte sjekk med `hasNotes` |
| 2 | AWS-nøklene sjekkes etter prod-bekreftelsen (edge, blind) | low | patch | `getAiProviderForScript` kalles etter `ask`; eieren bekrefter et KI-kall som ikke skjer. Flytting av ett kall |
| 3 | `createMantleClient` kan kaste etter bekreftelsen (edge, blind) | false | reject | `settingsErrors` kjører på konstante innstillinger som `settings.test.ts` viser er gyldige; konstruktøren kaster ikke med gitte valg |
| 4 | Utskrift og kode i `main()` er utestet (verification-gap) | medium | patch | `return 0` eller fjernet `console.error(ai.error)` ville bestått alle tester |
| 5 | `allUnavailable`-greinene i `createSummaries` kjøres aldri i test (verification-gap) | medium | patch | `MemoryDataSource` kan ikke feile `listSummaryVersions` etter vellykket `saveChapter` |
| 6 | Testen av Mantle-klienten beviser ikke at env ikke kan flytte kallet (verification-gap) | medium | patch | SDK-en faller tilbake til samme URL fra regionen, så fjernet `baseURL` ville bestått |
| 7 | Avslag-testen sjekker ikke årsaken (blind) | low | patch | Bare `status` sjekkes; direkte tillegg |
| 8 | Etterstilte mellomrom i notatet gir ny hash og betalt nytt kall (edge) | low | patch | `normalizeNote` fjerner ikke mellomrom på slutten av linjer; én `replace` |
| 9 | README sier ny kjøring er gratis, men feilede prøves og koster hver gang (blind) | low | patch | AD-8 prøver feilede på nytt; teksten er feil mens noe feiler. Direkte rettelse |
| 10 | RLS-lesetesten for `summary_versions` består selv uten RLS når tabellen er tom (verification-gap, blind) | medium | defer | Ingen eierrader i `dev` før første import med KI; samme mønster som for kapitler |
| 11 | Hashen tar ikke med modell-ID eller emnets læringsutbytte (blind, verification-gap) | false | reject | Intensjonen definerer `inputHash` som notat + læringsmål + nøkkelbegreper + promptversjon; koden følger den. Nevnt for Marte som mulig endring av AD-4 |
| 12 | Siste `feilet` med gammel hash, mens siste `klart` har dagens hash, gir nytt kall (edge) | low | reject | Krever at notatet endres, feiler og endres tilbake; løsningen legger til en grein |
| 13 | `lages` med samme hash gir dobbel generering (edge) | false | reject | Ingen kode skriver `lages` i 1.5a |
| 14 | `listSummaryVersions` har ingen grense og kan kuttes ved PostgREST `max-rows` (edge, blind) | low | reject | Krever over 1000 versjoner for ett kapittels delkapitler; løsningen er mer enn en direkte rettelse |
| 15 | Ingen tiebreak på `created_at` (edge, blind) | false | reject | Versjoner for samme delkapittel skrives i egne kall med `now()` i mikrosekunder; lik tid er ikke nåbar fra importen |
| 16 | Samtidige importer gir doble kall (edge) | low | reject | Én eier kjører CLI-en manuelt; lås er utenfor en direkte rettelse |
| 17 | Migreringen gir `update`, men versjoner skal ikke endres (blind) | false | reject | `lages` → `klart` (1.5b) trenger `update`; policyen er eiers egen, som for `chapters` |
| 18 | Feiler en gjentatt feil, koster hver kjøring et kall (blind) | false | reject | Intensjonen sier at neste import prøver feilede på nytt; README-teksten rettes i #9 |
| 19 | Betalt sammendrag går tapt hvis lagringen feiler (blind) | low | reject | Sjelden (database nede midt i importen); løsningen legger til lagring utenfor databasen |
| 20 | Markdown-tegn telles som ord (blind) | low | reject | Prompten ber om høyst 600 ord, og normale sammendrag ligger langt under; ny telleregel er mer enn en rettelse |
| 21 | Prod-bekreftelsen sier ikke hvor mange kall som kommer (blind) | low | reject | Ny funksjon, ikke en feil |
| 22 | Kast fra KI lagres med `modelId: "ukjent"` (blind) | false | reject | `BedrockAiProvider.summarize` fanger alle feil selv, så `summarizeSafely` sin catch nås ikke med den ekte modulen |
| 23 | AD-7-regelen motsier merknaden under (blind) | false | reject | Intensjonen ba om en merknad, og merknaden sier at den erstatter `eu.`-regelen; `settings.test.ts` håndhever den nye |
| 24 | `failureReason` lagrer serverens melding (blind) | low | reject | Bedrock-feilmeldinger tar ikke med nøkler; kortes til 500 tegn |
| 25 | README mangler IAM-tilganger og rekkefølge for migrering (blind) | low | reject | Avhenger av AWS-oppsettet som ikke er klart; tas når det ekte kallet verifiseres |
| 26 | Kode 1 når AWS mangler selv om ingen delkapitler har notater (blind) | false | reject | Matrisen sier kode 1 når AWS-nøklene mangler |

## Design Notes

**Ingen `lages`-rader ennå.** Importen venter på KI-svaret før den skriver, så den lagrer bare `klart` eller `feilet`. Kolonnen tillater `lages`, slik at 1.5b kan vise «innhold lages» og senere bruk ikke krever ny migrering.

**Hash.** `crypto.subtle.digest("SHA-256", …)` er global i Node og nettleseren, så hashen kan ligge i `application` uten Node-import. Normalisering: trim, `\r\n` til `\n`, og bare én tom linje på rad.

**Klienten.** Sjekk i SDK-typene at `AnthropicBedrockMantle` med `awsRegion: "eu-central-1"` går mot det regionale endepunktet (`bedrock-mantle.eu-central-1.api.aws`), og gi nøklene som konstruktørvalg, ikke via `process.env`. Strukturert utdata: `messages.parse` med `zodOutputFormat` fra `@anthropic-ai/sdk/helpers/zod`.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test` -- expected: ingen feil
- `npm run build` -- expected: lykkes
- `npx supabase db push --remote` (dev) -- expected: migreringen kjøres uten feil
- `npm run test:dev` -- expected: RLS-testene passerer

**Manual checks (if no CLI):**
- Uten AWS-nøkler: importen av kapittel 1 mot `dev` lagrer kapitlene og sier at sammendrag ikke er laget (kode 1).
- Med AWS-nøkler (senere): seks sammendrag i `summary_versions`, og en ny kjøring gir «uendret».
