# Tilbakemelding på PRD

| | |
|---|---|
| **Gruppe** | G131 – G131-hovda |
| **PRD vurdert** | `G131-hovda/planning-artifacts/prds/prd-G131-hovda-2026-09-27/prd.md` (status i frontmatter: final, `updated` 2026-10-25, sist endret i Git 2026-11-09, commit b948628). Jeg har også lest `addendum.md`. |
| **Dato** | 2026-11-12 |
| **Type** | Formativ tilbakemelding, ikke karakter |

## 1. Samlet inntrykk

Dette er en gjennomarbeidet PRD med en tydelig tese, en ordliste som brukes konsekvent, funksjonskrav med testbare konsekvenser og ærlig prioritering i tre trinn. Den største risikoen er ikke mangel på substans, men at KI-delene (sammendrag, spørsmålsbank, tilbakemelding, vurdering) er beskrevet uten kriterier for hva som er godt nok og uten en plan for å teste dem. I tillegg er omfanget stort for én utvikler, og noen få motsigelser og utdaterte punkter bør ryddes før PRD-en brukes som grunnlag videre.

## 2. Dette fungerer godt

- **Tesen er smal og brukes til å prioritere.** §1 sier hva som skal beskyttes når noe må kuttes: «Den tar beslutningen for deg», «Den kjenner emnet», «kort og oppstykket tid». Hvert punkt peker på FR-er, og kutt-listene i §9.1 følger dem.
- **FR-ene kan bli testtilfeller.** FR-9 gir en formel for etterslep, og FR-10 sier at forslaget er ⌈R₀ / D⌉ delkapitler, aldri mer enn 3. FR-14 og FR-15 gir 10 spørsmål og 80 %-grense, og FR-26 sier at demoen aldri skriver til utviklerens data. NFR-8 lister hva som skal ha automatiske tester.
- **Ærlig avgrensning og motvekter.** §8 og §9.2 sier tydelig hva Studievenn ikke er. SM-C1 («Lette quizer») og SM-C4 («Pyntet demo») er motmål som viser at gruppen har tenkt på hvordan målene kan misbrukes. Beslutningen om en demo uten KI-kall, som gir null kostnad, er godt begrunnet.

## 3. Oversikt per dimensjon

| Dimensjon | Vurdering | Kort begrunnelse |
|---|---|---|
| Beslutningsklarhet | sterk | Valg og avveininger står som beslutninger (f.eks. «Endring 25.10.2026», tilgangslås vs. innlogging, demo uten KI). |
| Substans | sterk | Persona Kim, NFR-er og visjon er knyttet til dette produktet. Lite pynt. |
| Strategisk sammenheng | sterk | Tesen styrer funksjoner, trinn og kutt. SM-ene har motvekter. |
| Testbarhet | god | De fleste FR-er har målbare konsekvenser. FR-11, FR-13, FR-19 og FR-21 mangler kriterier for KI-kvalitet. |
| Scope og avgrensning | god | Svært eksplisitt avgrensning, men Må-omfanget (22 FR over tre trinn) er stort for én utvikler. |
| Brukbarhet for neste fase | god | Ordliste og ID-er er gode. Noen motsigelser og utdaterte setninger gjenstår, og dokumentet er langt. |
| Formtilpasning | god | Passer et selvstendig prosjekt. Seks brukerreiser og ca. 7 900 ord er mye for ett produkt med én hovedbruker. |

## 4. Viktigste forbedringer

### 4.1 KI-kvalitet og KI-testing er ikke gjort testbart
- **Alvorlighet:** høy
- **Hvor:** FR-11 «bygger bare på brukerens notater», FR-13 «20 spørsmål per delkapittel», FR-19 «hva som var bra og hva som manglet», FR-21 «en eller to setninger»; NFR-8; NFR-6.
- **Problem og hvorfor det betyr noe:** Kravene sier hva KI-en skal levere, ikke når leveransen er riktig. Et quizspørsmål kan ha feil fasit, to riktige alternativer eller bygge på noe som ikke står i notatene. NFR-8 lister mange automatiske tester, men ingen som dekker KI-kall: hvordan testes tilbakemelding og vurdering uten å bruke KI-kall og penger hver gang? Hva skjer ved et usikkert eller tomt svar? Briefen ba om eksempelsvar (godt, middels, svakt) med forventet tilbakemelding. Jeg finner dem ikke i PRD-en. Uten dette kan ikke stories for det som er appens kjerne få akseptansekriterier.
- **Forslag:** Legg til konsekvenser i FR-13 og FR-19. Eksempel for FR-13: *«Hvert quizspørsmål har nøyaktig ett riktig alternativ, og forklaringen refererer til noe som står i delkapittelets notater. Utvikleren går gjennom hele banken én gang før delkapittelet markeres klart. Spørsmål som ikke kan besvares ut fra notatene, tas ut.»* Eksempel for FR-19: *«Med tre faste eksempelsvar (godt, middels, svakt) til samme gjennomgangsspørsmål skal tilbakemeldingen for det svake svaret nevne minst ett manglende punkt fra notatene, og tilbakemeldingen for det gode svaret skal ikke påstå at noe mangler.»* Legg til en NFR om testmodus: «Automatiske tester kjører mot en KI-mock uten nøkkel og uten kostnad.»

### 4.2 Omfanget er stort, og beslutningsregelen for å kutte mangler
- **Alvorlighet:** høy
- **Hvor:** §4 tabellen, §9.1 «Må del 2 … Del 2 er det største trinnet», FR-28, FR-26.
- **Problem og hvorfor det betyr noe:** Må-kravene dekker kontoer, studieplan, demo i tre utbyggingsnivåer, kapittelgjennomgang, forklaringsspørsmål og vurdering. Kutt-listene finnes og er gode, men de sier ikke *når* eller *etter hvilket kriterium* man kutter. Da blir kuttbeslutningen til å bli tatt under tidspress, ikke i planen.
- **Forslag:** Legg til en setning i §9.1, for eksempel: *«Er ikke minimumsmengden i del 2 fullført innen [dato], kuttes det som står i kan-flyttes-lista i denne rekkefølgen: FR-2, KI-genererte gjennomgangsspørsmål, demoutvidelsen.»* Oppdater tabellen i §4 slik at den viser faktisk status per trinn.

### 4.3 Motsigelser mellom krav og testdata
- **Alvorlighet:** medium
- **Hvor:** FR-14 mot FR-16, FR-26 mot addendumet, SM-4.
- **Problem og hvorfor det betyr noe:** (a) FR-14: «quizen har alltid 10 spørsmål, og resultatet regnes av 10», mens FR-16 sier «for eksempel 8 av 9». Én regel må gjelde. (b) FR-26 krever minst 20 spørsmål per delkapittel i demoen, men addendumet sier at 1.3 mangler notater og at 1.4 har én setning. Kravet kan ikke oppfylles uten en unntaksregel. (c) SM-4 sier «før del 2 starter», men del 1 og del 2 leveres samlet 1.11.
- **Forslag:** (a) Skriv i FR-14: *«Et spørsmål som er fjernet etter feilrapport (FR-16), teller ikke. Quizen trekker et erstatningsspørsmål hvis banken har et, ellers regnes resultatet av de gjenværende.»* (b) Skriv i FR-26: *«Delkapitler uten tilstrekkelige notater er markert «mangler notater» i demoen og kan ikke åpnes.»* (c) Rett SM-4.

### 4.4 To suksesskriterier kan ikke måles i prosjektets tidsrom
- **Alvorlighet:** medium
- **Hvor:** SM-1 «minst én økt på minst fem ulike kvelder i uka», SM-3 «stemmer med hvordan eksamen gikk … kontrollert i etterkant».
- **Problem og hvorfor det betyr noe:** SM-1 kan leses to måter (fem kvelder hver uke, eller fem kvelder totalt) og forutsetter daglig bruk i en periode der appen fremdeles bygges. SM-3 avhenger av eksamen i desember, etter innleveringen. Verken testere eller sensor kan sjekke dem. Briefen ba om det samme.
- **Forslag:** Behold SM-1 og SM-3 som egne mål for studiebruken, men legg til et mål som kan sjekkes ved innlevering: *«SM-3b: Ved hjelp av seks fastlagte eksempelsvar (to gode, to middels, to svake) gir vurderingen og tilbakemeldingen en rimelig forskjell mellom godt og svakt svar, kontrollert av utvikleren.»* Presiser SM-1: «minst fem av de siste syv kveldene».

### 4.5 Status «final» stemmer ikke helt med innholdet
- **Alvorlighet:** medium
- **Hvor:** frontmatter `status: final`; §11 Åpne spørsmål 2 «Hvilken KI-leverandør skal appen bruke?»; FR-8 «`notater/<EMNE>/kapittel-<n>.md` … importkommando».
- **Problem og hvorfor det betyr noe:** PRD-en sier at alle beslutninger er bekreftet, men leverandørvalget står fortsatt åpent, og dette påvirker NFR-4 og NFR-6 direkte. Det finnes ingen `[ASSUMPTION]`-merking eller antakelsesindeks, så leseren vet ikke hva som er bekreftet og hva som er antatt. FR-8 inneholder filsti og kommando, som er arkitekturvalg og ikke krav.
- **Forslag:** Oppdater §11 med hva som er avgjort (eller flytt det til arkitekturen). Legg til 3–5 `[ASSUMPTION]`-merker (f.eks. at 22.11 er fristen, at ett kapittel tar rundt én time å lage notater til, at KI-kostnaden holder seg under 100 kr), og en kort antakelsesliste til slutt. La FR-8 si hva som skal skje, og flytt filformatet til addendumet.

## 5. Mekaniske funn

- **IDer:** FR-1 til FR-28, UJ-1 til UJ-6 og SM-1 til SM-7 er sammenhengende og krysshenvisningene løser seg. FR-25 og FR-26 står foran FR-1, og det er forklart i §0.
- **Ordliste:** Begrepene brukes konsekvent. Små avvik: «forklaringsspørsmål» og «gjennomgangsspørsmål» står noen steder side om side med «spørsmål» alene. FR-10 bruker «ett delkapittel ekstra», mens ordlisten sier «etterslep».
- **Antakelser:** Ingen `[ASSUMPTION]` og ingen indeks (se 4.5).
- **Personopplysninger:** Ingen sensitive opplysninger funnet.
- **Lengde:** Ca. 7 900 ord i PRD og 1 400 i addendum. Seksjonene fungerer hver for seg, men FR-9 og FR-10 er tette og kunne hatt ett regneeksempel.

## 6. Før dere går videre

**Må avklares før arkitektur/epics/stories:**
- KI-leverandør, og hvordan testmodus og KI-mock skal fungere (åpent spørsmål 2 og punkt 4.1).
- Én regel for quiz når et spørsmål er fjernet (4.3).
- Kriterier for KI-kvalitet og eksempelsvar, slik at stories får akseptansekriterier.
- Bekreft innleveringsfristen (åpent spørsmål 1).

**Kan vente:** push-varsler (åpent spørsmål 3) og talegjenkjenning (åpent spørsmål 4), siden begge er Bør/Strekkmål.

**Oppfølging av tilbakemeldingen på product brief: delvis.** Fulgt opp: delingen i kjerne og senere trinn (Del 1–3), reglene for dagens forslag og spørsmålsbank (FR-9, FR-10, FR-13), persona (Kim) og demo uten nøkkel (FR-26). Ikke fulgt opp: eksempelsvar med forventet KI-tilbakemelding, en plan for lokal kjøring for sensor ut over demoen, og målbare suksesskriterier (SM-1 og SM-3 er fortsatt vanskelige å dokumentere).

## 7. Refleksjonsspørsmål

1. Formelen for etterslep i FR-9 er presis og kunne vært et typisk sted å godta KI-forslag uten å regne selv. Hvordan kontrollerte dere at den gir riktig resultat, for eksempel for 21 delkapitler og eksamen om 30 dager?
2. Hva foreslo KI-en da dere kom fram til beslutningen om å lage demoen uten KI-kall, og hva var det dere selv vurderte som avgjørende (kostnad, misbruk, enkelhet)?

_Vurdert mot kvalitetsrubrikken i bmad-prd. Dette er veiledning, ikke sensur._
