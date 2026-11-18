---
title: 'Story 1.5a: Importen lager KI-sammendrag'
type: 'feature'
created: '2026-11-18'
status: 'ready-for-dev'
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
- [ ] `package.json` -- `@anthropic-ai/bedrock-sdk`, `@anthropic-ai/sdk` og `zod` med faste versjoner
- [ ] `supabase/migrations/<tidsstempel>_summary_versions.sql` -- `summary_versions` (eier, `subchapter_id` FK med cascade via (`owner_id`, `subchapter_id`), `status` `lages`/`klart`/`feilet`, `text`, `model_id`, `prompt_version`, `input_hash`, `error`, tidsstempler), indeks på (`subchapter_id`, `created_at`), RLS og `GRANT` som `chapters`
- [ ] `src/domain/summary.ts` + test -- normalisering av notatet, hash-grunnlaget, ordtelling og validering (ikke tom, høyst 600 ord)
- [ ] `src/application/aiProvider.ts` -- porten `AiProvider.summarize(input)`: tekst, modell-ID og promptversjon, eller en årsak til feil
- [ ] `src/application/dataSource.ts`, `MemoryDataSource.ts`, `src/adapters/supabase/dataSource.ts` + test -- lese siste versjon og siste klare versjon per delkapittel, og lagre en ny versjon. Filtrerer på eier
- [ ] `src/application/importChapter.ts` + test -- lager sammendrag etter matrisen, og `describeImport` skriver én linje per delkapittel. Testene bruker en falsk `AiProvider`
- [ ] `src/adapters/bedrock/settings.ts` + `settings.test.ts`, `prompts/summary.v1.ts`, `bedrockAiProvider.ts` -- innstillingene (modell og effort `medium`, region `eu-central-1`), testen av EU-regelen, en versjonert prompt, og en klient som validerer svaret mot et zod-skjema via strukturert utdata
- [ ] `src/composition/script.ts` -- `getAiProviderForScript(target)` leser `AWS_ACCESS_KEY_ID` og `AWS_SECRET_ACCESS_KEY` fra `.env.<target>.local`
- [ ] `scripts/importArgs.ts`, `scripts/import.ts` + tester -- `--force <n.m>` (må høre til kapittelet) og kode 1 når et sammendrag feilet eller AWS-nøklene mangler
- [ ] `src/adapters/supabase/rls.dev.test.ts` -- testkontoen ser ingen fremmede rader i `summary_versions`
- [ ] `ARCHITECTURE-SPINE.md` -- merknad under AD-7 om Mantle, `anthropic.`-prefiks og regionalt endepunkt i `eu-central-1` (beslutning 18.11.2026)
- [ ] `.env.example`, `README.md` -- AWS-nøklene i `.env.dev.local`/`.env.prod.local`, `--force`, og at importen koster penger

**Acceptance Criteria:**
- Given innstillingsfilen, when en modell-ID ikke starter med `anthropic.` eller regionen ikke er `eu-central-1`, then feiler en enhetstest.
- Given migreringen, when den kjøres mot `dev`, then finnes `summary_versions` med FK, cascade, RLS og `GRANT`.
- Given AWS-nøkler i `.env.dev.local`, when `npm run import -- --target dev IBE430 1` kjøres to ganger, then lager første kjøring seks sammendrag og andre kjøring ingen KI-kall.

## Implementation Notes

## Spec Change Log

## Review Triage Log

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
