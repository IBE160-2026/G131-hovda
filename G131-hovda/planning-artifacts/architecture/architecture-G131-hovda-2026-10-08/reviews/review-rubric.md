---
reviewed: ARCHITECTURE-SPINE.md (updated 2026-10-25)
against: prd-G131-hovda-2026-09-27/prd.md (final 08.10), .memlog.md
date: 2026-10-25
lens: good-spine rubric, calibrated to a solo student project (IBE160)
---

# Review: Architecture Spine Studievenn (rubric)

## Verdict

**Nesten klar, men trenger én runde rettelser før første story.** Ryggraden er godt kalibrert for et soloprosjekt: paradigmet er klart, de fleste AD-ene har en regel som faktisk kan sjekkes (avhengighetsretning, ren domenemodul, stabile nøkler, spørsmål slettes aldri, én KI-modul, RLS, Europe/Oslo), og stack og miljøer er bestemt. Hovedproblemet er én motsetning og ett hull, begge kommer av beslutningen 25.10 om at KI-generering skjer i importkommandoen:

1. Flere PRD-krav trenger KI-generering **mens appen kjører** (FR-8 «prøv igjen», FR-12, FR-13 påfylling, FR-16 erstatning, FR-27 KI-genererte gjennomgangsspørsmål, FR-17/18 forklaringsspørsmål, FR-21). Ryggraden sier ikke hvor de kjøres. Det er det største stedet der to stories kan gjøre det ulikt.
2. Driftsrammen har hull: importen skriver til `prod` fra PC-en, mens AD-12 sier at lokal kjøring aldri går mot `prod`. Migreringer mellom `dev` og `prod`, testkjøring/CI, Vercel preview-miljø og backup er ikke bestemt.

Ingen av funnene krever nytt paradigme eller ny stack. Alt kan rettes med 1–2 nye AD-er og noen linjer under Deferred/Open Questions.

## Sjekkliste

| Kriterium | Status | Kommentar |
| --- | --- | --- |
| Fikser de reelle divergenspunktene for nivået under | Delvis | Mangler: hvor KI-kall i kjøretid skjer, demotilstand (klient vs. server), migreringsflyt dev→prod |
| Hver AD-regel er håndhevbar og hindrer det den sier | Stort sett | AD-1, AD-2, AD-5, AD-6, AD-10, AD-11 er gode. AD-4 og AD-12 motsier hverandre. AD-9 og AD-10 dekker ikke FR-2 sletting |
| Ingenting under Deferred kan la to enheter divergere | Delvis | «Databaseskjema og migreringsverktøy» er utsatt, men to miljøer + RLS gjør migreringsflyten til et divergenspunkt |
| Navngitt teknologi er verifisert og gjeldende | Stort sett | Modellnavn finnes. Bedrock-ID-er mangler `anthropic.`-prefiks. EU-tilgjengelighet for 5.5-modellene og vilkår om trening er ikke bekreftet (står i memlog, ikke i ryggraden) |
| Dekker alle FR/NFR i PRD-en (mappet eller utsatt) | Delvis | FR-12 står i `binds`, men har ingen AD eller rad i kapabilitetskartet. NFR-1, NFR-2, NFR-3, NFR-6, NFR-8 er bare dekket indirekte |
| Driftsrammen er bestemt, utsatt eller åpent spørsmål | Delvis | Bestemt: hosting, regioner, dev/prod, hemmeligheter. Mangler: CI/testkjøring, preview-miljø, migreringer, backup, valg av prod-mål for importen, AWS IAM |
| Seksjonen Open Questions finnes | Nei | Åpne punkter fra memlog (Bedrock-vilkår, EU-tilgjengelighet, pris) er ikke ført over |

## Funn

### F1 [Høy] KI-generering i kjøretid har ingen plass i arkitekturen

- **Hvor:** AD-4, AD-7, AD-8, Deferred «Bakgrunnsjobb», kapabilitetskartet (FR-8, FR-11, FR-13, FR-17–FR-21)
- **Problem:** AD-4 sier at importkommandoen lager sammendrag og spørsmålsbank, og at det ikke finnes noen bakgrunnsjobb. Men flere krav må lage KI-innhold mens brukeren bruker appen:
  - FR-8: «feilet – prøv igjen» med automatisk nytt forsøk og en knapp brukeren kan trykke på.
  - FR-12: feilrapport på sammendrag → lag sammendraget på nytt.
  - FR-13: fyll på banken når færre enn 10 er ubesvart.
  - FR-16: erstatt rapportert spørsmål med et nytt om samme tema.
  - FR-27: KI lager 10 gjennomgangsspørsmål når alle delkapitlene er klare.
  - FR-17/18 (forklaringsspørsmål), FR-19 (tilbakemelding), FR-21 (vurdering etter hver økt).
  Driftsdiagrammet viser `VER --> BR`, så KI-kall fra Vercel er tenkt, men ingen regel sier hvilke oppgaver som går synkront i en serverhandling, og hvilke som venter til neste import. Én story kan da kalle Bedrock direkte i en route, mens en annen legger arbeidet i kø til importen. FR-16 og FR-13 blir lett gjort på to ulike måter.
- **Forslag:** Legg til en AD, for eksempel «AD-13: Hvor KI kjører». Del oppgavene i to grupper:
  - *Import (lokalt, AD-4):* sammendrag og spørsmålsbank for nye/endrede delkapitler, oversetting av titler fra notatfilene, KI-genererte gjennomgangsspørsmål.
  - *Synkront i serverkode på Vercel, gjennom samme `AiProvider`:* tilbakemelding (FR-19), vurdering (FR-21), erstatning av ett spørsmål (FR-16), nytt sammendrag ved feilrapport (FR-12), påfylling av banken (FR-13), «prøv igjen» (FR-8), og forklaringsspørsmål (FR-17/18), eventuelt forhåndslaget i importen.
  Si også at et synkront kall som feiler, setter status `feilet` (AD-8) og aldri blokkerer quizen. Gjør klart at FR-8 «automatisk nytt forsøk» betyr «neste import eller neste trykk», så lenge det ikke finnes noen bakgrunnsjobb.

### F2 [Høy] Importen skriver til `prod` fra PC-en, men AD-12 forbyr lokal kjøring mot `prod`

- **Hvor:** AD-12 («Lokal utvikling kjører mot `dev`, aldri mot `prod`»), driftsdiagrammet (`IMP --> SPROD`), AD-10 og konvensjonen Hemmeligheter (`.env.local`)
- **Problem:** Importkommandoen og eksportkommandoen for demodata kjører på PC-en og må bruke prod-nøkkelen (`service_role`). Hvis `.env.local` inneholder dev-nøklene, får importen ikke tilgang til prod. Hvis den inneholder prod-nøklene, kjører dev-serveren mot prod. Ryggraden sier ikke hvordan miljøet velges, så hver story som rører `scripts/` kan løse det på sin egen måte, og det er lett å skrive ekte data til feil miljø.
- **Forslag:** Endre AD-12 til «Next.js dev-serveren og testene kjører bare mot `dev`. `scripts/import.ts` og `scripts/export-demo.ts` krever et eksplisitt mål (`--env dev|prod`) og leser `.env.dev.local` eller `.env.prod.local`. Uten flagg brukes `dev`.» Legg navnene inn i `.env.example`. Legg Bedrock/AWS-legitimasjonen (IAM-bruker med bare `bedrock:InvokeModel*`) til i samme konvensjon.

### F3 [Middels] Migreringer, testkjøring og preview-miljø er ikke bestemt

- **Hvor:** Deferred «Databaseskjema og migreringsverktøy», konvensjonen Tester, Stack (ingen testverktøy), seksjonen Structural Seed
- **Problem:**
  - Med to Supabase-prosjekter og RLS på hver tabell (AD-10) må skjema og policyer være like i `dev` og `prod`. Hvis migreringsverktøyet er «utsatt», kan én story endre skjemaet i dashbordet og en annen i en SQL-fil. Da glir miljøene fra hverandre, og RLS kan mangle i prod. Det er et divergenspunkt, ikke en detalj.
  - Testverktøy og hvor testene kjører (lokalt eller GitHub Actions ved push) er ikke bestemt, men QA/testing teller 15 % i IBE160, og NFR-8 krever automatiske tester.
  - Vercel lager preview-deploy for hver gren. Uten en regel peker preview-miljøet på de samme miljøvariablene som prod, altså på ekte data.
- **Forslag:** Flytt dette fra Deferred til konvensjoner:
  - «Skjema og RLS-policyer endres bare med Supabase CLI-migreringer i `supabase/migrations/`, kjøres først mot `dev` og så mot `prod` (`supabase db push`). Ingen endringer i dashbordet.»
  - Stack: legg til Vitest (domene- og adaptertester) og eventuelt Playwright for én røyktest av demoen.
  - «GitHub Actions kjører typesjekk, lint og domenetester ved hver push. Vercel-preview bruker `dev`-variablene, og bare `main` deployes mot `prod`.»
  Selve kolonnene kan fortsatt stå under Deferred.

### F4 [Middels] FR-2, FR-12 og demotilstanden er ikke dekket av noen regel

- **Hvor:** `binds` (frontmatter), kapabilitetskartet, AD-3, AD-9, AD-10
- **Problem:**
  - **FR-12** står i `binds`, men finnes ikke i kapabilitetskartet eller i noen AD (se F1).
  - **FR-2** (slette konto og alle data) er bundet av AD-9/AD-10, men ingen regel sikrer at alle rader forsvinner. Uten en regel kan én tabell bli igjen.
  - **AD-3** sier «tilstand per besøk», men ikke hvor den lagres. Vercel-funksjoner har ingen tilstand, så demotilstanden må ligge i nettleseren (for eksempel `sessionStorage`) eller i en informasjonskapsel. Ellers kan én story legge den på serveren og en annen i klienten. Demoen trenger også en fast `Clock` (fast demo-dag, FR-26), som bør stå i regelen.
- **Forslag:**
  - Legg FR-12 til i kartet (raden for FR-14–FR-16 eller FR-8/FR-11) og i den nye AD-en fra F1.
  - Legg til i AD-10: «Hver eier-kolonne er en fremmednøkkel til `auth.users` med `on delete cascade`. Sletting av konto (FR-2) er sletting av brukeren i Supabase Auth.»
  - Legg til i AD-3: «Tilstanden per besøk ligger bare i nettleseren (`sessionStorage`). Demoen bruker en `Clock`-adapter med fast dato.»

### F5 [Lav] Teknologi og åpne punkter mangler verifisering i ryggraden

- **Hvor:** Stack, AD-7, mangel på seksjonen Open Questions
- **Problem:**
  - Modell-ID-ene i Stack (`claude-opus-5-5` osv.) er riktige førstepartsnavn, men på Bedrock har de prefikset `anthropic.` (for eksempel `anthropic.claude-sonnet-5-5`). Klienten `AnthropicBedrockMantle` fra `@anthropic-ai/bedrock-sdk` stemmer.
  - Memlog-linjen om å verifisere vilkår mot trening (NFR-4), om modellene finnes i eu-central-1 eller via EU-inferens på tvers av regioner, og om prisen på Bedrock, står ikke i ryggraden. Hvis Haiku 5.5 eller Opus 5.5 ikke finnes i EU-regionen, påvirker det AD-7 og AD-12.
  - Vercel Hobby er bare for ikke-kommersiell bruk (greit her). Supabase gratisplan har ingen automatisk backup, og prosjekter settes på pause etter 7 dager uten aktivitet. Notatene ligger i git, men framdrift, svar og tilbakemeldinger finnes bare i prod-databasen fram til eksamen.
- **Forslag:** Bruk `anthropic.`-prefikset i Stack-tabellen, eller skriv at innstillingsfilen i AD-7 bruker Bedrock-ID-er. Legg til en kort seksjon «Open Questions»: (1) Bedrock-vilkår om trening, (2) EU-tilgjengelighet for hver av de tre modellene, (3) pris per region. Legg til én driftslinje: «Ukentlig `supabase db dump` av prod til en lokal mappe som er i `.gitignore`. Gjenoppretting av et pauset prosjekt gjøres manuelt fra dashbordet.»

### F6 [Lav] Ryggraden og PRD-en er ikke i takt (kjent)

- **Hvor:** AD-9 («Del 2 (FR-1) slår på registrering»), `scope`, PRD §4/§9, FR-25, FR-8
- **Problem:** Med del 1 og del 2 slått sammen til 1.11 er «del 2» ikke lenger et eget trinn. FR-25 (passord eller hemmelig lenke) er erstattet av Supabase Auth. FR-8 (generering når notatet lagres i appen) er erstattet av importen. PRD §9.2 sier også at appen ikke åpnes for andre brukere, mens AD-9 sier at registrering slås på. Dette er kjent fra memlog, men den som skriver epics leser PRD-en og ryggraden og får to svar.
- **Forslag:** Skriv AD-9 om til «Registrering forblir av i denne versjonen. FR-1 leveres som innlogging, økt i 30 dager og tilbakestilling av passord for eierkontoen. Å slå på registrering avgjøres etter emnet (PRD §9.2).», eller bekreft det motsatte med brukeren. Oppdater PRD-en (FR-8, FR-25, §4-tabellen, §9.1) før epics lages, slik memlog allerede foreslår. Testen i NFR-8 om at «data fra del 1 følger med til kontoen i del 2» er da oppfylt av AD-9 og kan nevnes som det.

## Dekning FR/NFR

| Krav | Dekket av | Merknad |
| --- | --- | --- |
| FR-1, FR-2, FR-25 | AD-9, AD-10 | FR-2 mangler kaskaderegel (F4) |
| FR-3, FR-4, FR-5, FR-6 | AD-2, AD-5, AD-7 | Greit |
| FR-7 | Deferred | Greit ([Bør]) |
| FR-8 | AD-4, AD-8 | Innliming i appen og «prøv igjen» uklart (F1) |
| FR-9, FR-10, FR-20 | AD-2, AD-8, AD-11 | Greit |
| FR-11, FR-13 | AD-4, AD-7 | Påfylling i kjøretid uklar (F1) |
| FR-12 | ingen | Mangler (F1, F4) |
| FR-14, FR-15, FR-16 | AD-2, AD-6 | Hvor erstatningen lages er uklart (F1) |
| FR-17, FR-18, FR-19, FR-21 | AD-7 | Kjøres i Vercel, ikke sagt (F1) |
| FR-22, FR-23, FR-24 | Deferred | Greit |
| FR-26 | AD-3 | Hvor tilstanden lagres og fast klokke (F4) |
| FR-27, FR-28 | AD-2, AD-6 | KI-genererte gjennomgangsspørsmål (F1) |
| NFR-1 | ingen (UX utsatt) | Greit å utsette, men nevn det under Deferred |
| NFR-2 | Konvensjon Språk | Greit |
| NFR-3 | AD-4, AD-8 indirekte | <20 s for Opus-tilbakemelding er ikke nevnt. Lav effort hjelper |
| NFR-4, NFR-7 | AD-12 | Bedrock-vilkår ikke bekreftet (F5) |
| NFR-5 | AD-3, AD-9, AD-10 | Greit |
| NFR-6 | AD-4, AD-7 | Ingen grense for KI-kall i kjøretid. Greit for én bruker |
| NFR-8 | AD-2, konvensjon Tester | Testverktøy og CI mangler (F3) |

## Det som er bra

- Paradigmet er konkret: mapper, lag og en avhengighetsregel som kan sjekkes med en lint-regel (for eksempel `eslint-plugin-boundaries` eller `dependency-cruiser`).
- AD-5 og AD-6 tar de vanskelige punktene ved ny import (stabile nøkler, spørsmål slettes aldri, brukerens fasit er autoritativ) før de blir feil.
- AD-11 (Europe/Oslo via `Clock`) hindrer en kjent feilkilde i planformelen og gjør demoens faste dag mulig.
- Modellvalget står på ett sted, og hvert KI-resultat lagrer modell-ID og promptversjon. Det er bra for sporbarhet i IBE160.
- Nivået passer prosjektet: ingen unødvendig overvåking, kø eller mikrotjenester.
