# Epic 2 Context: Demoen, så faglærer og sensor kan prøve uten konto

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Hvem som helst (faglærer, sensor, medstudenter) trykker «Prøv demoen» på forsiden og tar kveldsøkta med IBE430 kapittel 1–4: emneliste, kapittelliste, sammendrag, quiz og andel gjennomført. Demoen trenger ingen konto, gjør ingen KI-kall, samler ingen personopplysninger og rører aldri eierens data. Den bruker de samme skjermene og brukstilfellene som appen, men med en egen datakilde og klokke i nettleseren, så den ikke glir fra appen. Demoen erstatter egne testbrukere, og sensor bruker den til å vurdere appen. Senere epics (plan, kapittelgjennomgang, forklaringsspørsmål og vurdering) utvider demoen, så skjemaet og adapteren må tåle nye felt.

## Stories

- Story 2.1: Eieren lager demodata med én kommando
- Story 2.2: Hvem som helst kan åpne demoen og lese sammendrag
- Story 2.3: Den demobesøkende tar quiz og ser framdriften

## Requirements & Constraints

- **Innhold:** IBE430 kapittel 1–4, eller de kapitlene som er klare: struktur, læringsutbytte, eksamensform, siste klare sammendrag og aktive quizspørsmål med temaer. Innholdet bygger bare på eierens egne notater (opphavsrett). Kapittel 2 består av 2.1, 2.2 og 2.4. Hull i nummereringen er gyldig.
- **Spørsmålsbank:** Minst 20 spørsmål per delkapittel og minst 2 per tema, så det alltid finnes et nytt spørsmål om samme tema. En CI-test feiler hvis demofilene bryter dette. Når banken er brukt opp, kommer spørsmålene igjen i ny rekkefølge (avvik fra appen, der samme spørsmål aldri kommer på nytt).
- **Ingen personopplysninger i demofilene:** ingen e-post, bruker-ID, notater, svar eller framdrift fra eieren.
- **Demodata lages bare med eksportkommandoen** og fornyes aldri automatisk, heller ikke ved deploy.
- **Ingen varig lagring:** Det den besøkende gjør, ligger bare i besøket. Ny fane eller nytt besøk starter likt. Ingenting skrives til databasen, og demoen sender ingen forespørsler til Supabase.
- **Samme regler som i appen:** quiz med 10 spørsmål, riktig svar og forklaring ved feil, nytt spørsmål om samme tema, avkrysning ved minst 80 % og resultat som «8 av 10 riktige». Framdriften viser andel gjennomført.
- **Demoen har aldri tilgang til brukerdata** (sikkerhet). Det er testet i CI at demoen aldri skriver til eierens data.
- Grensesnitt på norsk bokmål. Fungerer på mobil, iPad og PC i nyere Safari og Chrome uten sidelengs rulling. Tilgjengelighet teller i vurderingen. Demoen er i drift på den offentlige adressen.

## Technical Decisions

- **Samme kjerne, egen datakilde:** Demoen kjører brukstilfellene fra `src/application` i nettleseren med `DemoDataSource` (frosne filer i `demo-data/` pluss tilstand i minnet, speilet til `sessionStorage`) og `DemoClock` med fast dato. `domain` og `application` må derfor være fri for serverkode.
- **Egen komposisjonsrot for demoen:** Den bruker bare `DemoDataSource` og `DemoClock` og importerer aldri Supabase-adapteren. En CI-test sjekker dette. `src/app` importerer aldri `src/adapters` direkte (lint-regel), og det er én komposisjonsrot per inngangspunkt. Det finnes ingen KI-adapter (`AiProvider` og `bedrock` er fjernet 19.11.2026).
- **Felles skjema for demofilene** i `src/application`. Både `scripts/export-demo.ts` og demo-adapteren validerer mot det. Eksporten validerer før den skriver noe.
- **Eksport:** `npm run export-demo` leser alltid fra `prod` og skriver til `demo-data/`. Som importen bruker scripts `.env.prod.local`, prod må bekreftes, og eieren finnes via `OWNER_EMAIL`. Planene sier både at import og eksport krever `--target dev|prod` og at `export-demo` alltid leser fra `prod`. Det må avklares i 2.1 om flagget tas med.
- **Innhold fra databasen, ikke fra innholdsfilene:** Alt KI-innhold er laget på forhånd i Claude Code og lagt inn med importen. Eksporten tar siste klare sammendragsversjon og bare aktive (ikke tilbaketrukne) quizspørsmål.
- **Navn:** Engelsk i kode etter fast ordliste (course, chapter, subchapter, summary, questionBank, quizQuestion, theme, session). Grensesnitt og dokumentasjon på norsk.
- **Datoer:** All datologikk går via `Clock`. I demoen er det `DemoClock`, så alle besøkende ser det samme.

## UX & Interaction Patterns

- Demoen åpnes med ett trykk fra forsiden («Prøv demoen»), uten innlogging, og lander i emnelisten med IBE430.
- Et tydelig merke på hver side sier at man er i demoen.
- De samme skjermene som i appen: kapittelliste med status per delkapittel, lesesiden for sammendrag, quiz og framdriftsindikator.
- Funksjoner som oppretter eller endrer data, er skjult: opprette, endre eller slette emne, feilrapporter og alt annet som krever varig lagring.
- En avbrutt quiz fortsetter ved omlasting i samme fane.

## Cross-Story Dependencies

- Bygger på Epic 1: skjermene, brukstilfellene (blant annet `finishQuiz` og quizreglene), statusene og innholdet i `prod` for IBE430 kapittel 1–4.
- 2.1 (skjema og demofiler) før 2.2 og 2.3, som leser filene gjennom `DemoDataSource`.
- 2.2 (inngang, merke, komposisjonsrot, lesing) før 2.3 (quiz, avkrysning og framdrift i `sessionStorage`).
- Senere epics utvider demoen i slutten av hver epic: Epic 3 med dagens forslag og foran/bak fra fast demo-eksamensdato og demo-dag, Epic 4 med kapittelgjennomgang for kapittel 1–3 (5 spørsmål hver med modellsvar og selvvurdering i besøket) og Epic 5 med forklaringsspørsmål og en eksempelvurdering regnet ut med samme regel.
