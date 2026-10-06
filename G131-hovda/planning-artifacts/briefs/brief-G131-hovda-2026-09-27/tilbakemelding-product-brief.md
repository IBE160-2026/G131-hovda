# Tilbakemelding på product brief

| | |
|---|---|
| **Gruppe** | G131 – G131-hovda |
| **Product brief** | `G131-hovda/planning-artifacts/briefs/brief-G131-hovda-2026-09-27/brief.md` (commit `05f6ebe`) |
| **Tilbakemelding fra** | Faglærer i IBE160 (utarbeidet med KI-støtte) |
| **Dato** | 2026-10-06 |

Jeg har også lest `addendum.md` i samme mappe. Det finnes allerede en PRD i `G131-hovda/planning-artifacts/prds/`; tilbakemeldingen gjelder briefen, men tar hensyn til at dere er kommet så langt.

## Samlet vurdering

- **Godt utgangspunkt med justeringer.** Gruppen kan gå videre og innarbeide punktene under.

**Det som er bra:**

1. Problemet er svært konkret og personlig: studietid fra 21.30 til 23.00 etter jobb, barnehage og legging, og tre tydelige delproblemer (vet ikke hvor man skal begynne, ser ikke at man ligger etter, ender med å pugge). Primærbrukeren er lett å designe for.
2. Kveldsøkta er en tydelig kjerneflyt: «I kveld: delkapittel 3.2, deretter quiz», med sammendrag og quiz, og et nytt spørsmål om samme tema etter feil svar. Forklaringsspørsmål for muntlig eksamen er godt begrunnet ut fra eksamensformen i IBE430.
3. Omfanget er prioritert i «må», «bør», «strekkmål» og «ikke med», og tale er bevisst lagt som strekkmål etter en tidlig test. Avgrensningen om ikke å laste opp opphavsrettsbeskyttede lærebøker er også bra.

**De viktigste endringene:**

1. «Må være med» har åtte punkter med innlogging, flere emner, opplasting, KI-sammendrag, quiz fra spørsmålsbank, dagens forslag, forklaringsspørsmål med KI-tilbakemelding og vurdering av hvordan man ligger an. Det er mye for én person innen en egen frist 22. november. Del listen i en kjerne som må virke først, og resten.
2. Flere suksesskriterier kan ikke dokumenteres innen fristen eller testes automatisk: bruk fem kvelder i uka, at vurderingen stemmer med eksamensresultatet, og at appen er «satt i drift». Legg til funksjonelle kriterier som kan bli tester, og husk at sensor skal kunne kjøre appen lokalt etter README – drift er ikke nødvendig.
3. Det er uklart hvor spørsmålsbanken kommer fra (lages den av KI fra notatene, eller av deg?) og hvordan «dagens forslag» beregnes ut fra eksamensdato og gjenstående delkapitler. Beskriv reglene, slik at de kan testes.

## Vanskelighetsgrad og gjennomførbarhet

### Vurdert vanskelighetsgrad

- **Middels**

**Sammenlignbart med:** Over 1) AI Study Buddy (enkel), på nivå med 2) AI CV- og søknadsassistent (middels). Sammendrag og quiz alene er enkelt, men innlogging, flere emner med kapittelstruktur, planlegging mot eksamensdato, KI-vurdering av fritekstsvar mot læringsutbyttet og en samlet statusvurdering gir flere sammenhengende funksjoner og større krav til kvalitet i KI-svarene.

**Begrunnelse:**

| Faktor | Nivå (lav / middels / høy) | Kommentar |
|---|---|---|
| Domenelogikk – hvor mange og hvor kompliserte regler og beregninger må stemme? | Middels | Fordeling av delkapitler fram mot eksamensdato, regel for nytt spørsmål etter feil svar, og hvordan statusvurderingen bygges av quiz- og forklaringsresultater. |
| Datamodell – antall entiteter og relasjoner mellom dem | Middels | Bruker, emne, læringsutbytte, kapittel, delkapittel, materiale, sammendrag, spørsmål, svar, forklaringssvar og vurdering. |
| Brukere, roller og innlogging | Middels | Innlogging og data per bruker fra start, selv om bare én bruker er planlagt i første versjon. |
| KI-funksjonalitet i appen, f.eks. kall til språkmodell, prompts i koden og håndtering av usikre svar | Høy | Sammendrag knyttet til læringsutbytte, eventuell generering av spørsmålsbank, vurdering av fritekstsvar og en «ærlig» statusvurdering. Vurdering av fritekst er det mest krevende å få pålitelig. |
| Integrasjoner og eksterne tjenester, f.eks. API-er, betaling og e-post | Middels | Språkmodell-API, og skraping av himolde.no som «bør». Tale (nettleserens talegjenkjenning) er strekkmål. |
| Sanntid, samtidighet eller flere brukere som påvirker hverandre | Lav | Ikke relevant. |
| Filhåndtering, f.eks. opplasting, PDF-lesing og eksport | Middels | Opplasting av egne notater og forelesningsfoiler med tekstuttrekk. |
| Sikkerhet og personvern | Middels | Innlogging, egne svar og notater lagres, og innhold sendes til en språkmodell. Krav om EU/EØS og ingen trening er identifisert i addendumet. |

**Hva vanskelighetsgraden betyr for dere:**

- _Middels:_ Et godt balansert valg. Pass på at kjerneflyten blir ferdig og stabil før dere legger til mer. Her betyr det: ett emne, ett delkapittel → sammendrag → quiz med forklaring ved feil, før forklaringsspørsmål, statusvurdering og flere emner bygges ut.

### Gjennomførbarhet med BMAD og Claude Code

Dere skal planlegge med BMAD (product brief → PRD → arkitektur → epics og stories) og implementere med Claude Code. Vurderingen under tar hensyn til at det må være tid til hele denne flyten, og til testing, retting og README til slutt.

| Spørsmål | Vurdering (OK / risiko / stor risiko) | Kommentar |
|---|---|---|
| **Tid og omfang** – kan v1 realistisk bli ferdig og stabil i løpet av semesteret, med tid til flere iterasjoner? | Risiko | Åtte «må»-punkter for én person med en egen frist 22. november er stramt. Planen om å ta i bruk en enkel versjon i oktober er god, men krever at kjernen bygges først. |
| **BMAD-flyten** – er briefen konkret nok til at PRD, arkitektur og stories kan lages uten store hull, og blir det overkommelig mange stories? | OK | Briefen er konkret, og PRD er allerede laget. Pass på at regler for forslag, spørsmålsbank og statusvurdering er tydelige i PRD før stories. |
| **Egnet for Claude Code** – bruker løsningen en vanlig, godt dokumentert teknologistakk som Claude Code håndterer godt, eller krever den nisjeteknologi, spesialmaskinvare eller mye manuell konfigurasjon? | OK | En responsiv webapp med innlogging, database og LLM-kall er godt dokumentert. Skraping og tale er mer usikre, men er riktig plassert som «bør» og strekkmål. |
| **Kontroll på KI-ens arbeid** – kan gruppen selv avgjøre om koden gjør det riktige? Krever domenet kunnskap gruppen ikke har, f.eks. avanserte beregninger eller fagregler, så er det vanskelig å kvalitetssikre. | Risiko | Du tar emnet selv og kan vurdere sammendrag og spørsmål. KI-vurdering av forklaringssvar og statusvurderingen er vanskeligere å kontrollere; lag noen eksempelsvar (godt, middels, svakt) med forventet tilbakemelding. |
| **Testbarhet** – finnes det tydelige regler og forventede resultater som tester kan skrives mot? | Risiko | Innlogging, dataseparasjon, kapittelstruktur, quiz-logikk og dagens forslag kan testes godt når reglene er skrevet ned. Suksesskriteriene i dag gir lite å teste mot. |
| **Kjørbar for sensor** – kan appen kjøres lokalt etter README, uten gruppens nøkler, betalte kontoer eller egen infrastruktur? | Risiko | Briefen sikter mot en versjon «satt i drift», men nevner ikke lokal kjøring. Planlegg lokal oppstart med testbruker, et eksempelemne med fiktive notater og demomodus uten nøkkel. |
| **Avhengigheter og kostnader** – krever løsningen betalte API-er, f.eks. språkmodeller, og finnes det en plan for kostnad, testmodus eller mock-data? | Risiko | LLM-leverandør er ikke valgt (står i addendumet). Daglig bruk med sammendrag, spørsmål og vurdering gir løpende kostnad. Avklar kostnad og testmodus. |

**Konklusjon om gjennomførbarhet:**

- **Gjennomførbart med justert omfang.** Se forslagene under.

**Forslag til justering av omfang eller vanskelighetsgrad:**

1. Kjerne (oktober): innlogging, ett emne med kapittelstruktur, opplasting, sammendrag og quiz med forklaring ved feil. Neste trinn (november): dagens forslag, forklaringsspørsmål med KI-tilbakemelding og statusvurdering. Flere emner kan vente til kjernen er stabil.
2. La spørsmålsbanken genereres av KI én gang per delkapittel og lagres, slik at du kan kontrollere og redigere spørsmålene. Da blir quizen deterministisk og testbar.
3. Gjør «dagens forslag» til en enkel regel (f.eks. gjenstående delkapitler fordelt jevnt på dager til eksamen, med repetisjon av temaer med feil svar), og skriv den inn i PRD.

## Hvorfor product brief er viktig for mappen

Product brief er utgangspunktet for PRD, arkitektur, stories og til slutt koden. Del 1 av mappen vurderes blant annet på om sensor kan følge en sporbar vei fra plan til ferdig app. Den vurderes også på om appen gjør det dere har beskrevet, om den er testet, om den er godt designet, og om den kan kjøres etter README. Et uklart, for stort eller for lite brief gjør alt dette vanskeligere senere. Det er mye enklere å rette nå enn sent i semesteret.

## 1. Gjennomgang av briefens deler

| Del av brief | Status | Kommentar |
|---|---|---|
| Executive Summary – er det klart hva appen er, og hvilket problem den løser? | OK | Tydelig: en webapp som gjør hver kveld til en konkret økt tilpasset eksamensdatoen, med sammendrag, quiz og forklaringsspørsmål. |
| The Problem – er problemet konkret, med reelle situasjoner og brukere? | OK | Svært konkret, med en realistisk dagsrytme og tre tydelige delproblemer. |
| The Solution – beskriver løsningen brukeropplevelsen, ikke bare teknologi? | OK | Kveldsøkta, forklaringsspørsmålene og «Hvordan ligger jeg an?» er beskrevet fra brukerens side med gode eksempler. |
| What Makes This Different – er vurderingen ærlig og realistisk? | OK | Ærlig om NotebookLM, Quizlet og StuderSmartere.no, og konkret om tre smale forskjeller. |
| Who This Serves – er primærbrukerne tydelige, og vet vi hva de trenger? | Juster | Tydelig, men primærbrukeren er utvikleren selv. Beskriv primærbrukeren som en persona (deltidsstudent med jobb og barn), slik at design og brukertest ikke bare bygger på egen bruk. |
| Success Criteria – kan kriteriene faktisk sjekkes eller testes? | Endre | Brukskriteriene og kriteriet om at vurderingen stemmer med eksamen kan ikke dokumenteres innen fristen. Legg til funksjonelle, testbare kriterier for kjerneflyten. |
| Scope – er det klart hva som er med i første versjon, og hva som ikke er det? | Juster | Godt prioritert, men «må» er stor. Del den i en kjerne og et andre trinn. |
| Vision – henger visjonen sammen med resten uten å blåse opp omfanget? | OK | Nøktern: nye emner og tale først etter at appen er prøvd i et helt emne. |

## 2. Utgangspunkt for del 1 av mappen

Punktene følger kriteriene i sensorveiledningen for del 1. Vektene i parentes viser hvor mye hvert kriterium teller i del 1.

| Kriterium i del 1 | Hva briefen bør legge til rette for | Status | Kommentar |
|---|---|---|---|
| **1. Prosess og KI-styring** (30 %) | Brief som er presis nok til at PRD og stories kan bygges direkte på den, slik at krav kan spores fra brief til kode. | OK | Briefen er presis, og PRD er laget i en egen gren med pull request. Det er god arbeidsflyt. Fortsett med arkitektur og stories, og lagre prompts og KI-økter. |
| **2. Funksjonalitet og omfang** (20 %) | Realistisk omfang for gruppen og semesteret: en tydelig kjerneflyt som kan bli ferdig og stabil, og nok innhold til å vise reell funksjonalitet. | Juster | Rikelig med funksjonalitet og en tydelig kjerneflyt. Prioriter slik at kjernen garantert blir stabil. |
| **3. Kvalitetssikring og testing** (15 %) | Suksesskriterier og funksjoner som er konkrete nok til å bli testtilfeller. | Endre | Skriv regler for forslag, quiz og statusvurdering, og funksjonelle kriterier som kan testes. Lag eksempelsvar med forventet KI-tilbakemelding. |
| **4. Design og brukeropplevelse** (10 %) | Tydelige brukere og brukssituasjoner som designet kan bygges rundt, gjerne med de viktigste skjermbildene eller flytene skissert. | OK | Tydelig brukssituasjon (sent på kvelden, lite energi, ulike enheter). Skisser startsiden med «I kveld: …», quizen og statusvisningen. |
| **5. Kodekvalitet og arkitektur** (10 %) | Teknologivalg som er begrunnet og ikke mer komplekse enn appen trenger. | Juster | Teknologi og LLM-leverandør er ikke valgt. Begrunn valgene i arkitekturen, særlig opp mot kravene til personvern i addendumet. |
| **6. README og kjørbarhet** (10 %) | Løsning som andre kan kjøre lokalt uten betalte kontoer, og uten tilgang til gruppens egne tjenester og nøkler. | Juster | Planlegg lokal kjøring med testbruker, fiktivt eksempelemne og demomodus, i tillegg til egen drift. |
| **7. Ryddighet i repoet** (5 %) | En plan for hvor hemmeligheter, testdata og dokumentasjon skal ligge. | Juster | Planleggingsdokumentene ligger i `G131-hovda/G131-hovda/planning-artifacts/`, en mappe med samme navn som repoet. Vurder en tydeligere plassering (f.eks. `_bmad-output/planning-artifacts/` eller `docs/`). Bruk egne notater som testdata, og legg nøkler i `.env` utenfor Git. |

## 3. Neste steg for gruppen

1. Del «Må være med» i en kjerne og et andre trinn, og skriv reglene for dagens forslag, spørsmålsbank og statusvurdering inn i PRD.
2. Legg til funksjonelle, testbare suksesskriterier, og la brukskriteriene være en del av brukertesten.
3. Velg LLM-leverandør, planlegg demomodus og lokal kjøring, og gå videre til arkitektur og stories.

Oppdater product brief i repoet når dere har gjort endringene, slik at historikken viser hvordan planen utviklet seg. Det er en del av prosessen sensor ser etter.
