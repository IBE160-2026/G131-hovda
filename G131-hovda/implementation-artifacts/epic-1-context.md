# Epic 1 Context: Kveldsøkta virker, for eieren

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Eieren logger inn, velger IBE430, åpner et klart delkapittel i kapittel 1–4, leser et KI-sammendrag og tar en quiz. Delkapittelet krysses av ved minst 80 % riktige, og framdriften vises. Innholdet kommer fra notatfilene via en lokal importkommando, og appen er i drift på en offentlig adresse fra første story. Epicen er grunnmuren alle senere epics (demo, plan, gjennomgang, vurdering) bygger på.

## Stories

- Story 1.1: Prosjektet er satt opp og forsiden er i drift
- Story 1.2: Eieren logger inn bak tilgangslåsen
- Story 1.3: Eieren oppretter emnet IBE430 med læringsutbytte
- Story 1.4: Importen legger inn kapitler, delkapitler og notater
- Story 1.5: Importen lager KI-sammendrag, og eieren kan lese dem
- Story 1.6: Importen lager spørsmålsbanken
- Story 1.7: Eieren tar en quiz på et delkapittel
- Story 1.8: Delkapittelet krysses av, og framdriften vises
- Story 1.9: Eieren sier fra om feil i sammendrag og quizspørsmål

## Requirements & Constraints

- Grensesnitt og alt KI-innhold på norsk bokmål. Fungerer på mobil, iPad og PC i nyere Safari og Chrome, uten sidelengs rulling. Tilgjengelighet (kontrast, tastatur, semantikk) teller i vurderingen.
- Startsiden og sammendraget vises på under 3 s, fordi innholdet er laget på forhånd.
- Tilgangslås: bare eierens konto, offentlig registrering av. Uinnloggede kommer bare til forsiden og demoen.
- Data og KI i EU/EØS, KI-leverandøren trener ikke på dataene, ingen andre personopplysninger enn e-post. All trafikk over HTTPS.
- KI-kostnad maks 100 kr i måneden.
- Appen er i drift fra første story, og hver ny funksjon settes i drift når den er ferdig.
- Automatiske tester for domeneregler: tolking av notatfiler, 80 %-avkrysning, nytt spørsmål om samme tema. Data fra denne epicen skal følge med videre.
- Sammendrag maks 600 ord, bare fra brukerens notater. Spørsmålsbank med 20 spørsmål per delkapittel, hvert med fasit, forklaring og tema. Quiz med 10 flervalgsspørsmål med 4 alternativer.

## Technical Decisions

- **Stack:** Next.js 16.4 (minst 16.4.1) i TypeScript, Supabase (Postgres og Auth, to prosjekter `dev` og `prod` i eu-central-1), Vercel Hobby med funksjonsregion `fra1`, Vitest og GitHub Actions. KI: Claude via Amazon Bedrock, EU-profil (`eu.anthropic.claude-…`), gjennom `@anthropic-ai/bedrock-sdk`.
- **Ports and adapters:** `src/domain` (rene regler, importerer ingenting utenfra), `src/application` (brukstilfeller og portene `DataSource`, `AiProvider`, `Clock`), `src/adapters/{supabase,bedrock,demo,clock}`, `src/app` (Next.js) og `scripts/`. `src/app` og `scripts` importerer aldri fra `src/adapters` direkte. Én komposisjonsrot per inngangspunkt. `domain` og `application` bruker ingen serverkode, slik at de kan kjøre i nettleseren.
- **Ingen Next.js-middleware** (Vercel kjører den i alle regioner). Innloggingsøkta fornyes i serverkode.
- **Database:** Alle brukertabeller har eier-FK til `auth.users` med `on delete cascade`, RLS og `GRANT`. Endringer bare via migreringer i `supabase/migrations/`, dev før prod.
- **Identitet:** Kapittel = (eier, emnekode, nr.), delkapittel = (eier, emnekode, «n.m»). Titler er attributter.
- **Import:** `npm run import -- --target dev|prod <EMNE> <n>`, idempotent, leser `.env.dev.local` eller `.env.prod.local`, prod krever bekreftelse, eieren finnes via `OWNER_EMAIL`. Validerer hele filen før skriving. `## Råtekst` og `## Rettelser` er aldri med. `hasNotes()` er eneste definisjon av «har notater».
- **KI-innhold:** Versjonert med status `lages`, `klart` eller `feilet`. En feilet generering tar aldri bort en klar versjon. Spørsmål slettes aldri, bare trekkes tilbake. Brukerens egne fasiter er autoritative. Bare `finishQuiz` skriver gjennomført.
- **Miljøer og hemmeligheter:** `.env.local` (dev-server mot `dev`), `.env.dev.local` og `.env.prod.local` (scripts), Vercel-miljøvariabler. `.env.example` lister navnene. Forhåndsvisninger går mot `dev`, `main` mot `prod`.
- **Navn og språk:** Engelsk i kode etter fast ordliste (emne=course, kapittel=chapter, delkapittel=subchapter, notat=note, sammendrag=summary, spørsmålsbank=questionBank, quizspørsmål=quizQuestion, tema=theme, økt=session). Grensesnitt, prompter, commits og dokumentasjon på norsk. Små commits.
- **Datoer:** All datologikk i Europe/Oslo via `Clock`.

## UX & Interaction Patterns

- Startsiden er oversiktlig, imøtekommende og fargerik.
- Delkapittelstatus vises tydelig i kapittellisten: «mangler notater», «innhold lages», «klart», «feilet», gjennomført.
- KI-tekst er kort, ærlig og vennlig og nevner det som går bra før det som mangler.
- Det finnes ikke noe eget UX-dokument. Visuelt design og komponentbibliotek avgjøres i første story.

## Cross-Story Dependencies

- 1.1 legger grunnlaget (prosjekt, lag, lint-regel for lagene, CI, deploy) for alle andre stories.
- 1.2 (Supabase Auth) må være på plass før 1.3 og alt med brukerdata.
- 1.4 (import uten KI) før 1.5 og 1.6 (KI-generering i importen). 1.5 og 1.6 krever en avklart Bedrock-tilgang (AWS-konto, pris, vilkår om trening, modelltilgang i eu-central-1).
- 1.7 krever 1.6. 1.8 krever 1.7. 1.9 krever 1.5 og 1.7.
- Epic 2 (demo) bygger på at brukstilfellene kan kjøre i nettleseren med en egen datakilde.
