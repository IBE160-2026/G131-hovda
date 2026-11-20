# Epic 1 Context: Kveldsøkta virker, for eieren

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Eieren logger inn, velger IBE430, åpner et klart delkapittel i kapittel 1–4, leser sammendraget og tar en quiz. Delkapittelet krysses av ved minst 80 % riktige, og framdriften mot målet vises. Struktur og notater kommer fra notatfilene, og alt KI-innhold (sammendrag og quizspørsmål) lages på forhånd i Claude Code og ligger i innholdsfiler som importen leser. Appen kaller aldri en KI-leverandør (endret 19.11.2026). Appen er i drift på en offentlig adresse fra første story. Epicen er grunnmuren alle senere epics (demo, plan, kapittelgjennomgang, vurdering) bygger på, og data herfra skal følge med videre.

## Stories

- Story 1.1: Prosjektet er satt opp og forsiden er i drift
- Story 1.2: Eieren logger inn bak tilgangslåsen
- Story 1.3: Eieren oppretter emnet IBE430 med læringsutbytte
- Story 1.4: Importen legger inn kapitler, delkapitler og notater
- Story 1.5: Importen legger inn sammendrag, og eieren kan lese dem (1.5a: import fra innholdsfila, 1.5b: status i kapittellisten og lesesiden)
- Story 1.6: Importen legger inn spørsmålsbanken
- Story 1.7: Eieren tar en quiz på et delkapittel
- Story 1.8: Delkapittelet krysses av, og framdriften vises
- Story 1.9: Eieren sier fra om feil i sammendrag og quizspørsmål

## Requirements & Constraints

- Grensesnitt og alt KI-innhold på norsk bokmål. Fungerer på mobil, iPad og PC i nyere Safari og Chrome, uten sidelengs rulling. Tilgjengelighet (kontrast, tastatur, semantikk) teller i vurderingen.
- Startsiden og sammendraget vises på under 3 s, fordi innholdet er laget på forhånd.
- Tilgangslås: bare eierens konto, offentlig registrering av, ingen registreringsside. Uinnloggede kommer bare til forsiden (og senere demoen). Feil innlogging avslører ikke om e-posten finnes.
- Data i EU/EØS. Appen sender ingen data til en KI-leverandør og har ingen KI-kostnad i drift. Claude-kontoen som lager innholdet, har trening på data slått av. Ingen andre personopplysninger enn e-post og det eieren legger inn. All trafikk over HTTPS.
- Ingen KI-pakker i `package.json` og ingen AWS-nøkler i README eller `.env.example`.
- Appen er i drift fra første story, og hver funksjon settes i drift når den er ferdig.
- Automatiske tester for domeneregler: tolking av notatfiler (mot de ekte filene `kapittel-1.md` til `kapittel-5.md`, der kapittel 1 gir 6 delkapitler og kapittel 2 nå gir 3), `hasNotes`, tolking og validering av innholdsfila (utdatert `inputHash` gir beskjed, ugyldig fil skriver ingenting), 80 %-avkrysning (8/10 ja, 7/10 nei, 8/9 etter fjernet spørsmål ja) og nytt spørsmål om samme tema. RLS testes mot `dev` med en annen testkonto.
- Innhold: sammendrag maks 600 ord, bare fra notatet. Spørsmålsbank med 20 flervalgsspørsmål per delkapittel (4 alternativer, nøyaktig ett riktig, forklaring, tema fra temalisten, minst 2 per tema). Quiz med 10 spørsmål, aldri samme spørsmål på nytt, resultat som «8 av 10 riktige».
- Et delkapittel er «klart» først når både sammendrag og spørsmålsbank har en klar versjon. Uten notater er det «mangler notater».
- Framdrift: andel gjennomførte delkapitler og avstand til målet på 90 % av delkapitlene. Eksempelet «19 av 21» i planene er utdatert: 2.3 og 2.5 er tatt ut av IBE430, så kapittel 2 består av 2.1, 2.2 og 2.4, og emnet har 19 delkapitler. Målet regnes fra antallet delkapitler som faktisk finnes, og hardkodes ikke.

## Technical Decisions

- **Stack:** Next.js 16.4 (minst 16.4.1) i TypeScript, Supabase (Postgres og Auth, prosjektene `dev` og `prod` i eu-central-1), Vercel med funksjonsregion `fra1`, Vitest og GitHub Actions. KI-innhold: Claude Code utenfor appen.
- **Ports and adapters:** `src/domain` (rene regler, importerer ingenting utenfra), `src/application` (brukstilfeller og porter som `DataSource` og `Clock`), `src/adapters/{supabase,demo,clock}`, `src/app` og `scripts/`. `src/app` og `scripts` importerer aldri fra `src/adapters` direkte (lint-regel). Én komposisjonsrot per inngangspunkt. `domain` og `application` bruker ingen serverkode, slik at demoen kan kjøre dem i nettleseren. Det finnes ingen `AiProvider`-port og ingen `bedrock`-adapter (fjernet 19.11.2026).
- **Ingen Next.js-middleware.** Innloggingsøkta fornyes i serverkode. Hver `page.tsx` i `src/app/(innlogget)` pakker innholdet i `OwnerOnly`, så det aldri havner i den statiske delen (Partial Prerendering). Server Actions sjekker eieren selv. Testen `ownerOnlyPages.test.ts` feiler hvis en side mangler `OwnerOnly`.
- **Database:** Alle brukertabeller har eier-FK til `auth.users` med `on delete cascade`, RLS og `GRANT`. Endringer bare via migreringer i `supabase/migrations/`, dev før prod, aldri via dashbordet. Adaptere testes mot `dev`, aldri mot `prod`.
- **Identitet:** Kapittel = (eier, emnekode, nr.), delkapittel = (eier, emnekode, «n.m»). Titler er attributter. Nytt nummer betyr ny enhet. Hull i nummereringen (2.1, 2.2, 2.4) er gyldig og skal ikke nummereres om.
- **Import:** `npm run import -- --target dev|prod <EMNE> <n>`, kjøres eksplisitt og er idempotent. Leser `.env.dev.local` eller `.env.prod.local`, prod krever bekreftelse, eieren finnes via `OWNER_EMAIL`, og emnet må finnes fra før (opprettes i appen). Bare importen oppretter kapitler og delkapitler for emner med notatfiler. Hele notatfila valideres før noe skrives (delkapittelnummer må starte med filens kapittelnummer, ingen duplikater), og feil gir norsk melding med linjenummer.
- **Notatformat (`kapittel-<n>.md`):** Frontmatter (`emne`, `kapittel`, `tittel`), `## Læringsmål for kapittelet`, `## Nøkkelbegreper`, delkapitler som `### n.m Tittel`, valgfri `## Spørsmålsbank` (tabell `#`, `Delkapittel`, `Spørsmål`, `Fasit`). `## Råtekst` og `## Rettelser` er aldri med i notattekst, hash eller grunnlaget for KI-innholdet. `hasNotes()` er eneste definisjon av «har notater» (tom, bare mellomrom og `*Ingen notater ennå.*` gir false).
- **Innholdsfil (`notater/<EMNE>/kapittel-<n>.innhold.md`):** Frontmatter med instruksjonsversjon og modell (for eksempel `claude-code/claude-opus-5-5`). Seksjonene `## Sammendrag` (1.5) og `## Quizspørsmål` (1.6), med `### n.m Tittel` og `inputHash` per delkapittel. Innholdet lages i Claude Code etter den versjonerte instruksjonen `notater/_instruksjoner/innhold.v<n>.md`, med emnets læringsutbytte og kapittelets læringsmål og nøkkelbegreper som kontekst. Tolkingen er deterministisk og ligger i `src/domain`, som `notesFile.ts`.
- **Validering:** Importen validerer hele innholdsfila mot et fast skjema i `src/domain` før den skriver noe (sammendrag over 600 ord eller tomt, ukjent delkapittel, spørsmål uten nøyaktig fire alternativer og ett riktig, tema utenfor listen). Er fila ugyldig, skrives ingenting fra den, feilene listes, og tidligere versjoner beholdes.
- **Endringsdeteksjon:** `inputHash` = hash(normalisert notat + kapittelets læringsmål og nøkkelbegreper + instruksjonsversjon). Er hashen i innholdsfila ulik notatets hash nå, sier importen at innholdet er utdatert. Uendret tekst gir ingen ny versjon. `--force <n.m>` legger inn innholdet for ett delkapittel på nytt.
- **Versjoner og status:** Sammendrag og spørsmålsbank har versjoner med status `lages`, `klart` eller `feilet` (`feilet` bare hvis lagringen feiler underveis). Hver versjon lagrer `model_id` og `prompt_version` (instruksjonsversjonen) fra innholdsfila. Siste klare versjon vises, og ugyldig nytt innhold tar aldri bort en klar versjon. Tabellen `summary_versions`, normaliseringen i `src/domain/summary.ts`, `describeImport` og `importExitCode` finnes fra 1.5a og beholdes.
- **Spørsmål:** Stabil ID, trekkes tilbake med status og slettes aldri. Et spørsmål er «brukt» når det er valgt til en quiz. Ved endrede notater trekkes bare ubrukte KI-spørsmål tilbake. En quiz som er i gang, beholder spørsmålene sine. Temaer er egne enheter per delkapittel, opprettes når banken legges inn første gang, og påfylling bruker samme temaliste. Når færre enn 10 er ubesvart, sier importen fra, og nye spørsmål legges i innholdsfila.
- **Brukerens egne spørsmål:** Fra `## Spørsmålsbank` blir med i banken med brukerens fasit som riktig alternativ (Claude Code lager bare tre gale alternativer, forklaring og tema) og erstattes aldri automatisk. Ja/Nei-spørsmål skrives om til flervalg og merkes som omskrevet, med originalteksten lagret. Spørsmål nevnt under «**Må avklares før bruk:**» hoppes over, og importen skriver ut hvilke.
- **Økt og gjennomført:** Hver quiz hører til en `session`. Bare `finishQuiz` skriver `subchapter_completion` (tidspunkt og quiz-ID), én gang per delkapittel, og den angres aldri. Quizresultatet fryses når quizen avsluttes. Framdrift og kapittelliste leser fra denne posten og regner ikke ut på nytt.
- **Feilrapporter:** Merker sammendraget eller trekker quizspørsmålet tilbake med en gang. Importen lister det som må rettes, rettingen gjøres i innholdsfila, og neste import legger inn den rettede versjonen. Et tilbaketrukket spørsmål teller ikke i resultatet eller 80 %-grensen.
- **Miljøer og hemmeligheter:** `.env.local` (dev-server mot `dev`), `.env.dev.local` og `.env.prod.local` (scripts), Vercel-miljøvariabler. `.env.example` lister navnene. Forhåndsvisninger går mot `dev`, `main` mot `prod`.
- **Navn og språk:** Engelsk i kode etter fast ordliste (emne=course, kapittel=chapter, delkapittel=subchapter, notat=note, sammendrag=summary, spørsmålsbank=questionBank, quizspørsmål=quizQuestion, tema=theme, økt=session). Grensesnitt, instruksjoner, commits og dokumentasjon på norsk. Hver entitet har ett brukstilfelle som skriver den. Små commits.
- **Datoer:** All datologikk i Europe/Oslo via `Clock`. Rene datoer for kalenderdager, UTC for tidspunkter.

## UX & Interaction Patterns

- Det finnes ikke noe eget UX-dokument. Startsiden er oversiktlig, imøtekommende og fargerik, med framdriftsindikatoren øverst.
- Forsiden sier kort hva Studievenn er og har en knapp for å logge inn.
- Kapittellisten viser kapitler og delkapitler i riktig rekkefølge med norske titler og tydelig status per delkapittel: «mangler notater», «mangler innhold», «klart», «utdatert» og gjennomført. Bare klare delkapitler kan åpnes i en økt.
- Ved feil svar i quizen vises riktig svar og forklaring med en gang. En avbrutt quiz fortsetter på neste ubesvarte spørsmål. Under 80 % får eieren tilbud om å lese sammendraget igjen og ta en ny quiz.
- Sletting av emne krever bekreftelse.
- KI-tekst er kort, ærlig og vennlig og nevner det som går bra før det som mangler.

## Cross-Story Dependencies

- 1.1 legger grunnlaget (prosjekt, lag, lint-regel, CI, deploy) for alle andre stories.
- 1.2 (Supabase Auth, `OwnerOnly`) må være på plass før 1.3 og alt med brukerdata.
- 1.3 (emnet finnes) før 1.4, siden importen stopper hvis emnet mangler.
- 1.4 (import av struktur og notater) før 1.5 og 1.6. 1.5a (instruksjonen `innhold.v1.md`, tolking av innholdsfila og sammendrag for IBE430 kapittel 1) før 1.5b og 1.6, som utvider samme innholdsfil med `## Quizspørsmål`. Ingen AWS-konto eller nøkler trengs.
- Etter 1.4–1.6 lages innholdsfilene for IBE430 kapittel 1–5 i Claude Code, og importen kjøres mot `prod`, så alle delkapitler med notater er klare i drift. Kapittel 6 har ingen notatfil ennå.
- 1.7 krever 1.6. 1.8 krever 1.7. 1.9 krever 1.5 og 1.7, og kan flyttes til etter Epic 3 hvis tiden blir knapp.
- Epic 2 (demo) gjenbruker brukstilfellene i nettleseren med en egen datakilde, så `domain` og `application` må holdes fri for serverkode. Senere epics (gjennomgangsspørsmål, forklaringsspørsmål og modellsvar) legger nye seksjoner til i den samme innholdsfila.
