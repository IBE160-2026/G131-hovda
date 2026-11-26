# Epic 3 Context: Plan mot eksamen

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Eieren legger inn eksamensdatoen for IBE430 (10.12.2026), og studieplanen starter samme dag. Appen fordeler de gjenstående delkapitlene på studiedagene fram til eksamen, sier hver kveld hva økta skal inneholde, viser om eieren ligger foran eller bak og hvordan eieren kommer i rute. Slik slipper eieren å bruke den korte kveldstida på å velge, og etterslep blir synlig mens det fortsatt kan tas igjen. Til slutt får demoen dagens forslag og foran/bak, så sensor og faglærer ser at appen tar beslutningen for brukeren. Senere epics bygger videre på forslaget (gjennomgangsspørsmål i Epic 4, repetisjon av svake temaer i Epic 5).

## Stories

- Story 3.1: Eieren legger inn eksamensdato og planstart
- Story 3.2: Eieren ser om planen holdes, foran eller bak
- Story 3.3: Startsiden viser dagens forslag
- Story 3.4: Demoen viser dagens forslag og foran/bak

## Requirements & Constraints

- **Datoer for IBE430:** Eksamen er 15.12.2026, men eksamensdatoen i appen er måldatoen 10.12.2026, så planen blir ferdig fem dager før og gir tid til repetisjon. Planstart er dagen eksamensdatoen legges inn, med mindre eieren velger en annen dato (ikke 1.10.2026). Det som allerede er gjennomført, telles i G₀, så planen starter uten etterslep.
- **Eksamensdato og planstart:** Kan legges inn og endres. Ny eksamensdato gir ny plan, med planstart samme dag med mindre eieren velger noe annet.
- **Øyeblikksbilde ved planstart:** G₀ = delkapitler gjennomført før planstart, R₀ = delkapitler ikke gjennomført, D = studiedager fra planstart til dagen før eksamensdatoen.
- **Studiedager og fleksible dager:** Mandag–fredag er studiedager, lørdag og søndag fleksible dager.
- **Planformel:** Planlagt i dag = G₀ + ⌈R₀ × d / D⌉, der d er studiedager fra planstart til i går (dagens økt gir ikke etterslep før dagen er over). Forventet i dag = min(planlagt i dag, G₀ + antall ikke-gjennomførte delkapitler med notater). Etterslep = forventet − gjennomførte. Bak når etterslepet er større enn 0, i rute ellers. Delkapitler uten notater gir aldri etterslep.
- **Dagens forslag:** De neste klare, ikke-gjennomførte delkapitlene i nummerrekkefølge. Antall = ⌈R₀ / D⌉ (minst 1), +1 når eieren ligger bak, aldri over 3. Et delkapittel som ikke er klart, foreslås aldri. På fleksible dager foreslås delkapitler bare når eieren ligger bak, ellers ingenting. Er ingen ikke-gjennomførte delkapitler klare, foreslås repetisjon (nye quizer på gjennomførte delkapitler). Eieren kan alltid velge et annet delkapittel selv.
- **Framdriftsindikator:** I tillegg til andelen gjennomført viser den etterslep eller forsprang i antall delkapitler, eller at eieren er i rute. Ved etterslep vises veien tilbake (for eksempel «2 delkapitler i kveld, så er du i rute fredag»).
- **Demo:** Fast demo-eksamensdato, fast planstart og fast demo-dag, så alle besøkende ser samme forslag, og studenten ligger litt bak planen. Fullført delkapittel i demoen oppdaterer framdriften i besøket, men forslaget ligger fast. Fortsatt ingen varig lagring og ingen forespørsler til Supabase.
- **Tester (CI):** Klokka rett før og etter midnatt i Oslo. Planformelen: første dag (d = 0), vanlig etterslep, forsprang, delkapitler uten notater som ikke gir etterslep, og dagen før eksamen. Størrelsen på forslaget: vanlig dag, etterslep, maks 3, fleksibel dag med og uten etterslep, og ingen klare delkapitler.
- Grensesnitt på norsk bokmål, fungerer på mobil, iPad og PC uten sidelengs rulling, og tilgjengelighet teller i vurderingen.

## Technical Decisions

- **Norsk tid via `Clock`:** «I dag», studiedager, helger, d og D regnes i Europe/Oslo gjennom porten `Clock`. Epic 3 trenger en Oslo-adapter i `src/adapters/clock` ved siden av `DemoClock`. Kalenderdatoer lagres som rene datoer, tidspunkter som UTC.
- **Rene regler i `src/domain`:** Planformelen, etterslep og størrelsen på dagens forslag er rene funksjoner med tester. «Har notater» avgjøres bare av `hasNotes()`.
- **Én skriver per entitet:** Bare brukstilfellet `startPlan` skriver G₀, R₀ og D, og bare når eksamensdato eller planstart lagres. «Gjennomført» leses fra `subchapter_completion`, som bare `finishQuiz` skriver. Ingen regner ut gjennomført på egen hånd.
- **Forslaget ligger fast til midnatt:** Dagens forslag regnes ut fra tilstanden ved starten av dagen i Europe/Oslo og endres ikke før midnatt, selv om eieren fullfører et delkapittel midt på dagen.
- **Datamodell:** Ett emne har én studieplan (`study_plan`). Den nye tabellen har eier-FK til `auth.users` med `on delete cascade`, RLS og `GRANT`, og lages med migrering i `supabase/migrations/`, dev før prod.
- **Klar-status:** Et delkapittel er klart når det finnes en klar versjon av både sammendrag og spørsmålsbank. Forslaget bruker denne statusen.
- **Demo:** Planinndataene (demo-eksamensdato, planstart, demo-dag) legges i demofilene av `export-demo` og valideres mot det felles skjemaet i `src/application`. Demoen kjører de samme brukstilfellene med `DemoDataSource` og `DemoClock`, og demo-komposisjonsroten importerer aldri Supabase-adapteren.
- **Navn i kode:** studieplan = studyPlan, etterslep = backlog, dagens forslag = dailySuggestion, økt = session. Grensesnitt og dokumentasjon på norsk.

## UX & Interaction Patterns

- Startsiden er oversiktlig, imøtekommende og fargerik, med dagens forslag og framdriftsindikatoren øverst (for eksempel «I kveld: delkapittel 3.2, deretter quiz»). Økta startes med ett trykk.
- Etterslep vises tydelig markert, med hva som skal gjøres og når eieren er i rute igjen. Ingen skyldspråk som «du har ikke gjort …».
- På en fleksibel dag uten etterslep vises ingen forslag, men eieren kan starte en økt selv.
- I demoen vises samme startside med forslag og foran/bak, og demomerket som før.

## Cross-Story Dependencies

- Bygger på Epic 1 (`finishQuiz`, `subchapter_completion`, klar-status, `hasNotes`, startsiden og framdriftsindikatoren med andel) og Epic 2 (demofilene, skjemaet, `export-demo`, `DemoDataSource` og `DemoClock`).
- 3.1 (Oslo-klokke, eksamensdato, `startPlan`, tabell) før 3.2 og 3.3, som leser øyeblikksbildet.
- 3.2 (planformel og etterslep) før 3.3, fordi forslaget får +1 og fleksible dager når eieren ligger bak.
- 3.4 kommer sist og bruker regler og skjermer fra 3.1–3.3 med faste demodatoer.
- Epic 4 utvider dagens forslag med gjennomgangsspørsmål og Epic 5 med repetisjon av svake temaer, så forslagsmodellen bør tåle flere slags elementer.
