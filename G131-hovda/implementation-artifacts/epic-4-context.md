# Epic 4 Context: Kapittelgjennomgang med modellsvar

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Når alle delkapitlene i et kapittel er gjennomført, går eieren gjennom hele kapittelet med gjennomgangsspørsmålene (vanligvis de faglæreren har gitt), svarer med egne ord, ser et modellsvar med hovedpunktene målt mot læringsutbyttet og vurderer selv hvor mye svaret fikk med. Det binder delkapitlene sammen slik muntlig eksamen i IBE430 gjør. Spørsmålene fordeles på flere kvelder gjennom dagens forslag, så kapittel 1 med 29 spørsmål tar omtrent tre kvelder uten at planen sprekker. Appen kaller aldri en KI-leverandør: spørsmål kommer fra notatfilene og modellsvar fra innholdsfilene via importen. Til slutt får demoen en kapittelgjennomgang med modellsvar.

## Stories

- Story 4.1: Importen legger inn gjennomgangsspørsmålene
- Story 4.2: Kapittelgjennomgangen åpnes, og eieren svarer på spørsmålene
- Story 4.3: Eieren ser modellsvaret og vurderer svaret sitt
- Story 4.4: Dagens forslag tar med gjennomgangsspørsmål
- Story 4.5: Importen lager gjennomgangsspørsmål når kapittelet ikke har noen (kan flyttes til Epic 5)
- Story 4.6: Demoen viser kapittelgjennomgang med modellsvar (kan kuttes)

## Requirements & Constraints

- **Kilde og tolking:** Gjennomgangsspørsmål kommer bare fra `## Gjennomgangsspørsmål` i `notater/<EMNE>/kapittel-<n>.md` (i dag kapittel 1, 2, 4 og 5). Deterministisk tolking uten KI: en linje som starter med heltall og punktum («1.») starter et nytt spørsmål, linjer uten nummer hører til spørsmålet over. Testdataene for kapittel 1 (PRD-addendumet) skal gi 29 spørsmål i riktig rekkefølge.
- **Lagring:** Spørsmålene hører til kapittelet, ikke et delkapittel, i rekkefølgen de står. De gjenkjennes på normalisert tekst, så ny kjøring gir ingen duplikater. Endret tekst gir nytt spørsmål, og det gamle trekkes tilbake med status og slettes aldri. Mangler seksjonen, blir eksisterende spørsmål stående urørt. Kapittellisten viser antall gjennomgangsspørsmål per kapittel.
- **Åpning:** Gjennomgangen er tilgjengelig når alle delkapitlene i kapittelet har `subchapter_completion`, ellers ikke. Appen sier fra når den blir klar, og den vises ved kapittelet i kapittellisten.
- **Gjennomføring:** Spørsmålene kommer ett om gangen i fast rekkefølge, i en økt. Ingen tidsbegrensning. Eieren kan stoppe når som helst. Et overhoppet spørsmål kommer igjen sist. En avbrutt gjennomgang fortsetter fra neste ubesvarte spørsmål. Når alle er besvart, er gjennomgangen fullført og merket, og den kan tas på nytt. Den påvirker ikke avkrysning, plan eller etterslep, men teller i vurderingen (Epic 5).
- **Modellsvar og selvvurdering:** Modellsvaret (hovedpunkter på norsk, med læringsutbyttet det måles mot og ordlyden) vises først når svaret er lagret, på under 3 sekunder og uten KI-kall. For gjennomgangsspørsmål bygger modellsvaret på notatene i hele kapittelet. Eieren velger «Fikk med det meste», «Fikk med noe» eller «Fikk med lite», og valget lagres med svaret og økta. Mangler modellsvar, lagres svaret og eieren får beskjed om at modellsvaret ikke er laget ennå.
- **Dagens forslag:** Er en gjennomgang klar og ikke fullført, får forslaget 10 gjennomgangsspørsmål ved 0–1 delkapitler, 5 ved 2 og ingen ved 3. Etterslep på delkapitler går foran. Gjennomgangsspørsmålene kommer etter delkapitlene i økta, fra neste ubesvarte.
- **KI-lagde spørsmål:** Kapitler uten seksjonen og uten lagrede spørsmål, der alle delkapitler med notater er klare, får 10 spørsmål med modellsvar fra `## Gjennomgangsspørsmål (laget med KI)` i innholdsfila, merket som laget med KI. Legger eieren senere til egne spørsmål i notatfilen, erstatter de de KI-lagde, som trekkes tilbake med status.
- **Demo:** `export-demo` tar med 5 gjennomgangsspørsmål med modellsvar for hvert av kapitlene 1–3, og valideringen feiler hvis et kapittel mangler. Svar og selvvurdering lagres bare i besøket, uten KI-kall og uten Supabase.
- **Tester (CI):** Tolking av gjennomgangsspørsmål (29 for kapittel 1), åpning av kapittelgjennomgang, og antall gjennomgangsspørsmål i forslaget (0, 1, 2 og 3 delkapitler, og flere klare gjennomganger samtidig).
- Grensesnitt på norsk bokmål, fungerer på mobil, iPad og PC uten sidelengs rulling, og tilgjengelighet teller i vurderingen.

## Technical Decisions

- **Rene regler i `src/domain`:** Tolkingen av gjennomgangsspørsmål, regelen for når gjennomgangen åpnes og antall gjennomgangsspørsmål i forslaget er rene funksjoner med tester. Innholdsfila valideres mot et fast skjema i `src/domain` før importen skriver noe, og modell og instruksjonsversjon lagres på innholdet.
- **Notatfilene eier spørsmålene:** For emner med notatfiler oppretter og endrer bare importen gjennomgangsspørsmål. Importen validerer hele fila før den skriver. Innliming i appen er utsatt [Bør] og skriver aldri til emner med notatfiler.
- **Stabile spørsmål:** Gjennomgangsspørsmål har stabil ID, trekkes tilbake med status og slettes aldri.
- **Økter:** All besvarelse skjer i en `session`. Skrevne svar (`written_answer`) knyttes til økta og får en selvvurdering (`self_assessment`). Bare `endSession` avslutter økta.
- **Én skriver per entitet:** Gjennomgangsspørsmål og KI-innhold skrives bare av importen, gjennomført bare av `finishQuiz`. Andre leser via `DataSource` og regner ikke ut avledet tilstand selv.
- **Datamodell:** Kapittel har mange `review_question`. Nye tabeller har eier-FK til `auth.users` med `on delete cascade`, RLS og `GRANT`, og lages med migrering i `supabase/migrations/`, dev før prod. Import krever `--target dev|prod`, og prod må bekreftes.
- **Demo:** Samme brukstilfeller med `DemoDataSource` (frosne filer, minne, `sessionStorage`) og `DemoClock`. Demofilene valideres mot det felles skjemaet i `src/application`, og demo-komposisjonsroten importerer aldri Supabase-adapteren.
- **Navn i kode:** gjennomgangsspørsmål = reviewQuestion, kapittelgjennomgang = chapterReview, tilbakemelding = feedback, vurdering = assessment, dagens forslag = dailySuggestion, økt = session.
- **Åpent i planen:** Planen sier at modellsvaret kommer fra innholdsfila, men innholdsfilformatet navngir bare seksjonen for KI-lagde gjennomgangsspørsmål. Hvor modellsvar til spørsmålene fra notatfilen ligger, må avklares (sannsynligvis i 4.3).

## UX & Interaction Patterns

- Kapittellisten viser tydelig status per kapittel: antall gjennomgangsspørsmål, «kapittelgjennomgang klar» og «fullført».
- Én spørsmålsvisning om gangen med fritekstfelt, «hopp over» og mulighet til å stoppe. Modellsvaret vises etter lagring, deretter tre selvvurderingsvalg.
- Modellsvar er korte, ærlige og vennlige og nevner det som går bra før det som mangler.
- Dagens forslag på startsiden startes med ett trykk, og gjennomgangsspørsmålene kommer etter delkapitlene.
- Demoen er tydelig merket, og funksjoner som endrer data er skjult.

## Cross-Story Dependencies

- Bygger på Epic 1 (import, `hasNotes`, klar-status, `finishQuiz`/`subchapter_completion`, kapittellisten), Epic 2 (demofiler, skjema, `export-demo`) og Epic 3 (dagens forslag, etterslep, `Clock`).
- 4.1 (tolking og lagring) før 4.2 (åpning og besvarelse), som må finnes før 4.3 (modellsvar og selvvurdering på lagrede svar).
- 4.4 trenger 4.2 (klar og ikke fullført, neste ubesvarte) og utvider forslagsmodellen fra Epic 3.
- 4.5 utvider importen fra 4.1. 4.6 kommer sist og bruker 4.1–4.3.
- Epic 5 gjenbruker svar og selvvurdering fra 4.3 for forklaringsspørsmål, og vurderingen (FR-21) leser selvvurderingene.
