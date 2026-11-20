---
title: 'Sprint Change Proposal: KI-innhold lages på forhånd i Claude Code'
date: '2026-11-19'
status: 'godkjent'
approved: '2026-11-19'
trigger_story: '1.5a (spec-1-5-importen-lager-ki-sammendrag-og-eieren-kan-lese-dem.md)'
scope: 'moderat'
decided_by: 'Marte'
---

# Sprint Change Proposal: KI-innhold lages på forhånd i Claude Code

## 1. Problemet

**Utløser:** Story 1.5a. KI-modulen mot Amazon Bedrock er bygget (commit `a7a1c66`, gren `story-1-5a-ki-sammendrag`), men det ekte KI-kallet kan ikke verifiseres uten en AWS-konto med fakturering, modelltilgang i `eu-central-1` og IAM-nøkler. Det er heller ikke sikkert at Mantle-endepunktet i Frankfurt tilbyr modellen.

**Type:** Strategisk endring. Appen skal ikke publiseres, så det er ikke behov for drift med en KI-leverandør. Marte valgte 19.11.2026 at appen ikke skal kalle noen KI-leverandør mens den kjører (alternativ 2).

**Ny retning:** Alt KI-innhold lages på forhånd i Claude Code, fra notatene, og legges i en egen fil per kapittel: `notater/<EMNE>/kapittel-<n>.innhold.md`. Importen leser fila, validerer den og legger innholdet inn i databasen. Tilbakemelding på svar (FR-19) blir modellsvar og selvvurdering, og vurderingen etter økta (FR-21) regnes ut med vanlig kode.

**Bevis:**
- `.env.dev.local` har ingen AWS-nøkler, og begge importene 19.11 endte med «Sammendrag er ikke laget» (kode 1).
- Arkitekturens `reviews/review-verification.md` og `.memlog.md` peker på usikkerhet om Mantle-modeller i EU.
- PRD-en krever ikke AWS: NFR-4 krever data i EU/EØS og at KI-leverandøren ikke trener på dataene, og NFR-6 sier «helst null» kostnad.

## 2. Konsekvenser

### Epics og stories

| Story | Status | Konsekvens |
| --- | --- | --- |
| 1.5 (1.5a og 1.5b) | 1.5a på `review` | 1.5a lages på nytt: importen leser sammendrag fra innholdsfila. Bedrock-modulen fjernes. 1.5b er uendret |
| 1.6 Spørsmålsbanken | backlog | Spørsmålene (også gale alternativer til brukerens egne spørsmål) lages i Claude Code. Importen validerer og legger inn |
| 1.9 Feilrapport | backlog | Neste import lager ikke innholdet på nytt selv. Importen lister feilrapportert innhold, som rettes i innholdsfila |
| 2.2 Demo | backlog | Testen sjekker at demoen ikke importerer Supabase-adapteren (Bedrock-adapteren finnes ikke lenger) |
| 4.3 Tilbakemelding | backlog | Blir «modellsvar og selvvurdering». Ingen KI-kall fra appen |
| 4.5 KI-lagde gjennomgangsspørsmål | backlog | Lages i Claude Code og legges i innholdsfila |
| 4.6 Demo | backlog | Eksempeltilbakemeldingen blir modellsvaret |
| 5.1 Forklaringsspørsmål | backlog | Lages i Claude Code, med modellsvar |
| 5.2 Trening | backlog | Tilbakemelding som i den nye 4.3 |
| 5.3 Vurdering | backlog | Regnes ut med vanlig kode i `src/domain` fra quizresultater og selvvurderinger |
| 5.6 Demo | backlog | Eksempelvurderingen lages med samme regel |

Ingen epic blir overflødig, og rekkefølgen er uendret. Epic 4 får nytt navn: «Kapittelgjennomgang med modellsvar».

### Artefakter

- **PRD:** FR-8, FR-11, FR-12, FR-13, FR-16, FR-19, FR-21, FR-27, NFR-4, NFR-6, §1, §3 og §11 (åpent spørsmål 2).
- **Arkitektur:** AD-4, AD-7 (erstattes), AD-12, AD-18, stack, driftsdiagram, kildetre, konvensjoner og kart over krav.
- **UX:** Ingen egen UX-spesifikasjon. UX-4 (tone) gjelder modellsvar og vurdering.
- **Annet:** README, `.env.example`, `package.json` (fjerne `@anthropic-ai/*` og `zod` hvis ubrukt), spec 1.5a, `sprint-status.yaml`, `issues.md`.

### Teknisk

- **Beholdes fra 1.5a:** tabellen `summary_versions` (kjørt mot `dev`), versjonene og AD-8-reglene, `inputHash` og normaliseringen i `src/domain/summary.ts`, 600-ordsgrensen, `--force`-tolkingen, `describeImport` med status per delkapittel og `importExitCode`.
- **Fjernes:** `src/adapters/bedrock/`, porten `AiProvider`, `getAiProviderForScript`, AWS-nøklene og pakkene `@anthropic-ai/bedrock-sdk` og `@anthropic-ai/sdk`.
- **Nytt:** tolking av `kapittel-<n>.innhold.md` i `src/domain` (deterministisk, som `notesFile.ts`) og en versjonert instruksjon som Claude Code følger når innholdet lages.
- **Ingen ny migrering trengs for 1.5a.** `model_id` lagrer hvem som laget innholdet (for eksempel `claude-code/claude-opus-5-5`), og `prompt_version` lagrer instruksjonsversjonen.

## 3. Anbefalt vei

**Direkte justering med delvis tilbakerulling.** Stories og epics beholdes, og bare kilden til KI-innholdet byttes. Bedrock-delen av 1.5a rulles tilbake, mens resten beholdes.

- **Hvorfor:** Kjernen i appen (import, versjoner, quiz, plan) er uendret. Ingen kontoer, nøkler eller kostnader trengs, og alt kan testes lokalt. Ports and adapters gjorde byttet lite.
- **Avveining:** Appen kan ikke gi tilbakemelding på det brukeren selv skriver. Modellsvar og selvvurdering er en svakere form for tilbakemelding enn KI-svar, men trener fortsatt på å forklare. Innholdet må lages i Claude Code før importen, så et nytt kapittel krever ett steg til.
- **Vurdert og forkastet:** Anthropic API direkte (krever nøkkel og betaling, og behandling utenfor EU) og AWS som planlagt (tyngst oppsett, usikker modelltilgang).
- **Innsats:** Middels. 1.5a lages på nytt (mindre enn første gang), og planleggingsdokumentene oppdateres.
- **Risiko:** Lav. Den største risikoen er at innholdsfila og notatene glir fra hverandre. Det løses med `inputHash` (under).
- **Tidsplan:** Ingen forsinkelse av de andre storyene. 4.3 og 5.3 blir enklere.

## 4. Endringsforslag

### 4.1 PRD (`prds/prd-G131-hovda-2026-09-27/prd.md`)

**§1 Visjon**
- OLD: «Økta består av et KI-generert sammendrag av brukerens egne forelesningsnotater …»
- NEW: «Økta består av et sammendrag av brukerens egne forelesningsnotater, laget på forhånd med KI, …»

**§3 Ordliste, «Sammendrag» og «Tilbakemelding»**
- Sammendrag NEW: «Kort tekst om ett delkapittel, laget på forhånd med KI (Claude Code) fra notatene og knyttet til læringsutbyttet.»
- Tilbakemelding NEW: «Etter et skrevet svar ser brukeren et modellsvar med hovedpunktene og vurderer selv hvor godt svaret dekket dem.»

**FR-8 Importere notater fra notatfilene**
- OLD: «For nye eller endrede delkapitler lager importen sammendrag (FR-11), spørsmålsbank (FR-13) og forklaringsspørsmål (FR-17, FR-18) …» og «Feiler KI-genereringen, beholdes notatene …»
- NEW:
  - «KI-innholdet (sammendrag, quizspørsmål, forklaringsspørsmål og modellsvar) lages på forhånd i Claude Code og ligger i `notater/<EMNE>/kapittel-<n>.innhold.md`. Importen leser og validerer fila og legger innholdet inn. Appen kaller aldri en KI-leverandør.»
  - «Er notatet endret etter at innholdet ble laget, sier importen at innholdet er utdatert, og det lages på nytt i Claude Code.»
  - «Er innholdsfila ugyldig, skrives ingenting fra den, og tidligere innhold beholdes. Delkapittelet viser status: «mangler innhold», «klart» eller «utdatert».»

**FR-11 Vise sammendrag:** uendret, med tillegget «Sammendraget lages på forhånd i Claude Code (FR-8).»

**FR-12 Si fra om feil i sammendraget**
- OLD: «Sammendraget merkes og lages på nytt ved neste import (FR-8).»
- NEW: «Sammendraget merkes. Importen lister merkede sammendrag, som rettes i innholdsfila, og neste import legger inn den rettede versjonen. Til da vises det gamle.»

**FR-13 Lage spørsmålsbank:** «Appen lager» → «Spørsmålsbanken lages på forhånd i Claude Code.» Påfylling: «Når færre enn 10 spørsmål er ubesvart, sier importen fra, og nye spørsmål legges til i innholdsfila.»

**FR-16 Si fra om feil quizspørsmål:** «erstattes med et nytt om samme tema ved neste import» → «Importen lister det, og et nytt spørsmål om samme tema legges i innholdsfila.»

**FR-19 Svare og få tilbakemelding → Svare og se modellsvar**
- OLD: «Tilbakemeldingen er på norsk og sier hva som var bra og hva som manglet … Feiler KI-en, får brukeren beskjed …»
- NEW:
  - «Når svaret er lagret, ser brukeren modellsvaret: hovedpunktene et godt svar tar med, målt mot læringsutbyttet og notatene (for gjennomgangsspørsmål notatene i hele kapittelet).»
  - «Brukeren vurderer selv svaret sitt: «Fikk med det meste», «Fikk med noe» eller «Fikk med lite». Svaret og selvvurderingen lagres og brukes i vurderingen (FR-21).»
  - «Modellsvaret vises først når svaret er lagret, slik at brukeren svarer med egne ord.»

**FR-21 Vurdering etter hver økt**
- OLD: «Etter hver økt lager appen en vurdering … Feiler KI-en, beholdes forrige vurdering …»
- NEW: «Etter hver økt regner appen ut en vurdering med vanlig kode, fra quizresultatene per tema og selvvurderingene. Den er en eller to setninger på norsk etter faste maler, sier hva brukeren har god kontroll på før det som trenger mer arbeid, og sier hva den bygger på.» Kulepunktet om at KI-en feiler fjernes.

**FR-27, siste kulepunkt:** «lager KI-en 10 gjennomgangsspørsmål» → «lages 10 gjennomgangsspørsmål i Claude Code og legges i innholdsfila».

**NFR-4 Personvern**
- NEW: «Data lagres i EU/EØS. Appen sender ingen data til en KI-leverandør. KI-innholdet lages i Claude Code fra brukerens egne notater, og kontoen som brukes, skal ha bruk av data til trening slått av. Appen samler ikke inn flere personopplysninger enn e-post og det brukeren selv legger inn.»

**NFR-6 Kostnad**
- NEW: «Appen har ingen KI-kostnad i drift. Innholdet lages innenfor utviklerens eksisterende Claude-abonnement.»

**§11 Åpent spørsmål 2 (KI-leverandør):** markeres som avgjort 19.11.2026, med henvisning til dette forslaget.

### 4.2 Arkitektur (`ARCHITECTURE-SPINE.md`)

**AD-4: Notater kommer inn via en lokal importkommando, som også legger inn KI-innholdet**
- NEW Rule (endringene): «… For hvert delkapittel leser importen KI-innholdet fra `notater/<EMNE>/kapittel-<n>.innhold.md`. Innholdsfila har `inputHash` per delkapittel fra notatet den ble laget av. Er hashen ulik notatets hash nå, er innholdet utdatert, og importen sier fra. Påfylling og erstatning av feilrapportert innhold skjer i innholdsfila (AD-18). `--force <n.m>` legger inn innholdet for ett delkapittel på nytt.»

**AD-7 erstattes: KI-innhold lages utenfor appen, etter én versjonert instruksjon**
- **Prevents:** at appen er avhengig av en KI-leverandør, nøkler og kostnad i drift, og innhold der man ikke vet hvordan det ble laget.
- **Rule:** «Appen kaller aldri en KI-leverandør. KI-innhold lages i Claude Code etter en versjonert instruksjon i repoet (`G131-hovda/notater/_instruksjoner/innhold.v<n>.md`), som sier hva hver innholdstype skal inneholde (600 ord, fire alternativer og ett riktig, tema fra listen, modellsvar med hovedpunkter). Innholdsfila oppgir instruksjonsversjon og modell. Importen validerer hele fila mot et fast skjema i `src/domain` før den skriver noe, og lagrer modell og instruksjonsversjon på hver versjon. Emnets læringsutbytte og kapittelets læringsmål og nøkkelbegreper står i instruksjonen som kontekst.»
- Merknaden fra 18.11.2026 (Mantle) fjernes.

**AD-12:** «og KI» og setningen om Bedrocks EU-profil fjernes. Ny setning: «Appen gjør ingen KI-kall (AD-7).»

**AD-18 erstattes: Ingen KI-kall mens appen er i bruk**
- **Rule:** «Alt KI-innhold kommer fra innholdsfila via importen. Etter et skrevet svar viser appen modellsvaret og lagrer selvvurderingen (FR-19). Vurderingen (FR-21) regnes ut i `src/domain`. En feilrapport (FR-12, FR-16) merker eller trekker tilbake innholdet med en gang, og importen lister det som må rettes i innholdsfila.»

**Andre steder:**
- **Design Paradigm og diagram:** `bedrock/` og `BED` fjernes fra adapterlisten.
- **Stack:** de fem KI-radene (Bedrock, Opus/Sonnet/Haiku, Bedrock-klient) erstattes med «KI-innhold: Claude Code (utenfor appen), se AD-7».
- **Driftsdiagram:** «Amazon Bedrock» og pilene til den fjernes. `kapittel-n.innhold.md` legges til ved siden av `NOT`.
- **Kildetre:** `bedrock/` fjernes. `notater/` får `kapittel-<n>.innhold.md` og `_instruksjoner/`.
- **Konvensjoner:**
  - «Feil fra KI» → «Ugyldig innhold: hele innholdsfila avvises før noe skrives (AD-17-mønsteret)».
  - «Hemmeligheter»: «og AWS» fjernes.
  - «Eierskap»: «vurdering → `endSession` (regel i `src/domain`)».
- **Kart over krav:** `adapters/bedrock` → `src/domain` (tolking av innholdsfila). FR-19 og FR-21 → `domain`, `application`.
- **Åpne spørsmål 1 og 2 (Bedrock-pris, AWS-vilkår):** fjernes.

### 4.3 Epics (`epics.md`)

**Kravoversikt:** FR-8, FR-12, FR-13, FR-16, FR-19, FR-21, FR-27, NFR-4 og NFR-6 oppdateres som i 4.1. AD-7 og AD-18 oppdateres som i 4.2. Linja «Avklares før første KI-kode: Bedrock-pris …» fjernes. Notatformatet får `kapittel-<n>.innhold.md`.

**Story 1.5: Importen legger inn sammendrag, og eieren kan lese dem**
- Brukerhistorie: «vil jeg at importen legger inn et kort sammendrag av hvert delkapittel, laget på forhånd i Claude Code fra notatene mine, …» (FR-8, FR-11, AD-4, AD-7, AD-8).
- AK 1 (KI-modulen) erstattes:
  - «**Gitt** instruksjonen `notater/_instruksjoner/innhold.v1.md` **Når** sammendragene for et kapittel lages i Claude Code **Så** skrives de til `## Sammendrag` i `kapittel-<n>.innhold.md` med `### n.m Tittel`, `inputHash` fra notatet og høyst 600 ord, bare fra notatet.»
- AK 2:
  - «**Gitt** et delkapittel med notater og et sammendrag i innholdsfila **Når** importen kjøres **Så** lagres sammendraget som en ny versjon med status `klart`, modell, instruksjonsversjon og `inputHash`, hvis teksten er ny eller endret.»
  - Uendret tekst gir ingen ny versjon. `--force 1.2` legger det inn på nytt.
- AK 3 (KI feiler) erstattes:
  - «**Gitt** en ugyldig innholdsfil (sammendrag over 600 ord, tomt, ukjent delkapittel) **Når** importen kjører **Så** skrives ingenting fra innholdsfila, feilene listes, og tidligere versjoner beholdes.»
  - «**Gitt** et sammendrag med en annen `inputHash` enn notatet **Når** importen kjører **Så** sier den at sammendraget er utdatert.»
- AK 4 (lese) er uendret, men statusene blir «mangler innhold», «klart» eller «utdatert».

**Story 1.6: Importen legger inn spørsmålsbanken**
- «importen lager» → «spørsmålene lages i Claude Code etter instruksjonen og ligger i `## Quizspørsmål` i innholdsfila».
- «KI lager bare tre gale alternativer» → «Claude Code lager bare tre gale alternativer» (AD-6 er uendret: brukerens fasit er autoritativ).
- «skjemaet avviser» blir importens validering av innholdsfila.
- Påfylling: «importen sier fra når færre enn 10 er ubesvart».

**Story 1.9:** «neste import lager det på nytt» → «importen lister det merkede, og neste import legger inn den rettede versjonen fra innholdsfila». Det samme gjelder quizspørsmål.

**Story 2.2:** «importerer verken Supabase- eller Bedrock-adapteren» → «importerer ikke Supabase-adapteren». «Supabase eller Bedrock» → «Supabase».

**Epic 4: Kapittelgjennomgang med modellsvar** (nytt navn).

**Story 4.3: Eieren ser modellsvaret og vurderer svaret sitt** (erstatter «får KI-tilbakemelding»)
- «**Gitt** et lagret svar på et gjennomgangsspørsmål **Når** eieren har svart **Så** vises modellsvaret fra innholdsfila med hovedpunktene og læringsutbyttet det måles mot (FR-6, UX-4).»
- «**Og** eieren velger «Fikk med det meste», «Fikk med noe» eller «Fikk med lite», og valget lagres med svaret og økta.»
- «**Gitt** at et spørsmål mangler modellsvar **Når** eieren har svart **Så** lagres svaret, og eieren får beskjed om at modellsvaret ikke er laget ennå.»
- «Modellsvaret vises på under 3 sekunder (NFR-3).»

**Story 4.5:** «lager KI 10 gjennomgangsspørsmål» → «lages 10 gjennomgangsspørsmål med modellsvar i Claude Code, i `## Gjennomgangsspørsmål (laget med KI)` i innholdsfila».

**Story 4.6:** «eksempeltilbakemelding» → «modellsvar». Demoen viser modellsvaret og selvvurderingsvalget, uten lagring.

**Story 5.1: Importen legger inn forklaringsspørsmål:** «lager KI 3 åpne forklaringsspørsmål» → «ligger 3 åpne forklaringsspørsmål med modellsvar i `## Forklaringsspørsmål` i innholdsfila, laget i Claude Code».

**Story 5.2:** «får tilbakemelding på samme måte som i story 4.3» er uendret i ordlyden, men betyr nå modellsvar og selvvurdering.

**Story 5.3: Eieren får en vurdering etter hver økt**
- «**Når** KI lager den (Sonnet 5.5)» → «**Når** den regnes ut i `src/domain` fra quizresultater per tema og selvvurderinger».
- Ny AK: «enhetstester dekker malene for god kontroll, blandet og mye å jobbe med».
- AK-en «Gitt at KI-kallet feiler» fjernes.

**Story 5.6:** «fast eksempeltilbakemelding» → «modellsvar». Eksempelvurderingen regnes ut med samme regel fra demodataene.

### 4.4 Spec og sprint-status

- **Spec 1.5a:** `spec-1-5-importen-lager-ki-sammendrag-og-eieren-kan-lese-dem.md` settes til `superseded` med henvisning hit. En ny spec lages med `bmad-build` («Story 1.5a v2: Importen legger inn sammendrag fra innholdsfila»). Den fjerner Bedrock-delen og beholder resten (se 2, «Teknisk»).
- **`sprint-status.yaml`:**
  - `1-5-…` → `in-progress`.
  - `4-3-eieren-får-ki-tilbakemelding-på-svarene` → `4-3-eieren-ser-modellsvaret-og-vurderer-svaret-sitt` (backlog).
  - Resten er uendret.
- **`issues.md`:** punktene om AWS-oppsett, ekte KI-kall, Mantle-modell og `eu.`-ID-er lukkes som utgått.

## 5. Overlevering

**Utført 19.11.2026:** endringene i 4.1–4.4 er lagt inn i PRD, ARCHITECTURE-SPINE, `epics.md`, spec 1.5a (`superseded`), `sprint-status.yaml` og `issues.md`. Neste steg er `bmad-build` for Story 1.5a v2.

**Omfang:** Moderat. Planen endres i PRD, arkitektur og epics, men ingen epics legges til eller fjernes.

| Rolle | Ansvar |
| --- | --- |
| Marte (PM/arkitekt) | Godkjente forslaget 19.11.2026. Har bekreftet at trening på data er slått av i Claude-kontoen (NFR-4) |
| Claude Code (dev) | Oppdaterer PRD, arkitektur, epics og sprint-status etter 4.1–4.4. Lager ny spec og bygger 1.5a v2 med `bmad-build`. Skriver instruksjonen `innhold.v1.md` og lager sammendragene for IBE430 kapittel 1 |

**Suksesskriterier:**
- Ingen KI-pakker i `package.json`, og ingen AWS-nøkler i README eller `.env.example`.
- `npm run import -- --target dev IBE430 1` legger inn seks sammendrag fra `kapittel-1.innhold.md`. En ny kjøring gir «sammendrag uendret».
- En automatisk test viser at et utdatert sammendrag (endret notat) gir beskjed, og at en ugyldig innholdsfil ikke skriver noe.
- PRD, arkitektur og epics nevner ikke Bedrock eller AWS, unntatt i historikken.
