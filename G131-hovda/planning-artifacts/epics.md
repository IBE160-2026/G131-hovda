---
stepsCompleted: [1, 2]
inputDocuments:
  - G131-hovda/planning-artifacts/prds/prd-G131-hovda-2026-09-27/prd.md
  - G131-hovda/planning-artifacts/prds/prd-G131-hovda-2026-09-27/addendum.md
  - G131-hovda/planning-artifacts/architecture/architecture-G131-hovda-2026-10-08/ARCHITECTURE-SPINE.md
  - G131-hovda/notater/IBE430/kapittel-1.md
---

# Studievenn – epics og stories

## Oversikt

Dokumentet deler kravene i PRD-en og arkitekturbeslutningene for Studievenn opp i epics og stories som kan implementeres. Det finnes ikke noe eget UX-dokument. UI-kravene kommer fra brukerreisene (PRD §2.3) og «Utseende og tone» (PRD §6).

Merk: Addendumet («Demo og tilgangslås») beskriver tilgangslåsen som et passord eller en hemmelig lenke. Det er erstattet av AD-9 (Supabase-innlogging fra dag én) og PRD FR-25 (oppdatert 25.10.2026).

## Kravoversikt

### Funksjonskrav

Trinnmerking: [D1] = del 1, [D2] = del 2, [D3] = del 3 (alle Må). [Bør] og [Strekk] bygges bare hvis tiden strekker til. Del 1 og 2 skulle leveres 1.11.2026, del 3 skal leveres 15.11.2026, og alt skal være i drift 22.11.2026.

- **FR-25 [D1]: Tilgangslås.** Vanlig innlogging med bare utviklerens konto og registrering slått av. Uinnloggede kommer bare til demoen. Data fra del 1 hører allerede til eierens konto.
- **FR-1 [D2]: Opprette konto og logge inn.** Brukeren ser bare egne data, og forsøk på å hente andres data avvises. Innloggingen huskes i minst 30 dager. Passord kan tilbakestilles via e-post. (AD-9: registrering forblir av til appen åpnes for andre.)
- **FR-2 [D2]: Slette konto og data.** Etter sletting finnes ingen notater, svar eller vurderinger som kan knyttes til brukeren.
- **FR-26 [D1, utvides D2/D3]: Demo uten innlogging.** Åpnes med ett trykk fra forsiden og er tydelig merket. IBE430 kap. 1–4 (eller de som er klare) har struktur, læringsutbytte, sammendrag og spørsmålsbank, med minst 20 spørsmål per delkapittel og minst 2 per tema. D1: emneliste, kapittelliste, sammendrag, quiz (FR-14/15) og andel gjennomført, og en avbrutt quiz kan fortsettes i samme besøk. D2: dagens forslag og foran/bak med fast demo-eksamensdato og demo-dag, og kapittelgjennomgang for kap. 1–3 med 5 spørsmål hver og fast eksempeltilbakemelding. D3: minst ett forklaringsspørsmål per kapittel med eksempeltilbakemelding, og en eksempelvurdering. Ingen KI-kall, ingen varig lagring og ingen innsamling av personopplysninger. Funksjoner som oppretter eller endrer data, er skjult. Demodata lages bare med en egen kommando.
- **FR-3 [D1, eksamensdato D2]: Opprette og velge emne.** Emnekode og navn kan opprettes, endres og slettes. Brukeren kan ha flere emner med hver sin framdrift og velger aktivt emne i emnelisten. Nye emner krever ingen kodeendring. D2: eksamensdato og planstart (standard samme dag, IBE430 = 1.10.2026). Endres eksamensdatoen, beregnes planen på nytt.
- **FR-4 [Bør]: Lime inn kapittelstruktur** (bare for emner uten notatfiler). Deterministisk tolking: «1.» blir kapittel, «-» eller «1.1» blir delkapittel. Testdata fra addendumet gir 6 kapitler og 21 delkapitler. Resultatet kan redigeres før lagring.
- **FR-5 [Bør]: Oversette titler til norsk.** Titlene kan rettes, og den engelske originalen tas vare på.
- **FR-6 [D1]: Læringsutbytte og eksamensform.** Limes inn som tekst. Styrer sammendrag, forklaringsspørsmål, tilbakemelding og vurdering, som viser til minst ett læringsutbytte. Ved muntlig eksamen skal brukeren forklare med egne ord.
- **FR-7 [Bør]: Hente læringsutbytte fra himolde.no.** Feiler hentingen, kan teksten limes inn selv.
- **FR-8 [D1]: Importere notater fra notatfilene.** `notater/<EMNE>/kapittel-<n>.md` gir kapitler, delkapitler og notat per delkapittel. Importen lager sammendrag, spørsmålsbank og forklaringsspørsmål for nye eller endrede delkapitler. Endrede notater gir nytt sammendrag, og ubrukte spørsmål erstattes. Delkapitler uten notater (også plassholderen) får status «mangler notater». Feiler KI-en, beholdes notatene og tidligere innhold, statusen blir «innhold lages», «klart» eller «feilet», og neste import prøver på nytt. Et delkapittel er klart først når både sammendrag og spørsmålsbank finnes. Innliming i appen er [Bør].
- **FR-9 [D2]: Studieplan.** Ved planstart registreres G₀, R₀ og D. Planlagt i dag = G₀ + ⌈R₀ × d / D⌉, der d er antall studiedager fra planstart til i går. Forventet i dag = min(planlagt i dag, G₀ + antall ikke-gjennomførte delkapitler med notater). Etterslep = forventet − gjennomførte. Brukeren ligger bak når etterslepet er større enn 0. Da får forslaget +1 delkapittel og forslag også på fleksible dager. Ny eksamensdato gir ny plan.
- **FR-10 [D1/D2/D3]: Starte økt og dagens forslag.** D1: brukeren velger emne og et klart delkapittel og får sammendrag og quiz. En avbrutt quiz fortsetter der den slapp, med svarene lagret. D2: dagens forslag på startsiden, med start i ett trykk. Antall delkapitler er ⌈R₀/D⌉ (minst 1), +1 når brukeren ligger bak, og maks 3. Er en kapittelgjennomgang klar, legges det til 10, 5 eller 0 gjennomgangsspørsmål (ved 0–1, 2 eller 3 delkapitler). Er ingen nye delkapitler klare, foreslås repetisjon. Brukeren kan fortsatt velge selv. D3: opptil 5 quizspørsmål om svake temaer som repetisjon, som ikke teller i resultatet.
- **FR-11 [D1]: Vise sammendrag.** På norsk, bare fra brukerens notater, maks 600 ord.
- **FR-12 [D1, kan flyttes til D2]: Feilrapport på sammendrag.** Sammendraget merkes og lages på nytt ved neste import. Til da vises det gamle.
- **FR-13 [D1]: Spørsmålsbank.** Hvert spørsmål har fasit, forklaring og tema. Banken har 20 spørsmål per delkapittel. Når færre enn 10 er ubesvart, fyller neste import den på.
- **FR-14 [D1]: Ta quiz.** 10 flervalgsspørsmål med 4 alternativer. Ved feil svar vises riktig svar og forklaring med en gang. Et feilbesvart tema får et nytt spørsmål senere i samme quiz, som erstatter et gjenstående spørsmål. Var feilen på det siste spørsmålet, kommer det nye i neste quiz. Det er aldri samme spørsmål på nytt. Resultatet vises som «8 av 10 riktige».
- **FR-15 [D1]: Krysse av gjennomført delkapittel.** Minst 80 % riktige gir avkrysning. Under 80 % kan delkapittelet tas på nytt (fra D2 foreslås det igjen).
- **FR-16 [D1, kan flyttes til D2]: Feilrapport på quizspørsmål.** Spørsmålet tas ut med en gang og erstattes ved neste import. Det teller ikke i resultatet, som da regnes av de gjenværende (for eksempel 8 av 9).
- **FR-17 [D3, kan kuttes]: Forklaringsspørsmål etter quiz.** Fra samme delkapittel, ikke i to økter på rad og minst hver tredje økt. Kan hoppes over.
- **FR-18 [D3]: Velge forklaringsspørsmål selv.** For et emne eller et delkapittel med notater.
- **FR-19 [D2]: Svare og få tilbakemelding.** Ingen tidsbegrensning. Tilbakemeldingen er på norsk og sier hva som var bra og hva som manglet, målt mot læringsutbyttet og notatene (for gjennomgangsspørsmål notatene i hele kapittelet). Svaret lagres før KI-kallet. Feiler KI-en, får brukeren beskjed og kan prøve igjen uten å skrive svaret på nytt.
- **FR-27 [D2]: Gjennomgangsspørsmål.** Kommer fra `## Gjennomgangsspørsmål` i notatfilen via importen. Mangler seksjonen, røres ikke eksisterende spørsmål. Deterministisk tolking: «1.» starter et spørsmål, og linjer uten nummer hører til spørsmålet over. Kapittel 1 gir 29 spørsmål (testdata). Spørsmålene hører til kapittelet. Uten innlimte spørsmål lager KI-en 10, merket som laget av appen (KI-genererte spørsmål kan flyttes til D3). Innliming i appen er [Bør].
- **FR-28 [D2]: Kapittelgjennomgang.** Blir tilgjengelig når alle delkapitlene i kapittelet er gjennomført. Appen sier fra, og den vises i kapittellisten. Spørsmålene kommer ett om gangen i fast rekkefølge, fordelt via dagens forslag eller startet av brukeren selv. Hvert svar får tilbakemelding (FR-19). Et overhoppet spørsmål kommer igjen sist. Når alle er besvart, er gjennomgangen fullført og merket, og den kan tas på nytt. Den påvirker ikke avkrysning, plan eller etterslep, men teller i vurderingen. En avbrutt gjennomgang fortsetter fra neste ubesvarte spørsmål.
- **FR-20 [D1/D2]: Framdriftsindikator.** D1: andel gjennomførte delkapitler og hvor langt det er igjen til målet (90 %, for IBE430 19 av 21). D2: foran eller bak planen med antall delkapitler, og når brukeren ligger bak, en tydelig vei tilbake («2 delkapitler i kveld, så er du i rute fredag»).
- **FR-21 [D3]: Vurdering etter hver økt.** 1–2 setninger på norsk om hva brukeren har kontroll på og hva som trenger arbeid, målt mot læringsutbyttet. Oppgir hva den bygger på (antall quizer, forklarings- og gjennomgangsspørsmål). Vises etter økta og på startsiden. Svake temaer brukes i FR-10. Feiler KI-en, beholdes forrige vurdering.
- **FR-22 [Bør]: Påminnelse på studiedager** (push, standard kl. 21:15, kan slås av og på).
- **FR-23 [Bør]: Varsel når brukeren ligger bak** (daglig til brukeren er i rute, ett samlet varsel).
- **FR-24 [Strekk]: Svare med tale** (norsk diktering, teksten vises før den sendes).

### Ikke-funksjonelle krav

- **NFR-1 Enheter:** Mobil, iPad og PC i nyere Safari og Chrome, uten sidelengs rulling.
- **NFR-2 Språk:** Grensesnitt og alt KI-innhold på norsk bokmål.
- **NFR-3 Rask start:** Startsiden og sammendraget vises på under 3 s (innholdet er laget på forhånd). Tilbakemelding kommer på under 20 s.
- **NFR-4 Personvern:** Data i EU/EØS. KI-leverandøren trener ikke på dataene. Ingen andre personopplysninger enn e-post og det brukeren legger inn. Demoen samler ingen.
- **NFR-5 Sikkerhet:** Data skjermes per bruker (og bak tilgangslåsen i del 1). Demoen har aldri tilgang til brukerdata. All trafikk går over HTTPS.
- **NFR-6 Kostnad:** KI-kostnad på maks 100 kr i måneden per bruker. Demoen gjør ingen KI-kall.
- **NFR-7 I drift:** Appen og demoen ligger på en offentlig adresse fra del 1, og hvert trinn settes i drift når det er ferdig.
- **NFR-8 Kvalitetssikring:** Automatiske tester av tolking (kapittelliste og gjennomgangsspørsmål), åpning av kapittelgjennomgang, antall gjennomgangsspørsmål i forslaget, 80 %-avkrysning, nytt spørsmål om samme tema, studieplan, foran/bak, størrelsen på forslaget, at demoen aldri skriver til brukerdata, at demodataene har minst 20 spørsmål per delkapittel og minst 2 per tema, og at data fra del 1 følger med til del 2.

### Tilleggskrav fra arkitekturen

**Oppstart (påvirker story 1.1):** Arkitekturen angir ingen ferdig startmal, men et nytt Next.js 16.4-prosjekt (minst 16.4.1) i TypeScript med kildetreet `src/domain`, `src/application`, `src/adapters/{supabase,bedrock,demo,clock}`, `src/app`, `scripts/`, `supabase/migrations/` og `demo-data/`. Prosjektet trenger også Vitest, GitHub Actions (typesjekk, lint og domenetester ved push), `.env.example` og `vercel.json` med `regions: ["fra1"]`.

- **AD-1 Ports and adapters:** `src/domain` importerer ingenting utenfra. `src/app` og `scripts` importerer aldri `src/adapters` direkte, og det er én komposisjonsrot per inngangspunkt. `domain` og `application` bruker ingen serverkode, slik at de kan kjøre i nettleseren.
- **AD-2 Domeneregler:** 80 %-grensen, planformelen, nytt spørsmål om samme tema, størrelsen på forslaget, åpning av kapittelgjennomgang og tolking er rene funksjoner i `src/domain` med tester. `hasNotes()` er eneste definisjon av «har notater» (tom tekst, bare mellomrom og `*Ingen notater ennå.*` gir false).
- **AD-3 Demo:** Samme brukstilfeller i nettleseren med `DemoDataSource` (frosne filer, minne og `sessionStorage`) og `DemoClock`. Felles skjema for demofilene i `src/application`, validert av både `scripts/export-demo.ts` og demo-adapteren.
- **AD-4 Import:** Eksplisitt og idempotent kommando. `inputHash` = hash(normalisert notat + kapittelets læringsmål og nøkkelbegreper + promptversjon). `## Råtekst` og `## Rettelser` er aldri med. Importen fyller på banker med færre enn 10 ubesvarte spørsmål og lager erstatninger. `--force <n.m>` tvinger fram ny generering.
- **AD-5 Identitet:** Kapitler identifiseres av (eier, emnekode, nr.) og delkapitler av (eier, emnekode, «n.m»). Titler er attributter.
- **AD-6 Spørsmål:** Stabil ID, trekkes tilbake med status og slettes aldri. Bare ubrukte KI-spørsmål trekkes tilbake ved endrede notater. En quiz som er i gang, beholder spørsmålene sine. Brukerens egne spørsmål (`## Spørsmålsbank` i notatfilen) erstattes aldri, og brukerens fasit er autoritativ: KI lager bare tre gale alternativer, en forklaring og et tema.
- **AD-7 KI-modul:** Porten `AiProvider` med `AnthropicBedrock` i eu-central-1. Versjonerte prompter, skjemavalidering før lagring, modell-ID og promptversjon lagres. Én innstillingsfil for modell og effort per oppgave: Opus 5.5 for FR-19, Sonnet 5.5 for FR-11, 13, 17, 18 og 21, Haiku 5.5 for FR-5. Alle ID-er er `eu.anthropic.claude-…`, og en test avviser andre prefikser. Læringsutbytte, læringsmål og nøkkelbegreper sendes med som kontekst.
- **AD-8 Versjoner:** Sammendrag og spørsmålsbank har versjoner med status `lages`, `klart` eller `feilet`. Siste klare versjon vises, og en feilet generering tar aldri bort en klar versjon.
- **AD-9 Supabase Auth fra dag én:** Bare eierens konto, offentlig registrering av, ingen egen passordmekanisme.
- **AD-10 RLS:** Alle brukertabeller har eier-FK til `auth.users` med `on delete cascade` og RLS. Endringer gjøres bare med migreringer (`supabase/migrations/`), dev før prod, og hver ny tabell har RLS og `GRANT`.
- **AD-11 Tid:** All datologikk i Europe/Oslo via `Clock`. Rene datoer for kalenderdager, UTC for tidspunkter.
- **AD-12 Miljøer:** Supabase dev og prod i Frankfurt, Vercel i fra1, ingen Next-middleware. Import og eksport krever `--target dev|prod` med `.env.dev.local` eller `.env.prod.local`, og prod må bekreftes. `OWNER_EMAIL` brukes til å finne eieren. `export-demo` leser fra prod. Forhåndsvisninger går mot dev, og `main` går mot prod.
- **AD-13:** Bare `finishQuiz` skriver `subchapter_completion`, én gang, og den angres aldri.
- **AD-14:** Temaer er egne enheter per delkapittel og opprettes når banken lages. Påfylling bruker den eksisterende temalisten.
- **AD-15:** Bare `startPlan` skriver G₀, R₀ og D. Dagens forslag ligger fast til midnatt (Oslo).
- **AD-16:** Hver økt er en `session`, og alle svar knyttes til den. Bare `endSession` avslutter økta og ber om én vurdering.
- **AD-17:** Notatfilene eier strukturen (`### n.m Tittel`) og gjennomgangsspørsmålene. Importen validerer hele filen (prefiks og duplikater) før den skriver noe. Spørsmål gjenkjennes på normalisert tekst. Innliming i appen skriver aldri til emner med notatfiler.
- **AD-18:** Bare FR-19 og FR-21 kaller KI fra appen (synkront på Vercel). En feilrapport merker eller trekker tilbake med en gang, og importen lager erstatningen.
- **Konvensjoner:** Hver entitet har én skriver. Kode bruker engelske navn etter fast ordliste, mens grensesnitt, prompter, commits og dokumentasjon er på norsk. Hemmeligheter ligger i `.env*` og Vercel-miljøvariabler. Ukentlig `supabase db dump` av prod. Små commits.
- **Avklares før første KI-kode:** Bedrock-pris i EU-profilen, AWS sine vilkår om trening (NFR-4), modelltilgang i eu-central-1. Det krever en AWS-konto med fakturering og IAM-nøkler i Vercel-miljøvariabler.
- **Notatformat (fra `kapittel-1.md`):** Frontmatter (`emne`, `kapittel`, `tittel`), `## Læringsmål for kapittelet`, delkapitler som `### n.m Tittel`, valgfri `## Spørsmålsbank` (brukerens egne spørsmål), `## Gjennomgangsspørsmål`, `## Rettelser` og `## Råtekst` (de to siste ignoreres av KI og hash).

### Krav til UX-design

Det finnes ikke noe UX-dokument. Krav fra PRD §2.3 og §6 som påvirker stories:

- **UX-1:** Startsiden er oversiktlig, imøtekommende og fargerik. Dagens forslag, framdriftsindikator og siste vurdering vises øverst.
- **UX-2:** Dagens økt startes med ett trykk fra startsiden, og demoen med ett trykk fra forsiden.
- **UX-3:** Meldinger om etterslep viser veien tilbake (hva som skal gjøres og når brukeren er i rute igjen), uten skyldspråk.
- **UX-4:** KI-tekst er kort, ærlig og vennlig og nevner det som går bra før det som mangler.
- **UX-5:** Demoen er tydelig merket, og funksjoner som oppretter eller endrer data, er skjult der.
- **UX-6:** Responsiv layout for mobil, iPad og PC uten sidelengs rulling (NFR-1). Tilgjengelighet (kontrast, tastatur, semantikk) teller i IBE160.
- **UX-7:** Delkapittelstatus vises tydelig i kapittellisten («mangler notater», «innhold lages», «klart», «feilet», gjennomført, kapittelgjennomgang klar eller fullført).

### Datoer (besluttet 09.11.2026)

- **Eksamen i IBE430:** 15.12.2026.
- **Måldato 10.12.2026, for både plan og app:** IBE430 legges inn i appen med 10.12 som eksamensdato (FR-3), slik at studieplanen (FR-9) blir ferdig fem dager før eksamen og det blir tid til repetisjon. Appen kan forbedres fram til samme dato. Rekkefølgen på epicene er fortsatt prioriteringen.
- **Planstart for IBE430:** dagen eksamensdatoen legges inn (standardregelen i FR-3), ikke 1.10.2026 som PRD-en sier. Det som allerede er gjennomført, telles med i G₀, så planen starter uten etterslep. Avvik fra PRD FR-3, besluttet 09.11.2026. PRD-ens måldatoer (1.11 og 15.11) og IBE160-fristen 22.11 (ikke bekreftet, PRD §11) er ikke endret i PRD-en. Gjelder 22.11 som innleveringsfrist i IBE160, må det som er i drift da, leveres.

### Dekning av FR

| FR | Epic | Kort |
|---|---|---|
| FR-1 | Epic 6 | Passord-tilbakestilling, huskes i 30 dager, data per bruker |
| FR-2 | Epic 6 | Slette konto og data |
| FR-3 | Epic 1 (emne), Epic 3 (eksamensdato, planstart) | Opprette og velge emne |
| FR-4 | Utsatt [Bør] | Lime inn kapittelstruktur |
| FR-5 | Utsatt [Bør] | Oversette titler |
| FR-6 | Epic 1 | Læringsutbytte og eksamensform |
| FR-7 | Utsatt [Bør] | Hente fra himolde.no |
| FR-8 | Epic 1 (innliming i appen: utsatt [Bør]) | Import fra notatfilene |
| FR-9 | Epic 3 | Studieplan |
| FR-10 | Epic 1 (velge selv), Epic 3 (dagens forslag), Epic 4 (gjennomgangsspørsmål i forslaget), Epic 5 (repetisjon) | Økt og dagens forslag |
| FR-11 | Epic 1 | Sammendrag |
| FR-12 | Epic 1 | Feilrapport på sammendrag |
| FR-13 | Epic 1 | Spørsmålsbank |
| FR-14 | Epic 1 | Quiz |
| FR-15 | Epic 1 | Avkrysning ved 80 % |
| FR-16 | Epic 1 | Feilrapport på quizspørsmål |
| FR-17 | Epic 5 | Forklaringsspørsmål etter quiz |
| FR-18 | Epic 5 | Velge forklaringsspørsmål selv |
| FR-19 | Epic 4 | Svar og KI-tilbakemelding |
| FR-20 | Epic 1 (andel), Epic 3 (foran/bak) | Framdriftsindikator |
| FR-21 | Epic 5 | Vurdering |
| FR-22 | Utsatt [Bør] | Påminnelse |
| FR-23 | Utsatt [Bør] | Varsel ved etterslep |
| FR-24 | Utsatt [Strekk] | Tale |
| FR-25 | Epic 1 | Tilgangslås |
| FR-26 | Epic 2 (del 1), Epic 3, 4 og 5 (utvidelser) | Demo |
| FR-27 | Epic 4 (innliming i appen: utsatt [Bør]) | Gjennomgangsspørsmål |
| FR-28 | Epic 4 | Kapittelgjennomgang |

NFR-ene gjelder alle epics. NFR-7 (i drift) og NFR-8 (tester) innføres i Epic 1 og gjelder videre. Hver story som legger til en regel fra NFR-8, har testen med i akseptansekriteriene.

## Epics

Rekkefølgen er byggerekkefølgen og prioriteringen. Hver epic kan brukes uten senere epics. Demoen utvides i slutten av hver epic etter Epic 2.

### Epic 1: Kveldsøkta virker, for eieren
Eieren logger inn, velger IBE430, åpner et klart delkapittel i kapittel 1–4, leser KI-sammendraget og tar quizen. Delkapittelet krysses av ved 80 %, og framdriften vises. Innholdet kommer fra notatfilene via importkommandoen, og appen er i drift på Vercel. Første story setter opp prosjektet (Next.js, lag, Vitest, CI, Supabase dev og prod, deploy).
**FR:** FR-25, FR-3 (uten eksamensdato), FR-6, FR-8, FR-10 (velge selv), FR-11, FR-13, FR-14, FR-15, FR-20 (andel), FR-12, FR-16 (de to siste kan flyttes)

### Epic 2: Demoen, så faglærer og sensor kan prøve uten konto
Hvem som helst åpner «Prøv demoen» fra forsiden og tar kveldsøkta med IBE430 kapittel 1–4, uten KI-kall og uten å røre eierens data.
**FR:** FR-26 (del 1-innhold)

### Epic 3: Plan mot eksamen
Eieren legger inn eksamensdato (for IBE430: 10.12.2026), og planen starter samme dag. Appen sier hver kveld hva som skal gjøres, viser om eieren ligger foran eller bak, og hvordan eieren kommer i rute. Demoen får dagens forslag.
**FR:** FR-3 (eksamensdato og planstart), FR-9, FR-10 (dagens forslag), FR-20 (foran/bak), FR-26 (del 2: forslag)

### Epic 4: Kapittelgjennomgang med KI-tilbakemelding
Når et kapittel er gjennomført, svarer eieren på gjennomgangsspørsmålene med egne ord og får tilbakemelding målt mot læringsutbyttet. Spørsmålene fordeles på flere kvelder gjennom dagens forslag. Demoen får gjennomgang med eksempeltilbakemeldinger.
**FR:** FR-27, FR-28, FR-19, FR-10 (gjennomgangsspørsmål i forslaget), FR-26 (del 2: gjennomgang)

### Epic 5: Trening til muntlig eksamen og vurdering
Eieren trener på forklaringsspørsmål, enten valgt selv eller som overraskelse etter quizen, og får etter hver økt en kort, ærlig vurdering. Svake temaer kommer tilbake som repetisjon. Demoen får eksempler.
**FR:** FR-18, FR-21, FR-17, FR-10 (repetisjon), FR-26 (del 3)

### Epic 6: Kontoen din
Eieren kan tilbakestille passordet, innloggingen huskes i 30 dager, og kontoen og alle data kan slettes. Registrering forblir av (AD-9).
**FR:** FR-1, FR-2

### Utsatt (Bør og strekkmål, ingen stories nå)
FR-4, FR-5 og FR-7 (nye emner uten notatfiler), innliming av notater og gjennomgangsspørsmål i appen (FR-8, FR-27), FR-22 og FR-23 (push-varsler), FR-24 (tale).

## Epic 1: Kveldsøkta virker, for eieren

Eieren logger inn, velger IBE430, åpner et klart delkapittel i kapittel 1–4, leser KI-sammendraget og tar quizen. Delkapittelet krysses av ved 80 %, og framdriften vises. Innholdet kommer fra notatfilene via importkommandoen, og appen er i drift på Vercel.

### Story 1.1: Prosjektet er satt opp og forsiden er i drift

Som eier
vil jeg ha et Next.js-prosjekt med arkitekturens lag, tester og automatisk deploy,
slik at hver ny funksjon kan bygges, testes og settes i drift med en gang (NFR-7, NFR-8).

**Akseptansekriterier:**

**Gitt** et tomt repo
**Når** prosjektet opprettes
**Så** er det Next.js 16.4 (minst 16.4.1) med TypeScript, og kildetreet `src/domain`, `src/application`, `src/adapters/{supabase,bedrock,demo,clock}`, `src/app`, `scripts/`, `supabase/migrations/` og `demo-data/` finnes
**Og** en lint-regel feiler hvis `src/domain` importerer fra andre lag eller fra rammeverk-, database- eller KI-pakker, eller hvis `src/app` eller `scripts` importerer fra `src/adapters` direkte (AD-1)

**Gitt** prosjektet
**Når** `npm test` kjøres
**Så** kjører Vitest minst én domenetest
**Og** GitHub Actions kjører typesjekk, lint og domenetester ved hver push

**Gitt** at `main` pushes
**Når** Vercel bygger
**Så** er forsiden tilgjengelig på en offentlig HTTPS-adresse, med funksjonsregion `fra1` satt i `vercel.json` og uten Next.js-middleware (AD-12)
**Og** forsiden er på norsk bokmål, sier kort hva Studievenn er, og har en knapp for å logge inn
**Og** siden kan brukes på mobil, iPad og PC uten sidelengs rulling (NFR-1)

**Gitt** prosjektet
**Når** noen ser i repoet
**Så** lister `.env.example` alle miljøvariabler uten verdier, `.env*.local` er i `.gitignore`, og README forklarer hvordan appen kjøres lokalt

### Story 1.2: Eieren logger inn bak tilgangslåsen

Som eier
vil jeg logge inn med min egen konto, mens ingen andre kan registrere seg,
slik at dataene mine er beskyttet fra første dag (FR-25, AD-9).

**Akseptansekriterier:**

**Gitt** Supabase-prosjektene `dev` og `prod` i eu-central-1 med e-post og passord som innlogging, offentlig registrering slått av og bare eierens konto opprettet
**Når** eieren logger inn med riktig e-post og passord
**Så** kommer eieren til startsiden
**Og** innloggingen huskes på enheten, og økta fornyes i serverkode (ingen middleware)

**Gitt** en besøkende som ikke er innlogget
**Når** den besøkende åpner en side som krever innlogging
**Så** sendes den besøkende til forsiden

**Gitt** innloggingssiden
**Når** noen prøver feil passord eller en e-post som ikke finnes
**Så** vises en norsk feilmelding uten å avsløre om e-posten finnes
**Og** det finnes ingen side eller lenke for å registrere seg

**Gitt** at eieren er innlogget
**Når** eieren logger ut
**Så** kommer eieren til forsiden, og sider som krever innlogging, kan ikke åpnes

### Story 1.3: Eieren oppretter emnet IBE430 med læringsutbytte

Som eier
vil jeg opprette og velge emner med emnekode, navn, læringsutbytte og eksamensform,
slik at appen kjenner emnet før notatene importeres (FR-3 uten eksamensdato, FR-6).

**Akseptansekriterier:**

**Gitt** en migrering i `supabase/migrations/` for emner
**Når** den kjøres mot `dev` og deretter `prod`
**Så** har tabellen en eier-kolonne med fremmednøkkel til `auth.users` og `on delete cascade`, RLS som bare slipper gjennom eierens rader, og `GRANT` (AD-10)
**Og** emnekoden er unik per eier

**Gitt** at eieren er innlogget
**Når** eieren oppretter et emne med emnekode og navn og limer inn læringsutbytte og eksamensform som tekst
**Så** vises emnet i emnelisten og kan velges som aktivt emne
**Og** eieren kan endre emnekode, navn, læringsutbytte og eksamensform, og slette emnet etter en bekreftelse

**Gitt** at eieren har flere emner
**Når** eieren velger et annet emne
**Så** gjelder kapittelliste og framdrift det valgte emnet
**Og** et nytt emne kan legges til uten endringer i koden

**Gitt** en annen innlogget bruker (testkonto i `dev`)
**Når** brukeren prøver å lese eierens emner direkte mot databasen
**Så** returneres ingen rader (RLS-test mot `dev`)

### Story 1.4: Importen legger inn kapitler, delkapitler og notater

Som eier
vil jeg kjøre én kommando som leser notatfilene mine og legger inn kapittelstruktur og notater,
slik at appen viser IBE430 slik jeg har skrevet det (FR-8 uten KI, AD-2, AD-4, AD-5, AD-17).

**Akseptansekriterier:**

**Gitt** `notater/IBE430/kapittel-<n>.md` med frontmatter (`emne`, `kapittel`, `tittel`), valgfrie seksjoner (`## Læringsmål for kapittelet`, `## Nøkkelbegreper`) og delkapitler som `### n.m Tittel`
**Når** domenefunksjonen for tolking leser filen
**Så** gir den kapittelnummer, tittel, læringsmål, nøkkelbegreper og hvert delkapittel med nummer, tittel og notattekst
**Og** `## Råtekst` og `## Rettelser` er aldri med i notatteksten
**Og** enhetstester bruker de ekte filene `kapittel-1.md` til `kapittel-5.md` (kapittel 1 gir 6 delkapitler og kapittel 2 gir 5)

**Gitt** en notatfil der et delkapittelnummer ikke starter med filens kapittelnummer, eller der et nummer står to ganger
**Når** importen kjøres
**Så** stopper den med en norsk feilmelding som peker på linjen, og skriver ingenting (AD-17)

**Gitt** `hasNotes(noteText)` i `src/domain`
**Når** teksten er tom, bare mellomrom eller `*Ingen notater ennå.*`
**Så** returnerer den false, og ellers true (enhetstest)

**Gitt** at emnet IBE430 finnes for eieren
**Når** `npm run import -- --target dev IBE430 1` kjøres
**Så** lages eller oppdateres kapittel 1 og delkapitlene, identifisert ved (eier, emnekode, nummer), med titler som attributter (AD-5)
**Og** notatet lagres per delkapittel
**Og** eieren finnes ved oppslag på `OWNER_EMAIL`, og miljøet leses fra `.env.dev.local`
**Og** en ny kjøring med samme fil endrer ingenting (idempotent)

**Gitt** `--target prod`
**Når** importen starter
**Så** må eieren bekrefte før noe skrives (AD-12)
**Og** mangler emnet, stopper importen med beskjed om å opprette det i appen først

**Gitt** at kapitlene er importert
**Når** eieren åpner kapittellisten
**Så** vises kapitler og delkapitler i riktig rekkefølge med norske titler
**Og** delkapitler uten notater er merket «mangler notater»

### Story 1.5: Importen lager KI-sammendrag, og eieren kan lese dem

Som eier
vil jeg at importen lager et kort sammendrag av hvert delkapittel fra notatene mine,
slik at jeg kan lese det om kvelden uten å vente (FR-8, FR-11, AD-4, AD-7, AD-8).

**Akseptansekriterier:**

**Gitt** KI-modulen i `src/adapters/bedrock` som implementerer porten `AiProvider` med `AnthropicBedrock` i `eu-central-1`
**Når** en oppgave kaller KI
**Så** hentes modell og effort fra én innstillingsfil (sammendrag: `eu.anthropic.claude-sonnet-5-5`, effort satt eksplisitt)
**Og** en enhetstest feiler hvis en modell-ID i innstillingsfilen ikke starter med `eu.`
**Og** prompten ligger i en versjonert fil, og svaret valideres mot et skjema før det lagres

**Gitt** et delkapittel med notater og et `inputHash` som er nytt eller endret (hash av normalisert notat, kapittelets læringsmål og nøkkelbegreper og promptversjon)
**Når** importen kjøres
**Så** lages et sammendrag på norsk bokmål med maks 600 ord, bare fra notatet, med emnets læringsutbytte og kapittelets læringsmål som kontekst
**Og** sammendraget lagres som en ny versjon med status `klart`, modell-ID, promptversjon og `inputHash`
**Og** et delkapittel med uendret `inputHash` gir ingen nye KI-kall
**Og** `--force 1.2` lager sammendraget for 1.2 på nytt

**Gitt** at KI-kallet feiler eller svaret ikke passer skjemaet
**Når** importen kjører
**Så** registreres en ny versjon med status `feilet`, en eventuell tidligere `klart`-versjon beholdes, og importen fortsetter med neste delkapittel (AD-8)
**Og** neste import prøver på nytt

**Gitt** et delkapittel med en klar sammendragsversjon
**Når** eieren åpner delkapittelet
**Så** vises den siste klare versjonen på under 3 sekunder (NFR-3)
**Og** kapittellisten viser status «innhold lages», «klart» eller «feilet» per delkapittel

### Story 1.6: Importen lager spørsmålsbanken

Som eier
vil jeg at importen lager 20 quizspørsmål per delkapittel, med mine egne spørsmål med,
slik at jeg kan ta flere quizer uten å få de samme spørsmålene (FR-13, AD-6, AD-14).

**Akseptansekriterier:**

**Gitt** et delkapittel med notater og nytt eller endret `inputHash`
**Når** importen lager spørsmålsbanken første gang
**Så** lages først en temaliste for delkapittelet, og deretter 20 flervalgsspørsmål med fire alternativer, nøyaktig ett riktig, en kort forklaring og ett tema fra listen
**Og** hvert tema har minst 2 spørsmål
**Og** skjemaet avviser spørsmål med et tema som ikke er på listen, eller som ikke har nøyaktig fire alternativer og ett riktig
**Og** banken lagres som en versjon med status, modell-ID og promptversjon (Sonnet 5.5)

**Gitt** tabellen i `## Spørsmålsbank` i notatfilen (kolonnene `#`, `Delkapittel`, `Spørsmål` og `Fasit`)
**Når** importen leser den
**Så** blir hvert spørsmål med i banken til sitt delkapittel, med brukerens fasit som riktig alternativ, og KI lager bare tre gale alternativer, forklaring og tema
**Og** disse spørsmålene erstattes aldri automatisk

**Gitt** et spørsmål i `## Spørsmålsbank` med fasit «Ja» eller «Nei» (for eksempel spørsmål 2 og 8 i `kapittel-1.md`)
**Når** importen lager quizspørsmålet
**Så** skriver KI det om til et flervalgsspørsmål med fire alternativer, der det riktige alternativet er påstanden slik brukerens fasit bekrefter eller avkrefter den
**Og** spørsmålet er merket som omskrevet av KI, med originalteksten lagret

**Gitt** at spørsmålsnumre er nevnt under «**Må avklares før bruk:**» i notatfilen
**Når** importen leser spørsmålsbanken
**Så** tas disse spørsmålene ikke med, og importen skriver ut hvilke som ble hoppet over

**Gitt** at notatet til et delkapittel er endret
**Når** importen kjøres
**Så** trekkes bare ubrukte, KI-genererte spørsmål tilbake med status (de slettes ikke), og nye lages med den eksisterende temalisten

**Gitt** et delkapittel med færre enn 10 ubesvarte, aktive spørsmål
**Når** importen kjøres
**Så** fylles banken på med nye spørsmål om eksisterende temaer

**Gitt** et delkapittel med både et klart sammendrag og en klar spørsmålsbank
**Når** kapittellisten vises
**Så** er delkapittelet «klart» og kan åpnes i en økt, og ellers ikke (AD-8)

**Gitt** at story 1.4–1.6 er ferdig
**Når** importen kjøres mot `prod` for IBE430 kapittel 1–5
**Så** er alle delkapitler med notater klare i appen som er i drift

### Story 1.7: Eieren tar en quiz på et delkapittel

Som eier
vil jeg ta en quiz med 10 spørsmål og få riktig svar og forklaring med en gang når jeg svarer feil,
slik at jeg lærer stoffet og ikke bare husker alternativer (FR-10 del 1, FR-14, AD-6, AD-16).

**Akseptansekriterier:**

**Gitt** et klart delkapittel
**Når** eieren starter quizen fra delkapittelet (etter eller uten å lese sammendraget)
**Så** opprettes en økt (`session`), og quizen velger 10 aktive spørsmål fra banken, helst slike eieren ikke har fått før
**Og** de valgte spørsmålene regnes som brukt

**Gitt** et spørsmål i quizen
**Når** eieren svarer feil
**Så** vises riktig svar og forklaringen med en gang
**Og** et nytt spørsmål om samme tema erstatter et av de gjenstående spørsmålene, så quizen fortsatt har 10 spørsmål og det aldri er samme spørsmål på nytt
**Og** var feilen på det siste spørsmålet, kommer det nye spørsmålet om temaet i neste quiz på delkapittelet

**Gitt** domenefunksjonen for å velge nytt spørsmål om samme tema
**Når** den testes
**Så** finnes enhetstester for erstatning midt i quizen, feil på siste spørsmål, og tema uten flere ubrukte spørsmål

**Gitt** at quizen er ferdig
**Når** siste spørsmål er besvart
**Så** ser eieren quizresultatet («8 av 10 riktige»), og resultatet fryses

**Gitt** en quiz som er i gang
**Når** eieren lukker appen og åpner den igjen
**Så** fortsetter quizen på neste ubesvarte spørsmål, med svarene så langt lagret og de samme spørsmålene (AD-6)

**Gitt** at eieren er innlogget
**Når** eieren åpner emnelisten
**Så** kan eieren velge emne, delkapittel og starte økta med sammendrag og quiz (FR-10 del 1)

### Story 1.8: Delkapittelet krysses av, og framdriften vises

Som eier
vil jeg se delkapittelet krysset av ved minst 80 % og se hvor langt jeg har kommet mot målet,
slik at jeg kjenner at kvelden var verdt det (FR-15, FR-20 del 1, AD-13).

**Akseptansekriterier:**

**Gitt** en ferdig quiz med minst 80 % riktige
**Når** `finishQuiz` kjøres
**Så** skrives `subchapter_completion` med tidspunkt og quiz-ID, én gang per delkapittel
**Og** senere quizer, feilrapporter eller ny import angrer den aldri

**Gitt** en ferdig quiz med under 80 % riktige
**Når** resultatet vises
**Så** krysses delkapittelet ikke av, og eieren får tilbud om å lese sammendraget igjen og ta en ny quiz

**Gitt** domeneregelen for 80 %
**Når** den testes
**Så** finnes enhetstester for 8/10 (avkrysset), 7/10 (ikke avkrysset) og 8/9 etter et fjernet spørsmål (avkrysset)

**Gitt** det valgte emnet
**Når** eieren åpner startsiden
**Så** viser framdriftsindikatoren andelen gjennomførte delkapitler og hvor langt det er igjen til målet på 90 % (for eksempel «5 av 21 gjennomført, mål 19»)
**Og** kapittellisten viser gjennomførte delkapitler
**Og** begge leser fra `subchapter_completion` og regner det ikke ut på nytt

### Story 1.9: Eieren sier fra om feil i sammendrag og quizspørsmål

Som eier
vil jeg kunne melde fra om et feil sammendrag eller et feil quizspørsmål,
slik at feil innhold blir rettet uten at kvelden stopper (FR-12, FR-16, AD-18). *Kan flyttes til etter Epic 3 hvis tiden blir knapp.*

**Akseptansekriterier:**

**Gitt** et sammendrag
**Når** eieren melder feil
**Så** merkes sammendraget, det gamle vises til neste import, og neste import lager det på nytt

**Gitt** et quizspørsmål i en quiz som er i gang
**Når** eieren melder feil
**Så** trekkes spørsmålet tilbake fra banken med en gang og teller ikke i resultatet, som regnes av de gjenværende (for eksempel 8 av 9), også for 80 %-grensen
**Og** neste import lager et nytt spørsmål om samme tema

## Epic 2: Demoen, så faglærer og sensor kan prøve uten konto

Hvem som helst åpner «Prøv demoen» fra forsiden og tar kveldsøkta med IBE430 kapittel 1–4, uten KI-kall og uten å røre eierens data. Demoen bruker de samme skjermene og brukstilfellene som appen, med `DemoDataSource` og `DemoClock` i nettleseren (AD-3).

### Story 2.1: Eieren lager demodata med én kommando

Som eier
vil jeg lage demodataene fra mitt eget innhold med en eksportkommando,
slik at demoen viser appen slik den virker, uten KI-kall og uten personopplysninger (FR-26, AD-3, NFR-4, NFR-6).

**Akseptansekriterier:**

**Gitt** et skjema for demofilene i `src/application`
**Når** `npm run export-demo` kjøres
**Så** leses IBE430 kapittel 1–4 fra `prod` (eller de kapitlene som er klare), og struktur, læringsutbytte, eksamensform, siste klare sammendrag og aktive quizspørsmål med temaer skrives til `demo-data/`
**Og** filene valideres mot skjemaet før de skrives

**Gitt** demofilene
**Når** de valideres (enhetstest i CI)
**Så** feiler testen hvis et delkapittel har færre enn 20 spørsmål eller et tema færre enn 2 (NFR-8)
**Og** filene inneholder ingen e-post, bruker-ID, notater, svar eller framdrift fra eieren

**Gitt** at notatene eller innholdet endres senere
**Når** ingen kjører kommandoen
**Så** endres demodataene ikke (aldri automatisk, heller ikke ved deploy)

### Story 2.2: Hvem som helst kan åpne demoen og lese sammendrag

Som demobesøkende
vil jeg trykke «Prøv demoen» på forsiden og se IBE430 med kapitler og sammendrag,
slik at jeg forstår hva appen gjør, uten å lage konto (FR-26, UJ-5).

**Akseptansekriterier:**

**Gitt** forsiden
**Når** den besøkende trykker «Prøv demoen»
**Så** åpnes demoen med ett trykk, uten innlogging, med emnelisten der IBE430 ligger
**Og** et tydelig merke på hver side sier at man er i demoen

**Gitt** demoen
**Når** den besøkende åpner kapittellisten og et delkapittel
**Så** vises struktur, status og sammendrag fra demofilene med de samme skjermene som i appen
**Og** opprette eller endre emner, feilrapporter og andre funksjoner som krever lagring eller KI, er skjult

**Gitt** komposisjonsroten for demoen
**Når** den testes
**Så** bruker den bare `DemoDataSource` og `DemoClock`, og importerer verken Supabase- eller Bedrock-adapteren (test i CI for NFR-5 og NFR-8)
**Og** demoen sender ingen forespørsler til Supabase eller Bedrock

### Story 2.3: Den demobesøkende tar quiz og ser framdriften

Som demobesøkende
vil jeg ta en quiz med de samme reglene som i appen og se framdriftsindikatoren flytte seg,
slik at jeg ser hva som skiller appen fra en vanlig quiz (FR-26, FR-14, FR-15, FR-20).

**Akseptansekriterier:**

**Gitt** et delkapittel i demoen
**Når** den demobesøkende tar quizen
**Så** gjelder de samme reglene som i appen: 10 spørsmål, riktig svar og forklaring ved feil, nytt spørsmål om samme tema, og avkrysning ved 80 %
**Og** framdriftsindikatoren viser andel gjennomført

**Gitt** at den demobesøkende har brukt opp spørsmålsbanken til et delkapittel
**Når** en ny quiz startes
**Så** kommer spørsmålene igjen i ny rekkefølge

**Gitt** en avbrutt quiz i demoen
**Når** den demobesøkende laster siden på nytt i samme fane
**Så** fortsetter quizen (tilstanden ligger i `sessionStorage`)
**Og** en ny fane eller et nytt besøk starter likt, uten tidligere svar

**Gitt** alt den demobesøkende gjør
**Når** besøket er over
**Så** er ingenting skrevet til databasen, og eierens data er uendret

## Epic 3: Plan mot eksamen

Eieren legger inn eksamensdato (for IBE430: 10.12.2026), og planen starter samme dag. Appen sier hver kveld hva som skal gjøres, viser om eieren ligger foran eller bak, og hvordan eieren kommer i rute. Demoen får dagens forslag.

### Story 3.1: Eieren legger inn eksamensdato og planstart

Som eier
vil jeg legge inn eksamensdatoen og velge når planen skal regnes fra,
slik at appen kan fordele delkapitlene fram til eksamen (FR-3 del 2, AD-11, AD-15).

**Akseptansekriterier:**

**Gitt** porten `Clock` med en adapter for Europe/Oslo
**Når** domenet spør om «i dag» og studiedager
**Så** regnes de i Europe/Oslo, mandag til fredag er studiedager, og lørdag og søndag er fleksible dager
**Og** enhetstester dekker tidspunkter rett før og etter midnatt i Oslo

**Gitt** emnet IBE430
**Når** eieren legger inn eksamensdatoen 10.12.2026 uten å velge en annen planstart
**Så** er planstart dagen datoen legges inn, og `startPlan` lagrer et øyeblikksbilde med planstart, G₀ (delkapitler gjennomført før planstart), R₀ (delkapitler ikke gjennomført) og D (studiedager fra planstart til dagen før eksamensdatoen)
**Og** bare `startPlan` skriver disse verdiene (AD-15)
**Og** tabellen har eier-FK, RLS og `GRANT` (AD-10)

**Gitt** en eksisterende plan
**Når** eieren endrer eksamensdatoen
**Så** starter en ny plan, med planstart samme dag med mindre eieren velger en annen dato

### Story 3.2: Eieren ser om planen holdes, foran eller bak

Som eier
vil jeg se om jeg ligger foran eller bak studieplanen, og hva som skal til for å komme i rute,
slik at jeg rekker å ta igjen etterslep før eksamen (FR-9, FR-20 del 2, UX-3).

**Akseptansekriterier:**

**Gitt** planformelen i `src/domain`
**Når** den regner for en dag
**Så** er planlagt i dag = G₀ + ⌈R₀ × d / D⌉, der d er antall studiedager fra planstart til i går
**Og** forventet i dag = det minste av planlagt i dag og G₀ + antall ikke-gjennomførte delkapitler med notater (`hasNotes`)
**Og** etterslep = forventet i dag − gjennomførte delkapitler (fra `subchapter_completion`)
**Og** eieren ligger bak når etterslepet er større enn 0, og er i rute ellers

**Gitt** formelen
**Når** den testes
**Så** finnes enhetstester for første dag (d = 0), et vanlig etterslep, forsprang, delkapitler uten notater som ikke gir etterslep, og dagen før eksamen

**Gitt** at eieren ligger bak
**Når** startsiden vises
**Så** viser framdriftsindikatoren etterslepet i antall delkapitler, tydelig markert, med veien tilbake (for eksempel «2 delkapitler i kveld, så er du i rute fredag»)
**Og** teksten bruker ikke skyldspråk som «du har ikke gjort …» (UX-3)

**Gitt** at eieren er i rute eller foran
**Når** startsiden vises
**Så** viser indikatoren forspranget eller at eieren er i rute, i tillegg til andelen gjennomført

### Story 3.3: Startsiden viser dagens forslag

Som eier
vil jeg at appen sier hva jeg skal gjøre i kveld, og at jeg kan starte med ett trykk,
slik at jeg slipper å bruke den korte tiden på å velge (FR-10 del 2, AD-8, AD-15, UX-1, UX-2).

**Akseptansekriterier:**

**Gitt** en plan og en studiedag
**Når** dagens forslag regnes ut
**Så** inneholder det de neste klare delkapitlene som ikke er gjennomført, i nummerrekkefølge, og antallet er ⌈R₀ / D⌉ (minst 1)
**Og** når eieren ligger bak, kommer ett delkapittel i tillegg, men aldri flere enn 3 totalt
**Og** et delkapittel som ikke er klart, foreslås aldri

**Gitt** en fleksibel dag (lørdag eller søndag)
**Når** eieren ligger bak
**Så** foreslås delkapitler etter samme regel
**Og** når eieren ikke ligger bak, foreslås ingenting, men eieren kan starte en økt selv

**Gitt** at ingen ikke-gjennomførte delkapitler er klare
**Når** forslaget regnes ut
**Så** foreslår appen repetisjon: nye quizer på gjennomførte delkapitler

**Gitt** dagens forslag
**Når** eieren fullfører et delkapittel midt på dagen
**Så** endres ikke forslaget før midnatt i Oslo (AD-15)

**Gitt** størrelsen på forslaget
**Når** den testes
**Så** finnes enhetstester for vanlig dag, etterslep, maks 3, fleksibel dag med og uten etterslep, og ingen klare delkapitler

**Gitt** startsiden
**Når** eieren åpner appen
**Så** står dagens forslag øverst (for eksempel «I kveld: delkapittel 3.2, deretter quiz»), og økta startes med ett trykk
**Og** eieren kan fortsatt velge et annet delkapittel selv

### Story 3.4: Demoen viser dagens forslag og foran/bak

Som demobesøkende
vil jeg se dagens forslag og om den oppdiktede studenten ligger foran eller bak,
slik at jeg ser at appen tar beslutningen for brukeren (FR-26 del 2).

**Akseptansekriterier:**

**Gitt** demofilene
**Når** `export-demo` kjøres
**Så** får de også planinndata: en fast demo-eksamensdato, en fast planstart og en fast demo-dag for `DemoClock`

**Gitt** demoen
**Når** den demobesøkende åpner startsiden
**Så** vises dagens forslag og en framdriftsindikator som viser at studenten ligger litt bak planen, med veien tilbake
**Og** alle demobesøkende ser det samme forslaget

**Gitt** at den demobesøkende fullfører et delkapittel i demoen
**Når** startsiden vises igjen
**Så** oppdateres framdriften i besøket, mens forslaget ligger fast til den faste demo-dagen er slutt (aldri i praksis)

## Epic 4: Kapittelgjennomgang med KI-tilbakemelding

Når et kapittel er gjennomført, svarer eieren på gjennomgangsspørsmålene med egne ord og får tilbakemelding målt mot læringsutbyttet. Spørsmålene fordeles på flere kvelder gjennom dagens forslag. Demoen får gjennomgang med eksempeltilbakemeldinger.

### Story 4.1: Importen legger inn gjennomgangsspørsmålene

Som eier
vil jeg at gjennomgangsspørsmålene i notatfilene mine legges inn per kapittel,
slik at kapittelgjennomgangen bruker spørsmålene faglæreren har gitt (FR-27, AD-2, AD-6, AD-17).

**Akseptansekriterier:**

**Gitt** domenefunksjonen for å tolke `## Gjennomgangsspørsmål`
**Når** den leser seksjonen
**Så** begynner en linje med et heltall og punktum («1.») et nytt spørsmål, og linjer uten nummer hører til spørsmålet over
**Og** tolkingen bruker ikke KI
**Og** en enhetstest viser at testdataene i PRD-addendumet gir 29 spørsmål til kapittel 1 i riktig rekkefølge (NFR-8)

**Gitt** en notatfil med `## Gjennomgangsspørsmål` (i dag kapittel 1, 2, 4 og 5)
**Når** importen kjøres
**Så** lagres spørsmålene på kapittelet, ikke på et delkapittel, i rekkefølgen de står
**Og** et spørsmål gjenkjennes på normalisert tekst, så en ny kjøring ikke lager duplikater
**Og** endret tekst gir et nytt spørsmål, mens det gamle trekkes tilbake med status og aldri slettes

**Gitt** en notatfil uten seksjonen
**Når** importen kjøres
**Så** blir eksisterende gjennomgangsspørsmål for kapittelet stående urørt

**Gitt** kapittellisten
**Når** eieren åpner den
**Så** vises antall gjennomgangsspørsmål per kapittel

### Story 4.2: Kapittelgjennomgangen åpnes, og eieren svarer på spørsmålene

Som eier
vil jeg få beskjed når et kapittel er klart for gjennomgang, og svare på spørsmålene ett om gangen,
slik at jeg ser sammenhengen i hele kapittelet, slik muntlig eksamen krever (FR-28, AD-16).

**Akseptansekriterier:**

**Gitt** regelen for når kapittelgjennomgangen åpnes
**Når** alle delkapitlene i kapittelet har `subchapter_completion`
**Så** er gjennomgangen tilgjengelig, og ellers ikke (enhetstest, NFR-8)

**Gitt** at gjennomgangen er blitt tilgjengelig
**Når** eieren åpner appen
**Så** sier appen fra at kapittelgjennomgangen er klar, og den vises ved kapittelet i kapittellisten

**Gitt** en åpen gjennomgang
**Når** eieren starter den
**Så** kommer spørsmålene ett om gangen i fast rekkefølge, i en økt (`session`)
**Og** eieren skriver svaret uten tidsbegrensning, og svaret lagres som et skrevet svar knyttet til økta
**Og** eieren kan stoppe når som helst etter så mange spørsmål som ønsket

**Gitt** et spørsmål
**Når** eieren hopper over det
**Så** kommer det igjen etter de andre spørsmålene i gjennomgangen

**Gitt** en avbrutt gjennomgang
**Når** eieren starter den igjen
**Så** fortsetter den fra neste ubesvarte spørsmål

**Gitt** at alle spørsmålene er besvart
**Når** siste svar lagres
**Så** er gjennomgangen fullført og merket i kapittellisten, og eieren kan ta den på nytt
**Og** gjennomgangen påvirker ikke avkrysning, plan eller etterslep

### Story 4.3: Eieren får KI-tilbakemelding på svarene

Som eier
vil jeg få vite hva som var bra og hva som manglet i svaret mitt, målt mot læringsutbyttet,
slik at jeg øver på å forklare slik sensor spør (FR-19, FR-6, AD-7, AD-18, NFR-3).

**Akseptansekriterier:**

**Gitt** et lagret svar på et gjennomgangsspørsmål
**Når** eieren ber om tilbakemelding
**Så** kalles KI synkront fra serverkode på Vercel gjennom `AiProvider`, med modellen for tilbakemelding fra innstillingsfilen (`eu.anthropic.claude-opus-5-5`, effort satt eksplisitt)
**Og** prompten får emnets læringsutbytte og eksamensform, kapittelets læringsmål og notatene fra alle delkapitlene i kapittelet
**Og** tilbakemeldingen valideres mot et skjema og lagres med modell-ID og promptversjon

**Gitt** tilbakemeldingen
**Når** den vises
**Så** er den på norsk bokmål, kort og vennlig, sier først hva som var bra og så hva som manglet, og viser til minst ett læringsutbytte med ordlyden (FR-6, UX-4)
**Og** den kommer på under 20 sekunder (NFR-3), med en tydelig ventetilstand imens

**Gitt** at KI-kallet feiler eller går over tiden
**Når** eieren venter på tilbakemelding
**Så** er svaret allerede lagret, eieren får en norsk feilmelding og kan prøve igjen uten å skrive svaret på nytt

**Gitt** en tilbakemelding
**Når** den er lagret
**Så** hører den til svaret og økta, slik at vurderingen (FR-21) kan bruke den senere

### Story 4.4: Dagens forslag tar med gjennomgangsspørsmål

Som eier
vil jeg at gjennomgangen fordeles på flere kvelder gjennom dagens forslag,
slik at kapittel 1 med 29 spørsmål tar omtrent tre kvelder uten at planen sprekker (FR-10 del 2).

**Akseptansekriterier:**

**Gitt** en kapittelgjennomgang som er klar og ikke fullført
**Når** dagens forslag regnes ut
**Så** får forslaget 10 gjennomgangsspørsmål når det har ingen eller ett delkapittel, 5 når det har 2, og ingen når det har 3
**Og** etterslep på delkapitler går foran

**Gitt** regelen
**Når** den testes
**Så** finnes enhetstester for 0, 1, 2 og 3 delkapitler, og for flere klare gjennomganger samtidig (NFR-8)

**Gitt** dagens forslag med gjennomgangsspørsmål
**Når** eieren starter økta med ett trykk
**Så** kommer gjennomgangsspørsmålene etter delkapitlene, fra neste ubesvarte spørsmål

### Story 4.5: Importen lager gjennomgangsspørsmål når kapittelet ikke har noen

Som eier
vil jeg at appen lager 10 gjennomgangsspørsmål for kapitler uten slike i notatfilen,
slik at alle kapitler kan få en gjennomgang (FR-27). *Kan flyttes til Epic 5 hvis tiden blir knapp.*

**Akseptansekriterier:**

**Gitt** et kapittel uten `## Gjennomgangsspørsmål` og uten lagrede gjennomgangsspørsmål, der alle delkapitler med notater er klare
**Når** importen kjøres
**Så** lager KI 10 gjennomgangsspørsmål fra notatene i hele kapittelet, i stil med testdataene i PRD-addendumet
**Og** spørsmålene er merket som laget av appen

**Gitt** at eieren senere legger til `## Gjennomgangsspørsmål` i notatfilen
**Når** importen kjøres
**Så** erstatter eierens spørsmål de KI-lagde, og de KI-lagde trekkes tilbake med status

### Story 4.6: Demoen viser kapittelgjennomgang med eksempeltilbakemelding

Som demobesøkende
vil jeg prøve en kapittelgjennomgang og se hvordan tilbakemeldingen ser ut,
slik at jeg ser at appen trener til muntlig eksamen (FR-26 del 2). *Kan kuttes hvis tiden blir knapp.*

**Akseptansekriterier:**

**Gitt** `export-demo`
**Når** den kjøres
**Så** tar den med 5 gjennomgangsspørsmål for hvert av kapitlene 1–3, uten skrivefeil, og en fast eksempeltilbakemelding på hvert
**Og** valideringen feiler hvis et av kapitlene mangler spørsmål

**Gitt** demoen
**Når** den demobesøkende åpner kapittelgjennomgangen for kapittel 1–3 og skriver et svar
**Så** vises eksempeltilbakemeldingen, tydelig merket som eksempel, uten KI-kall
**Og** svaret vurderes ikke og lagres bare i besøket

## Epic 5: Trening til muntlig eksamen og vurdering

Eieren trener på forklaringsspørsmål, enten valgt selv eller som overraskelse etter quizen, og får etter hver økt en kort, ærlig vurdering. Svake temaer kommer tilbake som repetisjon. Demoen får eksempler. Minimum er story 5.1–5.3. Story 5.4–5.6 kan kuttes (PRD §9.1).

### Story 5.1: Importen lager forklaringsspørsmål

Som eier
vil jeg at importen lager forklaringsspørsmål i stil med muntlig eksamen for hvert delkapittel,
slik at de er klare når jeg vil trene (FR-17, FR-18, AD-4, AD-7, AD-18).

**Akseptansekriterier:**

**Gitt** et delkapittel med notater og nytt eller endret `inputHash`
**Når** importen kjøres
**Så** lager KI 3 åpne forklaringsspørsmål («Forklar hvordan …») fra notatene, med emnets læringsutbytte, eksamensform og kapittelets læringsmål som kontekst
**Og** stilen følger gjennomgangsspørsmålene i PRD-addendumet
**Og** spørsmålene valideres mot et skjema og lagres med modell-ID (Sonnet 5.5) og promptversjon

**Gitt** at notatet endres
**Når** importen kjøres
**Så** trekkes ubrukte forklaringsspørsmål tilbake med status og erstattes, mens besvarte spørsmål beholdes

### Story 5.2: Eieren trener på forklaringsspørsmål selv

Som eier
vil jeg velge å trene på forklaringsspørsmål for et emne eller et delkapittel og få tilbakemelding,
slik at jeg øver på å forklare med egne ord før muntlig eksamen (FR-18, FR-19, UJ-3).

**Akseptansekriterier:**

**Gitt** et emne eller et delkapittel med notater
**Når** eieren velger «Tren på forklaring»
**Så** starter en økt med et forklaringsspørsmål fra delkapittelet, eller fra et delkapittel i emnet
**Og** spørsmål eieren ikke har svart på, kommer først

**Gitt** et forklaringsspørsmål
**Når** eieren skriver svaret
**Så** lagres svaret og får tilbakemelding på samme måte som i story 4.3, men målt mot notatene i delkapittelet
**Og** eieren kan ta flere spørsmål i samme økt eller avslutte

**Gitt** forklaringsspørsmålene
**Når** eieren svarer
**Så** påvirker svaret ikke om delkapittelet er gjennomført

### Story 5.3: Eieren får en vurdering etter hver økt

Som eier
vil jeg få en kort, ærlig vurdering av hvordan jeg ligger an etter hver økt,
slik at jeg vet hva jeg kan og hva jeg må jobbe mer med (FR-21, AD-16, UX-4).

**Akseptansekriterier:**

**Gitt** en økt med quiz, forklaringsspørsmål eller gjennomgangsspørsmål
**Når** økta avsluttes (quizresultatet er vist og et eventuelt forklaringsspørsmål er besvart eller hoppet over, eller eieren avslutter treningen eller gjennomgangen)
**Så** avslutter `endSession` økta og ber om nøyaktig én vurdering
**Og** ingen annen kode avslutter økter eller lager vurderinger

**Gitt** vurderingen
**Når** KI lager den (Sonnet 5.5)
**Så** er den en eller to setninger på norsk bokmål som sier hva eieren har god kontroll på før det som trenger mer arbeid, målt mot læringsutbyttet
**Og** den sier hva den bygger på (for eksempel «basert på 12 quizer, 3 forklaringsspørsmål og 29 gjennomgangsspørsmål»)
**Og** den pynter ikke på situasjonen og er ikke nedslående (SM-C3)
**Og** temaene den peker på, lagres som en liste over temaer fra delkapitlenes temalister

**Gitt** en ny vurdering
**Når** økta er avsluttet
**Så** vises vurderingen etter økta og ligger på startsiden til neste vurdering

**Gitt** at KI-kallet feiler
**Når** økta avsluttes
**Så** blir forrige vurdering stående på startsiden, og ny vurdering lages etter neste økt

### Story 5.4: Appen gir et forklaringsspørsmål etter quizen

Som eier
vil jeg av og til få et overraskende forklaringsspørsmål etter quizen,
slik at jeg trener på forklaring uten å måtte velge det selv (FR-17). *Kan kuttes.*

**Akseptansekriterier:**

**Gitt** regelen for når et forklaringsspørsmål kommer etter quiz
**Når** en quiz er ferdig
**Så** kommer det aldri i to økter på rad, og minst hver tredje økt
**Og** enhetstester dekker begge grensene

**Gitt** at appen gir et forklaringsspørsmål etter quizen
**Når** eieren ser det
**Så** er spørsmålet fra samme delkapittel, og eieren kan svare eller hoppe over
**Og** økta avsluttes først når spørsmålet er besvart eller hoppet over

### Story 5.5: Dagens forslag tar med repetisjon av svake temaer

Som eier
vil jeg at dagens forslag tar med noen spørsmål om temaene jeg sliter med,
slik at jeg tetter hullene uten at planen forsinkes (FR-10 del 3). *Kan kuttes.*

**Akseptansekriterier:**

**Gitt** regelen for svakt tema i `src/domain`
**Når** den regner
**Så** er et tema svakt når eieren har svart feil på minst 2 av de 3 siste quizspørsmålene om temaet, eller når den siste vurderingen peker på det
**Og** enhetstester dekker begge tilfellene

**Gitt** svake temaer
**Når** dagens forslag regnes ut
**Så** legges opptil 5 quizspørsmål om dem til som repetisjon
**Og** de teller ikke med i quizresultatet for noe delkapittel og påvirker ikke planen

### Story 5.6: Demoen viser forklaringsspørsmål og en eksempelvurdering

Som demobesøkende
vil jeg se et forklaringsspørsmål med tilbakemelding og en vurdering,
slik at jeg ser hele kveldsøkta (FR-26 del 3, SM-6). *Kan kuttes.*

**Akseptansekriterier:**

**Gitt** `export-demo`
**Når** den kjøres
**Så** tar den med minst ett forklaringsspørsmål per kapittel med en fast eksempeltilbakemelding, og en fast eksempelvurdering

**Gitt** demoen
**Når** den demobesøkende svarer på et forklaringsspørsmål etter quizen
**Så** vises eksempeltilbakemeldingen, tydelig merket som eksempel, uten KI-kall
**Og** startsiden viser eksempelvurderingen
