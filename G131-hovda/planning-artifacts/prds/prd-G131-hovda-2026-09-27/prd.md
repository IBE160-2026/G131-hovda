---
title: "PRD: Studievenn"
status: final
created: 2026-09-27
updated: 2026-10-08
---

# PRD: Studievenn

## 0. Om dokumentet

PRD-en beskriver *hva* Studievenn skal gjøre i versjonen som leveres 22. november 2026. Den bygger på produktbriefen i `planning-artifacts/briefs/brief-G131-hovda-2026-09-27/` (oppdatert 08.10.2026) og gjentar ikke bakgrunnen derfra. Dokumentet skal brukes som grunnlag for arkitektur, epics og stories, og som dokumentasjon av KI-støttet planlegging i IBE160. Begrepene i ordlisten (§3) brukes likt i hele dokumentet. Funksjonskravene (FR) har faste numre, så nye krav får nye numre og gamle beholder sine. Derfor står FR-25 og FR-26 foran FR-1 i §4.1 og §4.2. Alle beslutninger og antakelser fra oppdateringen 08.10.2026 er bekreftet av brukeren. Tekniske valg og detaljer står i `addendum.md`.

## 1. Visjon

Studievenn er en responsiv webapp som gjør den korte studietiden sent på kvelden om til en konkret økt som kan fullføres. Brukeren trenger ikke bestemme hva som skal gjøres, for appen sier det: *«I kveld: delkapittel 3.2, deretter quiz.»* Økta består av et KI-generert sammendrag av brukerens egne forelesningsnotater og en quiz på det samme stoffet. Av og til dukker det opp et forklaringsspørsmål som trener til muntlig eksamen.

Appen fordeler arbeidet fram mot eksamensdatoen, viser om brukeren ligger foran eller bak planen, og gir etter hver økt en kort, ærlig vurdering av hvordan brukeren ligger an, målt mot emnets læringsutbytte. Belønningen er følelsen av å ha fått noe ut av kvelden: resultatet på quizen, et delkapittel som krysses av, og en indikator som flytter seg nærmere målet.

Studievenn finner ikke opp noe nytt, men tilpasser velkjente ideer til én studiehverdag. Den kommer ikke til å slå NotebookLM eller Quizlet som generelle verktøy. Det den gjør annerledes, er smalt, men reelt, og det er dette som skal beskyttes når noe må kuttes:
- **Den tar beslutningen for deg.** Appen sier hva som bør gjøres i kveld, i stedet for å gi en verktøykasse (FR-9, FR-10).
- **Den kjenner emnet.** Læringsutbytte og eksamensform styrer sammendrag, spørsmål, tilbakemelding og vurdering (FR-6, FR-19, FR-21).
- **Den er laget for kort og oppstykket tid og for muntlig eksamen.** Korte sammendrag, økter som kan fullføres på en kveld, og forklaringsspørsmål (FR-10, FR-11, FR-17–FR-19).

Studievenn er først og fremst et semesterprosjekt i IBE160 og et studieverktøy fram mot muntlig eksamen i IBE430 i desember 2026. Den bygges for flere brukere og flere emner. I denne versjonen brukes den av utvikleren selv, og andre kan prøve den gjennom en demo uten innlogging. Den største verdien er to-i-én-effekten: utvikleren lærer å bygge en KI-basert fullstack-applikasjon i IBE160, og arbeidet med appen tvinger samtidig fram en grundig gjennomgang av pensum, læringsutbytte og eksamensform i IBE430.

Etter desember er alt en bonus. Det naturlige neste steget er tale som svarform og bruk i nye emner fra januar 2027. Om appen skal åpnes for andre studenter, avgjøres først etter at den er prøvd gjennom et helt emne. Blir den åpnet, er betalte kontoer en mulig modell, men det hører til en senere versjon og ikke til studieprosjektet.

## 2. Målgruppe

**Primærbruker** er en deltidsstudent med fulltidsjobb og små barn, som har rundt halvannen time til studier sent på kvelden, ofte med lite energi igjen. Designet tar utgangspunkt i denne personen. Utvikleren passer til beskrivelsen og bruker appen i IBE430, men designet er ikke laget bare for utvikleren.

**Demobesøkende**, for eksempel faglærer, sensor eller medstudenter, prøver kveldsøkta i demoen uten å lage konto (FR-26). Det finnes ingen egne testbrukere. Demoen og utviklerens egen bruk erstatter dem.

### 2.1 Jobs to be done

- **Praktisk:** Når jeg setter meg ned sent på kvelden, vil jeg vite med en gang hva jeg skal gjøre, så jeg ikke bruker tiden på å velge.
- **Praktisk:** Jeg vil se underveis i semesteret om jeg ligger foran eller bak, så jeg rekker å ta det igjen før eksamen.
- **Praktisk:** Jeg vil øve på å forklare fagstoffet med egne ord, fordi det er det muntlig eksamen tester.
- **Praktisk:** Jeg vil jobbe jevnt gjennom semesteret, så jeg slipper å pugge alt rett før eksamen.
- **Følelsesmessig:** Selv om jeg er sliten, vil jeg sitte igjen med følelsen av at kvelden var verdt det og at jeg har lært noe.
- **Situasjon:** Studietiden er kort og oppstykket (hverdager kl. 21:30–23:00), og jeg kan bli avbrutt.
- **Demobesøkende:** Jeg vil forstå hva appen gjør, og prøve en kveldsøkt på noen minutter uten å registrere meg.

### 2.2 Ikke-brukere (denne versjonen)

- Andre studenter som egne brukere med konto. Appen er bygd for flere brukere, men åpnes ikke for andre før den er prøvd gjennom et helt emne. Fram til da kan de prøve demoen.
- Studenter som vil ha et generelt KI-verktøy for alle typer studier. NotebookLM, Quizlet og lignende dekker det behovet bedre.

### 2.3 Brukerreiser

Reisene bruker en oppdiktet persona: **Kim** er deltidsstudent med fulltidsjobb fra 08.00 til 15.30 og to små barn, og tar IBE430 med muntlig eksamen i desember. Hver reise sier hvilken del av utbyggingen den forutsetter (§4).

**UJ-1. Kim fullfører kveldsøkta, selv om kvelden er tung.** *(Del 2 og 3. Se merknaden om del 1 nedenfor.)*
- **Situasjon:** Tirsdag kl. 21:35 i november. Barna er lagt, matpakkene er smurt, og Kim er sliten både fysisk og mentalt, men vil fullføre.
- **Utgangspunkt:** Kim åpner Studievenn på iPaden og er allerede innlogget.
- **Forløp:** Startsiden er oversiktlig, imøtekommende og fargerik og viser noe nytt. Øverst står dagens forslag: *«I kveld: delkapittel 3.2, deretter quiz.»* Framdriftsindikatoren viser hvor stor andel av delkapitlene i IBE430 som er gjennomført, og om Kim ligger foran eller bak planen. Kim leser sammendraget og tar quizen.
- **Høydepunkt:** Quizresultatet vises («8 av 10 riktige»). Delkapittelet krysses av, og indikatoren flytter seg nærmere målet.
- **Avslutning:** Den oppdaterte vurderingen ligger på startsiden. Kim legger fra seg iPaden og kjenner at kvelden var verdt det.
- **Når det går galt:** Får Kim under 80 % riktige, krysses delkapittelet ikke av. Neste gang leser Kim sammendraget på nytt og tar flere quizer. Blir økta avbrutt, fortsetter den der den slapp neste gang.
- **I del 1 (oktober):** Det finnes ingen innlogging, dagens forslag eller vurdering ennå. Kim velger IBE430 i emnelisten, åpner et delkapittel i kapittel 1–4, leser sammendraget og tar quizen. Indikatoren viser bare andelen gjennomførte delkapitler.

**UJ-2. Kim setter opp IBE430.** *(Del 1, eksamensdato fra del 2.)*
- **Situasjon:** Søndag ettermiddag i starten av semesteret, med litt bedre tid enn på en kveld.
- **Forløp:** Kim oppretter emnet IBE430 og limer inn kapittellisten på engelsk slik den står i pensumboka. Appen gjør listen om til kapitler og delkapitler og oversetter titlene til norsk. Titler med feil oversettelse kan rettes. Deretter skriver Kim inn forelesningsnotatene til kapittel 1, med det viktigste fra foilene skrevet eller limt inn som tekst. Fra del 2 legger Kim også inn eksamensdatoen.
- **Høydepunkt:** Emnet er klart, og delkapitlene i kapittel 1 kan åpnes.
- **Avslutning:** Notater til de andre kapitlene legges inn utover semesteret, ett kapittel om gangen. Kim ser ikke gjennom sammendrag og spørsmål på forhånd. Feil som Kim oppdager, rapporteres i appen: et feil quizspørsmål fjernes og erstattes med et nytt.
- **I del 1:** Det finnes ingen kontoer ennå, så det er utvikleren som gjør dette, bak tilgangslåsen (FR-25).

**UJ-3. Kim får et overraskende forklaringsspørsmål.** *(Del 3.)*
- **Situasjon:** Samme kveld som i UJ-1. Kim har akkurat fått 9 av 10 riktige på quizen til delkapittel 3.2.
- **Forløp:** I stedet for å avslutte økta spør appen: *«Forklar hvordan et forretningssystem støtter innkjøpsprosessen.»* Kim har så god tid som trengs og skriver svaret med egne ord.
- **Høydepunkt:** KI-en svarer med hva som var bra og hva som manglet, målt mot læringsutbyttet.
- **Avslutning:** Svaret påvirker ikke om delkapittelet krysses av, men teller med i vurderingen.
- **Variant:** En lørdag med mer overskudd velger Kim selv å trene på forklaringsspørsmål.

**UJ-4. Kim tar igjen etterslepet før eksamen.** *(Del 2 og 3.)*
- **Situasjon:** Midten av november. Barna har vært syke en uke, og Kim har ikke fått gjort noe.
- **Forløp:** Når Kim åpner appen, viser framdriftsindikatoren at Kim ligger bak planen. Dagens forslag inneholder flere delkapitler enn vanlig, og appen foreslår økter også lørdag og søndag. Vurderingen sier *«… trenger mer arbeid med dokumentflyt i produksjon»*, så forslaget har også en kort repetisjon av delkapittel 5.2, uten at planen forsinkes. (Kommer push-varsler med, FR-23 [Bør], får Kim også et varsel på telefonen hver dag til etterslepet er tatt igjen.)
- **Høydepunkt:** Indikatoren viser at Kim er tilbake i rute.
- **Når det går galt:** Planen sier kapittel 4, men Kim har ikke skrevet notater til det ennå. Da foreslår appen repetisjon og nye runder med tidligere quizer.

**UJ-5. Faglæreren prøver demoen.** *(Del 1, utvidet i del 2 og 3.)*
- **Situasjon:** Eli er faglærer i IBE160 og har fått lenken til Studievenn i prosjektdokumentasjonen. Eli har ti minutter mellom to møter og ingen konto.
- **Forløp:** Eli åpner lenken og velger «Prøv demoen» på forsiden. Uten registrering kommer Eli til en emneliste med IBE430, der kapittel 1–4 allerede er lagt inn. Eli åpner delkapittel 3.2, leser sammendraget og tar quizen. Ett svar er feil, og riktig svar vises med forklaring.
- **Høydepunkt:** Senere i quizen kommer et nytt spørsmål om det samme temaet, ikke det samme spørsmålet på nytt. Eli ser hva som skiller appen fra en vanlig quiz.
- **Avslutning:** Eli lukker fanen. Ingenting av det Eli har gjort, lagres eller påvirker utviklerens data.
- **I november (del 2 og 3):** Demoen åpner med dagens forslag og en framdriftsindikator som viser at den demobesøkende ligger litt bak planen. Etter quizen kommer et ferdiglaget forklaringsspørsmål med en eksempeltilbakemelding, og startsiden viser en eksempelvurdering. Eli ser hele kveldsøkta, ikke bare quizen.

**UJ-6. Kim tar kapittelgjennomgangen for kapittel 1.** *(Del 2.)*
- **Situasjon:** Starten av november. Kim har akkurat fått 9 av 10 riktige på quizen til 1.6, og dermed er alle delkapitlene 1.1–1.6 i kapittel 1 gjennomført. Gjennomgangsspørsmålene fra faglæreren ble limt inn da kapittelet ble satt opp.
- **Forløp:** Appen sier at kapittelgjennomgangen for kapittel 1 er klar. Dagene etter har dagens forslag både delkapitler fra kapittel 2 og noen gjennomgangsspørsmål fra kapittel 1, for eksempel *«Hva er ulempen med en funksjonell organisasjonsstruktur?»*. Kim svarer med egne ord.
- **Høydepunkt:** KI-en sier hva som var bra og hva som manglet, målt mot læringsutbyttet og notatene fra hele kapittelet. Kim ser sammenhengen mellom delkapitlene, ikke bare hvert delkapittel for seg.
- **Avslutning:** Etter noen kvelder er alle de 29 spørsmålene besvart, og kapittelet er merket med fullført gjennomgang i kapittellisten. Svarene teller med i vurderingen når den kommer i del 3.

## 3. Ordliste

- **Bruker:** En person med egen innlogging (fra del 2). Hver bruker ser bare sine egne data. I del 1 er utvikleren den eneste brukeren, bak tilgangslåsen (FR-25).
- **Forside:** Siden man kommer til før innlogging (i del 1: før tilgangslåsen). Herfra kan man logge inn eller prøve demoen.
- **Startside:** Siden brukeren kommer til etter innlogging (i del 1: etter tilgangslåsen), med dagens forslag, framdriftsindikator og vurdering.
- **Demo:** En del av appen som kan brukes uten innlogging, med IBE430 kapittel 1–4 ferdig lagt inn og alt innhold laget på forhånd. Utvides med det som kommer i del 2 og 3 (FR-26).
- **Demobesøkende:** En person som bruker demoen. Hva en demobesøkende gjør, lagres ikke etter at besøket er over.
- **Tilgangslås:** En enkel beskyttelse av utviklerens egen versjon i del 1, før innlogging finnes (FR-25).
- **Må del 1 / 2 / 3:** De tre trinnene novemberversjonen bygges i (§4). Hvert trinn kan kjøres og testes før neste starter.
- **Emne:** Et emne brukeren tar, for eksempel IBE430. Har læringsutbytte, eksamensform, eksamensdato og en kapittelstruktur. En bruker har ett eller flere emner.
- **Kapittel / delkapittel:** Strukturen i pensum. Et emne har kapitler, og et kapittel har delkapitler. Delkapittelet er enheten appen planlegger, oppsummerer og quizer på.
- **Notat:** Brukerens egne forelesningsnotater til et delkapittel, lagt inn som tekst. Innhold fra forelesningsfoliene kan skrives eller limes inn som en del av notatet. Notatene er det eneste kildematerialet KI-en bruker.
- **Læringsutbytte:** Emnets offisielle mål for kunnskap, ferdigheter og generell kompetanse. Styrer sammendrag, spørsmål og vurdering.
- **Eksamensform:** Hvordan emnet avsluttes, for eksempel 15 minutters muntlig eksamen.
- **Studieplan:** Hvordan de gjenstående delkapitlene fordeles på studiedagene fram til eksamensdatoen.
- **Planstart:** Dagen studieplanen regnes fra (FR-9). Standard er dagen eksamensdatoen legges inn, men brukeren kan velge en tidligere dato.
- **Studiedag:** Mandag til fredag. Studieplanen fordeler delkapitlene på disse dagene.
- **Fleksibel dag:** Lørdag og søndag. Studieplanen legger bare inn økter på disse dagene når brukeren ligger bak, men brukeren kan alltid starte en økt selv (FR-10).
- **Dagens forslag:** Det appen foreslår for dagens økt, for eksempel ett delkapittel og quiz, eventuelt med repetisjon.
- **Økt:** Én gjennomføring av dagens forslag eller et delkapittel brukeren har valgt selv. Består av sammendrag og quiz, av og til med et forklaringsspørsmål, og fra del 2 eventuelt noen gjennomgangsspørsmål (FR-28). Økta starter når brukeren åpner sammendraget eller quizen, og slutter når quizresultatet er vist og et eventuelt forklaringsspørsmål er besvart eller hoppet over. Trening på forklaringsspørsmål som brukeren har valgt selv (FR-18), regnes også som en økt.
- **Sammendrag:** KI-generert kort tekst om ett delkapittel, laget fra notatene og knyttet til læringsutbyttet.
- **Klart delkapittel:** Et delkapittel med notater der både sammendrag og spørsmålsbank er laget (FR-8). Bare klare delkapitler kan åpnes i en økt eller foreslås.
- **Spørsmålsbank:** Alle quizspørsmålene til et delkapittel.
- **Quizspørsmål:** Et spørsmål med fasit og forklaring, knyttet til et tema i et delkapittel.
- **Tema:** Et begrep eller en del av stoffet i et delkapittel. Brukes til å gi et *nytt* spørsmål om samme tema etter et feil svar.
- **Quiz:** Et utvalg quizspørsmål fra spørsmålsbanken til ett delkapittel.
- **Quizresultat:** Andelen riktige svar på én quiz.
- **Gjennomført delkapittel:** Et delkapittel der brukeren har fått minst 80 % riktige på en quiz.
- **Mål:** At 90 % av delkapitlene i emnet er gjennomført før eksamensdatoen.
- **Etterslep:** Hvor mange delkapitler brukeren mangler for å være i rute, regnet etter formelen i FR-9. Bare delkapitler med notater kan gi etterslep.
- **Ligge bak / i rute:** Brukeren ligger bak når etterslepet er større enn 0, og er i rute ellers (FR-9).
- **Framdriftsindikator:** Viser hvor stor andel av delkapitlene som er gjennomført, og fra del 2 om brukeren ligger foran eller bak studieplanen.
- **Forklaringsspørsmål:** Et åpent spørsmål i stil med muntlig eksamen («Forklar hvordan …») som brukeren svarer på med egne ord.
- **Gjennomgangsspørsmål:** Et spørsmål som dekker et helt kapittel, vanligvis oppgitt av faglæreren og limt inn av brukeren (FR-27). Besvares med egne ord.
- **Kapittelgjennomgang:** Alle gjennomgangsspørsmålene til ett kapittel. Blir tilgjengelig når alle delkapitlene i kapittelet er gjennomført, og fordeles på flere økter (FR-28).
- **Tilbakemelding:** KI-ens svar på et forklaringsspørsmål eller gjennomgangsspørsmål: hva som var bra og hva som manglet.
- **Vurdering:** Kort tekst per emne om hvordan brukeren ligger an, basert på quizresultater, forklaringsspørsmål og gjennomgangsspørsmål. Oppgir hvor mye den bygger på.
- **Svakt tema:** Et tema der brukeren har svart feil på minst 2 av de 3 siste quizspørsmålene om temaet, eller som den siste vurderingen peker på som et tema brukeren må jobbe mer med.
- **Varsel:** Push-varsel på telefonen, også når appen ikke er åpen (FR-22 og FR-23, [Bør]).
- **Feilrapport:** Brukeren sier fra om at et sammendrag eller quizspørsmål er feil.

## 4. Funksjoner

Krav merket [Del 1], [Del 2] eller [Del 3] er **Må**-krav. De skal være med i versjonen som leveres 22. november, men bygges i tre trinn. Både funksjonene og pensum i IBE430 legges inn trinnvis, og hvert trinn gir en versjon som kan kjøres og testes før neste starter:

| Trinn | Måldato i bruk | Innhold | IBE430 lagt inn |
|---|---|---|---|
| **[Del 1]** Kjernen | 18.10.2026 | Emneliste, kapittelstruktur, læringsutbytte, notater, sammendrag, quiz, andel gjennomført, demo og tilgangslås | Kapittel 1–4 |
| **[Del 2]** Innlogging og plan mot eksamen | 1.11.2026 | Kontoer og data per bruker, eksamensdato, studieplan, dagens forslag, foran/bak planen, kapittelgjennomgang med KI-tilbakemelding. Demoen får dagens forslag | + kapittel 5 |
| **[Del 3]** Trening til muntlig eksamen og vurdering | 15.11.2026 | Forklaringsspørsmål per delkapittel og vurdering per emne. Demoen får eksempler på begge | + kapittel 6 (hele pensum) |

Kolonnen «IBE430 lagt inn» er et forventet minimum når trinnet er ferdig, ikke en avhengighet. Notater legges inn når forelesningene har vært, uavhengig av hvilket trinn som er i drift. 22.11.2026 er leveringsfrist og buffer.

**[Bør]** er med hvis tiden strekker til, og **[Strekkmål]** bygges bare når alle Må-krav fungerer.

### 4.1 Tilgang, innlogging og data per bruker

**Beskrivelse:** I del 1 finnes det ingen kontoer. Utviklerens egen versjon er beskyttet med en enkel tilgangslås, og demoen er åpen og atskilt. Fra del 2 har hver bruker sin egen innlogging, og alle data (emner, notater, resultater, vurderinger) hører til én bruker. Innloggingen huskes på enheten, slik at brukeren kommer rett inn om kvelden (UJ-1).

#### FR-25: Tilgangslås i del 1 [Del 1]
Utviklerens egen versjon kan bare åpnes med et passord eller en hemmelig lenke.
- Uten passord eller lenke kommer man bare til demoen (FR-26).
- Data som legges inn i del 1, følger med over til utviklerens konto når innlogging kommer i del 2. Ingenting må legges inn på nytt.
- Tilgangslåsen fjernes når FR-1 er på plass.

#### FR-1: Opprette konto og logge inn [Del 2]
En bruker kan opprette en konto og logge inn.
- En bruker som er innlogget, ser bare sine egne data. Forsøk på å hente en annen brukers data avvises.
- Innloggingen huskes på enheten i minst 30 dager.
- Brukeren kan tilbakestille passordet via e-post.

#### FR-2: Slette konto og data [Del 2]
En bruker kan slette kontoen sin og alle tilhørende data.
- Etter sletting finnes det ingen notater, svar eller vurderinger igjen som kan knyttes til brukeren.

### 4.2 Demo

**Beskrivelse:** Demoen lar faglærer, sensor, medstudenter og andre prøve kveldsøkta uten å lage konto. Den erstatter egne testbrukere. Alt innhold i demoen er laget på forhånd, så demoen gjør ingen KI-kall og koster ingenting å kjøre. Realiserer UJ-5.

#### FR-26: Prøve demoen uten innlogging [Del 1 · utvides i Del 2 og Del 3]
Hvem som helst kan åpne demoen fra forsiden uten å lage konto.
- **Innhold:** Demoen har emnet IBE430 med kapittel 1–4 ferdig lagt inn: kapittelstruktur, læringsutbytte, sammendrag og spørsmålsbank for hvert delkapittel. Innholdet bygger på utviklerens egne notater. Er kapittel 4 ikke klart når del 1 settes i drift, starter demoen med de kapitlene som er klare.
- **Spørsmålsbanken:** Hvert delkapittel i demoen har minst 20 quizspørsmål, og hvert tema har minst 2, slik at det alltid finnes et nytt spørsmål om samme tema. Når en demobesøkende har brukt opp banken, kan spørsmålene komme igjen i ny rekkefølge.
- **Tilgjengelig i del 1:** emnelisten, kapittellisten, sammendrag, quiz med samme regler som ellers (FR-14 og FR-15) og framdriftsindikatoren med andel gjennomført (FR-20). En avbrutt quiz kan fortsettes i samme besøk.
- **Tilgjengelig fra del 2:** dagens forslag og foran/bak planen, beregnet ut fra en fast demo-eksamensdato og en fast demo-dag, slik at demoen alltid viser det samme forslaget. I tillegg en kapittelgjennomgang for hvert av kapitlene 1–3, med 5 gjennomgangsspørsmål per kapittel og en fast eksempeltilbakemelding på hvert, slik at den demobesøkende får et inntrykk av hvordan gjennomgangen virker. Svaret den demobesøkende skriver, vurderes ikke.
- **Tilgjengelig fra del 3:** minst ett ferdiglaget forklaringsspørsmål per kapittel med en fast eksempeltilbakemelding, og en ferdiglaget eksempelvurdering på startsiden. Svaret den demobesøkende skriver, vurderes ikke. Eksempeltilbakemeldingen vises uansett, tydelig merket som eksempel.
- **Ikke tilgjengelig:** opprette eller endre emner, lime inn kapittelstruktur, legge inn notater, feilrapporter og alt annet som krever KI-kall eller varig lagring. Disse funksjonene er skjult.
- Demoen gjør ingen KI-kall.
- Det som skjer i demoen, lagres bare så lenge besøket varer, og påvirker aldri utviklerens eller andre brukeres data. Neste besøk starter likt.
- Det er tydelig merket at man er i demoen.
- Demodataene lages fra utviklerens data med en egen kommando og fornyes bare når utvikleren kjører den. Det skjer aldri automatisk.
- Demoen samler ikke inn personopplysninger.

### 4.3 Emner og kapittelstruktur

**Beskrivelse:** Brukeren har en liste over sine emner og velger hvilket som skal jobbes med. Når brukeren oppretter et emne, legges emnekode og navn inn, og fra del 2 også eksamensdato. Kapittelstrukturen limes inn som en liste på engelsk, og appen gjør den om til kapitler og delkapitler med norske titler. Læringsutbytte og eksamensform limes inn fra emnesiden. Ingenting er spesialtilpasset IBE430, så nye emner kan legges til uten endringer i koden. Realiserer UJ-2.

#### FR-3: Opprette og velge emne [Del 1 · eksamensdato i Del 2]
En bruker kan opprette et emne med emnekode og navn, og velge hvilket emne som er aktivt i emnelisten.
- Brukeren kan ha flere emner, og hvert emne har sin egen framdrift.
- Et nytt emne kan legges til uten endringer i koden.
- Brukeren kan endre emnekode og navn og slette emnet.
- [Del 2] Brukeren legger inn og kan endre eksamensdatoen. Endres eksamensdatoen, beregnes studieplanen på nytt (FR-9).
- [Del 2] Når eksamensdatoen legges inn, kan brukeren velge planstart. Standard er samme dag. For IBE430 settes planstart til 1.10.2026, slik at etterslep fra oktober blir synlig.

#### FR-4: Lime inn kapittelstruktur [Del 1]
En bruker kan lime inn en innholdsfortegnelse som ren tekst, og appen gjør den om til kapitler og delkapitler.
- Tolkingen gjøres med vanlig kode, ikke KI. En linje som starter med et heltall og punktum («1.») blir et kapittel. En linje som starter med bindestrek («-») eller et nummer med to ledd («1.1») blir et delkapittel under det nærmeste kapittelet over.
- Den engelske originallisten til IBE430 (se addendum) blir til 6 kapitler og 21 delkapitler i riktig rekkefølge. Listen brukes som testdata.
- Brukeren ser resultatet og kan rette titler, legge til, slette og flytte kapitler og delkapitler før lagring.

#### FR-5: Oversette titler til norsk [Del 1]
Appen oversetter kapittel- og delkapitteltitler fra engelsk til norsk.
- Brukeren ser de norske titlene i appen og kan rette dem.
- Den engelske originaltittelen tas vare på.

#### FR-6: Legge inn læringsutbytte og eksamensform [Del 1]
En bruker kan lime inn emnets læringsutbytte og eksamensform som tekst.
- Sammendrag, forklaringsspørsmål, tilbakemeldinger og vurderinger bruker læringsutbyttet til emnet de hører til. Tilbakemeldinger og vurderinger viser til minst ett læringsutbytte og gjengir ordlyden.
- Eksamensformen styrer stilen på forklaringsspørsmål og tilbakemeldinger. Ved muntlig eksamen skal brukeren forklare med egne ord, slik sensor ville spurt.

#### FR-7: Hente læringsutbytte fra himolde.no [Bør]
Appen kan hente læringsutbytte og eksamensform fra emnesiden på himolde.no ut fra emnekoden.
- Hvis hentingen feiler, får brukeren beskjed og kan lime inn teksten selv (FR-6).

### 4.4 Notater

**Beskrivelse:** Brukeren skriver eller limer inn sine egne forelesningsnotater til hvert delkapittel, ett kapittel om gangen utover semesteret. Innhold fra forelesningsfoliene tas med som tekst i notatet. Notatene er det eneste materialet KI-en bruker. Tekst fra pensumboka eller annet opphavsrettsbeskyttet materiale skal ikke legges inn. Realiserer UJ-2.

#### FR-8: Legge inn og redigere notater [Del 1]
En bruker kan legge inn og redigere notater som tekst til et delkapittel.
- Når notatene lagres, lager appen sammendrag (FR-11) og spørsmålsbank (FR-13) for delkapittelet, slik at økta kan åpnes med en gang om kvelden.
- Når notatene endres, lages sammendraget på nytt, og ubesvarte spørsmål i banken erstattes.
- Et delkapittel uten notater er markert som «mangler notater».
- Notatene lagres selv om KI-genereringen feiler. Delkapittelet viser status: «innhold lages», «klart» eller «feilet – prøv igjen». En feilet generering prøves automatisk på nytt, og brukeren kan starte den på nytt selv.
- Et delkapittel er ikke klart før både sammendrag og spørsmålsbank er laget. Det kan ikke åpnes i en økt, og dagens forslag (FR-10) velger det aldri.

**Utenfor omfang:** Opplasting av filer (PDF, PowerPoint, bilder).

### 4.5 Økter, studieplan og dagens forslag

**Beskrivelse:** I del 1 velger brukeren selv hvilket delkapittel som skal gjennomgås. Fra del 2 fordeler appen de gjenstående delkapitlene på studiedagene (mandag–fredag) fram til eksamensdatoen og sier hver dag hva økta skal inneholde. Brukeren kan bare ligge bak på delkapitler som har notater, så forelesninger som ikke har vært ennå, gir aldri etterslep. Ligger brukeren bak, foreslår appen flere delkapitler per dag og tar i bruk de fleksible dagene. Fra del 3 legges svake temaer inn som repetisjon i tillegg til planen, slik at de ikke fører til etterslep. Realiserer UJ-1 og UJ-4.

#### FR-9: Lage studieplan [Del 2]
Appen lager en studieplan for emnet ut fra eksamensdatoen og delkapitlene som ikke er gjennomført.
- **Planstart** er dagen brukeren valgte da eksamensdatoen sist ble lagt inn eller endret (FR-3). Standard er samme dag. Ved planstart registreres *G₀* (antall gjennomførte delkapitler), *R₀* (antall delkapitler som ikke er gjennomført) og *D* (antall studiedager fra planstart til dagen før eksamensdatoen).
- **Planlagt i dag** = G₀ + ⌈R₀ × *d* / D⌉, der *d* er antall studiedager fra planstart til i går. Dagens økt teller dermed ikke som etterslep før dagen er over.
- **Forventet i dag** = det minste av «planlagt i dag» og G₀ + antall ikke-gjennomførte delkapitler som har notater. Delkapitler uten notater teller altså aldri som etterslep.
- **Etterslep** = forventet i dag − gjennomførte delkapitler, oppgitt i antall delkapitler. Brukeren **ligger bak** når etterslepet er større enn 0, og er **i rute** når det er 0 eller mindre.
- Når brukeren ligger bak, får dagens forslag ett delkapittel ekstra (FR-10), og det kommer forslag også på fleksible dager, til etterslepet er 0.
- Endres eksamensdatoen, starter en ny plan. Planstart er da samme dag, med mindre brukeren velger noe annet.

#### FR-10: Starte økt og vise dagens forslag [Del 1: velge selv · Del 2: dagens forslag · Del 3: repetisjon]
En bruker kan starte en økt, og fra del 2 viser appen dagens forslag.
- [Del 1] Brukeren velger et emne i emnelisten og et klart delkapittel i kapittellisten, og starter en økt med sammendrag og quiz.
- [Del 1] Blir en økt avbrutt, fortsetter den der den slapp neste gang brukeren åpner appen. Quizen som var i gang, og svarene så langt, er lagret. Hvor langt brukeren hadde lest i sammendraget, lagres ikke.
- [Del 2] Startsiden viser dagens forslag fra studieplanen, for eksempel *«I kveld: delkapittel 3.2, deretter quiz.»* Økta startes med ett trykk.
- [Del 2] På studiedager inneholder forslaget de neste klare delkapitlene som ikke er gjennomført. Antallet er ⌈R₀ / D⌉ (minst 1), slik at brukeren holder planen ved å følge forslaget. Når brukeren ligger bak, kommer ett delkapittel i tillegg (FR-9). Forslaget har aldri flere enn 3 delkapitler, slik at økta kan fullføres på omtrent en time. Et større etterslep fordeles på flere dager, også fleksible dager.
- [Del 2] Er en kapittelgjennomgang klar og ikke fullført, får dagens forslag også gjennomgangsspørsmål (FR-28): 10 når forslaget har ett delkapittel eller ingen, 5 når det har 2, og ingen når det har 3. Kapittel 1 med 29 spørsmål tar dermed omtrent tre kvelder. Etterslep på delkapitler går foran.
- [Del 2] Er ingen ikke-gjennomførte delkapitler klare, foreslår appen repetisjon og nye runder med quizer på gjennomførte delkapitler.
- [Del 2] Brukeren kan fortsatt velge et delkapittel selv, også på fleksible dager uten etterslep, for eksempel en lengre økt i helgen.
- [Del 3] Finnes det svake temaer, legges opptil 5 quizspørsmål om dem til som repetisjon. Disse teller ikke med i quizresultatet for delkapittelet.

### 4.6 Sammendrag

**Beskrivelse:** Et kort, KI-generert sammendrag av ett delkapittel, laget fra brukerens notater og knyttet til læringsutbyttet. Det er første steg i økta. Realiserer UJ-1 og UJ-5.

#### FR-11: Vise sammendrag [Del 1]
En bruker kan lese sammendraget av et delkapittel.
- Sammendraget er på norsk og bygger bare på brukerens notater.
- Det er på høyst 600 ord, slik at det kan leses på omtrent 5 minutter.

#### FR-12: Si fra om feil i sammendraget [Del 1]
En bruker kan sende en feilrapport på et sammendrag.
- Sammendraget lages da på nytt.

### 4.7 Quiz og spørsmålsbank

**Beskrivelse:** Hvert delkapittel har en spørsmålsbank med quizspørsmål laget fra notatene. En quiz består av spørsmål fra banken. Svarer brukeren feil, vises riktig svar med forklaring, og senere kommer et *nytt* spørsmål om samme tema. Slik trener brukeren på forståelse og ikke på å huske alternativer. Et delkapittel er gjennomført når brukeren får minst 80 % riktige. Realiserer UJ-1 og UJ-5.

#### FR-13: Lage spørsmålsbank [Del 1]
Appen lager en spørsmålsbank for hvert delkapittel med notater.
- Hvert quizspørsmål har fasit, en kort forklaring og et tema.
- Banken lages med 20 spørsmål per delkapittel. Når færre enn 10 spørsmål er ubesvart, fylles den på med nye, slik at brukeren kan ta flere quizer uten å få de samme spørsmålene.

#### FR-14: Ta quiz [Del 1]
En bruker kan ta en quiz på et delkapittel.
- En quiz har 10 flervalgsspørsmål med fire alternativer.
- Ved feil svar vises riktig svar og forklaringen med en gang.
- Et tema brukeren har svart feil på, får et nytt spørsmål senere i samme quiz. Det nye spørsmålet erstatter et av de gjenstående spørsmålene, så quizen har alltid 10 spørsmål, og resultatet regnes av 10. Var feilen på det siste spørsmålet, kommer det nye spørsmålet i neste quiz på delkapittelet. Det er aldri det samme spørsmålet på nytt.
- Etter quizen ser brukeren quizresultatet («8 av 10 riktige»).

#### FR-15: Krysse av gjennomført delkapittel [Del 1]
Et delkapittel krysses av som gjennomført når brukeren får minst 80 % riktige på en quiz.
- Under 80 % blir delkapittelet ikke krysset av, og det kan tas på nytt med sammendrag og ny quiz. Fra del 2 blir det foreslått igjen (FR-10).

#### FR-16: Si fra om feil quizspørsmål [Del 1]
En bruker kan sende en feilrapport på et quizspørsmål.
- Spørsmålet fjernes fra spørsmålsbanken og erstattes med et nytt om samme tema.
- Spørsmålet teller ikke med i quizresultatet. Resultatet og 80 %-grensen regnes ut fra de gjenværende spørsmålene (for eksempel 8 av 9).

### 4.8 Forklaringsspørsmål

**Beskrivelse:** Åpne spørsmål i stil med muntlig eksamen («Forklar hvordan …») som brukeren svarer på med egne ord, uten tidsbegrensning. KI-en sier hva som var bra og hva som manglet, målt mot læringsutbyttet. Spørsmålene dukker opp etter en quiz når appen bestemmer det, som en overraskelse, og brukeren kan også velge dem selv. De påvirker ikke om et delkapittel er gjennomført, men teller med i vurderingen. De er med i Må-kravene fordi muntlig eksamen tester forklaring, og fordi vurderingen ikke kan bli realistisk uten dem. Realiserer UJ-3.

#### FR-17: Få forklaringsspørsmål etter quiz [Del 3]
Etter en quiz kan appen gi brukeren et forklaringsspørsmål fra det samme delkapittelet.
- Det skjer ikke etter hver quiz. Appen bestemmer når, men aldri i to økter på rad og minst hver tredje økt.
- Brukeren kan hoppe over spørsmålet.

#### FR-18: Velge forklaringsspørsmål selv [Del 3]
En bruker kan velge å trene på forklaringsspørsmål for et emne eller et delkapittel som har notater.

#### FR-19: Svare og få tilbakemelding [Del 2]
En bruker kan skrive svaret på et forklaringsspørsmål eller et gjennomgangsspørsmål og få en tilbakemelding. Bygges i del 2 for kapittelgjennomgangen (FR-28) og brukes av forklaringsspørsmålene i del 3.
- Det er ingen tidsbegrensning.
- Tilbakemeldingen er på norsk og sier hva som var bra og hva som manglet, målt mot læringsutbyttet og notatene. For gjennomgangsspørsmål brukes notatene fra alle delkapitlene i kapittelet.
- Svaret og tilbakemeldingen lagres og brukes i vurderingen (FR-21) når den kommer i del 3.
- Svaret lagres før tilbakemeldingen lages. Feiler KI-en, får brukeren beskjed og kan prøve igjen uten å skrive svaret på nytt.

### 4.9 Kapittelgjennomgang

**Beskrivelse:** Når alle delkapitlene i et kapittel er gjennomført, går brukeren gjennom hele kapittelet med gjennomgangsspørsmål, vanligvis de faglæreren har gitt. Det binder delkapitlene sammen, slik muntlig eksamen gjør. Spørsmålene besvares med egne ord og får tilbakemelding (FR-19). Gjennomgangen fordeles på flere kvelder. Realiserer UJ-6.

#### FR-27: Lime inn gjennomgangsspørsmål for et kapittel [Del 2]
En bruker kan lime inn gjennomgangsspørsmålene til et kapittel som ren tekst.
- Tolkingen gjøres med vanlig kode, ikke KI. En linje som starter med et heltall og punktum («1.») begynner et nytt spørsmål. Linjer uten nummer hører til spørsmålet over.
- Gjennomgangsspørsmålene til kapittel 1 i IBE430 (se addendum) blir til 29 spørsmål i riktig rekkefølge. Listen brukes som testdata.
- Brukeren ser resultatet og kan rette, legge til og slette spørsmål før lagring.
- Spørsmålene hører til kapittelet, ikke til et delkapittel.
- Har kapittelet ingen innlimte spørsmål når alle delkapitlene er klare, lager KI-en 10 gjennomgangsspørsmål fra notatene i hele kapittelet. De er merket som laget av appen og kan erstattes ved at brukeren limer inn spørsmål.

#### FR-28: Ta kapittelgjennomgangen [Del 2]
Når alle delkapitlene i et kapittel er gjennomført (FR-15), blir kapittelgjennomgangen tilgjengelig.
- Appen sier fra når en kapittelgjennomgang blir klar, og den vises ved kapittelet i kapittellisten.
- Spørsmålene kommer ett om gangen, i rekkefølgen de ble limt inn, og fordeles på flere økter gjennom dagens forslag (FR-10). Brukeren kan også starte gjennomgangen selv og svare på så mange spørsmål som ønskelig.
- Hvert svar får tilbakemelding etter FR-19.
- Brukeren kan hoppe over et spørsmål. Det kommer igjen etter de andre spørsmålene i gjennomgangen.
- Når alle spørsmålene er besvart, er kapittelgjennomgangen fullført og markert i kapittellisten. Brukeren kan ta den på nytt.
- Kapittelgjennomgangen påvirker ikke om delkapitlene er gjennomført, og den teller ikke i studieplanen eller etterslepet. Svarene teller med i vurderingen (FR-21).
- En avbrutt gjennomgang fortsetter fra neste ubesvarte spørsmål.

### 4.10 Framdrift og vurdering

**Beskrivelse:** Startsiden viser hvor langt brukeren har kommet mot målet (90 % av delkapitlene før eksamen), fra del 2 om brukeren ligger foran eller bak planen, og fra del 3 den siste vurderingen. Vurderingen oppdateres etter hver økt. Den er veiledning ut fra brukerens egne svar, ikke en spådom om eksamen. Realiserer UJ-1 og UJ-4.

#### FR-20: Framdriftsindikator [Del 1: andel gjennomført · Del 2: foran/bak planen]
Startsiden viser framdriftsindikatoren for det valgte emnet.
- Den viser andelen gjennomførte delkapitler og hvor langt det er igjen til målet (eksempel for IBE430: 19 av 21).
- [Del 2] Den viser også om brukeren ligger foran eller bak studieplanen, og etterslepet eller forspranget i antall delkapitler (FR-9). Ligger brukeren bak, er dette tydelig markert på startsiden sammen med hva som skal til for å komme i rute, for eksempel «2 delkapitler i kveld, så er du i rute fredag» (se tonen i §6).

#### FR-21: Vurdering etter hver økt [Del 3]
Etter hver økt lager appen en vurdering av hvordan brukeren ligger an i emnet.
- Vurderingen er en eller to setninger på norsk som sier hva brukeren har god kontroll på og hvilke temaer som trenger mer arbeid, målt mot læringsutbyttet.
- Den bygger på quizresultater, forklaringsspørsmål og gjennomgangsspørsmål, og sier hva den bygger på (for eksempel «basert på 12 quizer, 3 forklaringsspørsmål og 29 gjennomgangsspørsmål»).
- Den vises etter økta og ligger på startsiden til neste vurdering.
- Svake temaer brukes i dagens forslag (FR-10).
- Feiler KI-en, beholdes forrige vurdering på startsiden, og ny vurdering lages etter neste økt.

### 4.11 Varsler [Bør]

**Beskrivelse:** Push-varsler på telefonen når brukeren ikke har appen åpen, fordi en hektisk hverdag gjør påminnelser viktige. Briefen har ikke varsler blant Må-kravene, så de bygges bare hvis tiden strekker til. Uten varsler ser brukeren etterslepet på startsiden (FR-20). Forutsetter studieplanen i del 2. Støtter UJ-4.

#### FR-22: Påminnelse på studiedager [Bør]
Brukeren får et push-varsel hver studiedag (mandag–fredag) før studietiden.
- Brukeren kan velge klokkeslett (standard 21:15) og slå påminnelsen av og på.
- Varselet nevner dagens forslag, for eksempel «I kveld: 3.2 Forretningssystemenes rolle i innkjøpsprosessen».

#### FR-23: Varsel når brukeren ligger bak [Bør]
Ligger brukeren bak studieplanen, kommer det et push-varsel hver dag, også lørdag og søndag, til brukeren er i rute igjen.
- Varslene stopper når framdriftsindikatoren viser at brukeren er i rute.
- Ligger brukeren bak på en studiedag, sendes ett samlet varsel i stedet for både påminnelse (FR-22) og varsel om etterslep.

### 4.12 Tale som svarform [Strekkmål]

**Beskrivelse:** Brukeren kan svare på forklaringsspørsmål med tale i stedet for tekst, fordi det ligner mest på muntlig eksamen. Talen gjøres om til tekst og behandles som et tekstsvar. Bygges bare når alle Må-krav fungerer.

#### FR-24: Svare med tale [Strekkmål]
En bruker kan diktere svaret på et forklaringsspørsmål på norsk og se teksten før svaret sendes.

## 5. Tverrgående krav (NFR)

- **NFR-1 Enheter:** Appen og demoen fungerer på mobil, iPad og PC i nyere versjoner av Safari og Chrome, uten at siden må rulles sidelengs.
- **NFR-2 Språk:** Grensesnittet og alt KI-generert innhold er på norsk bokmål.
- **NFR-3 Rask start om kvelden:** Startsiden og dagens sammendrag vises på under 3 sekunder, fordi innholdet er laget på forhånd (FR-8). Tilbakemelding på forklarings- og gjennomgangsspørsmål vises på under 20 sekunder.
- **NFR-4 Personvern:** Data lagres i EU/EØS. KI-leverandøren skal ha vilkår om at dataene ikke brukes til trening. Appen samler ikke inn flere personopplysninger enn e-post og det brukeren selv legger inn. Demoen samler ikke inn personopplysninger.
- **NFR-5 Sikkerhet:** Brukerdata er skjermet per bruker (FR-1), og i del 1 bak tilgangslåsen (FR-25). Demoen har aldri tilgang til utviklerens eller andre brukeres data. All trafikk går over HTTPS.
- **NFR-6 Kostnad:** KI-kostnaden for én bruker er maks 100 kr i måneden, og helst null. Et gratis alternativ velges bare hvis det oppfyller NFR-4. Demoen gjør ingen KI-kall, så antall demobesøk påvirker ikke kostnaden.
- **NFR-7 I drift:** Appen og demoen er satt i drift og tilgjengelige på en offentlig adresse fra del 1. Hvert trinn settes i drift når det er ferdig.
- **NFR-8 Kvalitetssikring:** Kjernelogikken har automatiske tester: tolking av kapittellister og gjennomgangsspørsmål, at kapittelgjennomgangen åpnes når alle delkapitlene er gjennomført, antall gjennomgangsspørsmål i dagens forslag, avkrysning ved 80 %, nytt spørsmål om samme tema, studieplan, foran/bak og størrelsen på dagens forslag. Det samme gjelder demoen og overgangen mellom delene: at demoen aldri skriver til utviklerens data, at demodataene har minst 20 spørsmål per delkapittel og minst 2 per tema, og at data fra del 1 følger med til kontoen i del 2.

## 6. Utseende og tone

- **Startsiden** er oversiktlig, imøtekommende og fargerik. Det nye brukeren ser hver gang, er dagens forslag, framdriftsindikatoren og den siste vurderingen (etter hvert som delene kommer på plass).
- **Lav terskel:** Dagens økt skal kunne startes med ett trykk fra startsiden. Demoen skal kunne startes med ett trykk fra forsiden.
- **Fullførbar kveld:** Dagens forslag skal kunne fullføres på omtrent en time, også når brukeren ligger bak (FR-10). Kvelder med kapittelgjennomgang kan ta lenger tid, men skal holde seg innenfor studietiden på halvannen time.
- **Etterslep uten dårlig samvittighet:** Meldinger om etterslep viser veien tilbake, ikke bare et minustall: hva som skal gjøres, og når brukeren er i rute igjen. De bruker ikke skyldspråk som «du har ikke gjort …». Målet er at brukeren åpner appen igjen, ikke at brukeren føler seg dårlig.
- **KI-tekst** er kort, ærlig og vennlig. Vurderingen pynter ikke på situasjonen, men er heller ikke nedslående. Den sier hva som går bra før den sier hva som mangler.

## 7. Rammer og begrensninger

- **Frist og ressurser:** Én utvikler fra slutten av september til undervisningsslutt 22. november 2026. Måldatoene er 18.10 for del 1, 1.11 for del 2 og 15.11 for del 3, slik at del 3 er i bruk minst én uke før fristen og det blir tid til retting. Fristen 22.11 er planlagt, men ikke bekreftet (se §11).
- **Bygg og bruk samtidig:** Eksamen i IBE430 er i starten av desember, så appen brukes mens den bygges. Hvert trinn legger inn mer av pensum: kapittel 1–4 i del 1, kapittel 5 i del 2 og kapittel 6 i del 3.
- **IBE160:** Prosjektkode og funksjonalitet utgjør 70 % av karakteren, så funksjoner som virker, går foran finpuss. Appen utvikles med KI (Claude Code og BMad). Det dokumenteres hvordan KI ble brukt i planlegging, koding og testing, og hvordan koden ble kvalitetssikret: tester, gjennomganger og hva som ble rettet. Utviklerens egen bruk fra oktober dokumenteres, med hva som ble endret underveis.
- **Opphavsrett:** Bare brukerens egne forelesningsnotater legges inn, også i demoen. Det stemmer med HiMoldes KI-retningslinjer og Kopinor-avtalen.

## 8. Dette er ikke Studievenn (ikke-mål)

- Et generelt KI-studieverktøy som konkurrerer med NotebookLM eller Quizlet.
- En tjeneste for å laste opp og oppsummere lærebøker.
- En spådom om eksamenskarakteren. Vurderingen er veiledning.
- En app for trening på praktiske SAP-ferdigheter. Quizene trener forståelse av prosesser og flyt, ikke utførelse i SAP.
- En betalt tjeneste. Betalte kontoer hører til visjonen og en eventuell senere versjon.

## 9. Omfang

### 9.1 Med i denne versjonen
- **Må del 1 (oktober, IBE430 kapittel 1–4):** FR-3 (uten eksamensdato), FR-4 til FR-6, FR-8, FR-10 (velge selv), FR-11 til FR-16, FR-20 (andel gjennomført), FR-25 og FR-26.
  - **Minimum i del 1:** FR-3, FR-4, FR-6, FR-8, FR-10, FR-11, FR-13, FR-14, FR-15, FR-20, FR-25 og FR-26. Det er nok til at kveldsøkta fungerer fra start til slutt, både for utvikleren og i demoen. FR-6 er med fordi «den kjenner emnet» skal gjelde fra første dag.
  - **Kan flyttes til del 2 hvis det blir trangt:** FR-5, FR-12 og FR-16. Fram til FR-5 er på plass, skriver brukeren titlene på norsk selv.
- **Må del 2 (1.11, IBE430 kapittel 5):** FR-1, FR-2, FR-3 (eksamensdato og planstart), FR-9, FR-10 (dagens forslag og gjennomgangsspørsmål), FR-19, FR-20 (foran/bak), FR-26 (dagens forslag og kapittelgjennomgang i demoen), FR-27 og FR-28. FR-25 fjernes. Del 2 er det største trinnet, fordi kapittelgjennomgangen krever KI-tilbakemelding (FR-19) allerede her.
  - **Minimum i del 2:** FR-1, FR-3, FR-9, FR-10, FR-19, FR-20, FR-27 (uten KI-genererte spørsmål) og FR-28.
  - **Kan flyttes til del 3 hvis det blir trangt:** FR-2, KI-genererte gjennomgangsspørsmål i FR-27 og demoutvidelsen i FR-26.
- **Må del 3 (15.11, IBE430 kapittel 6, hele pensum):** FR-10 (repetisjon av svake temaer), FR-17, FR-18, FR-21 og FR-26 (forklaringsspørsmål og vurdering i demoen). FR-19 er allerede bygd i del 2.
  - **Minimum i del 3:** FR-18 og FR-21. Det er nok til å trene til muntlig eksamen og få en vurdering som bygger på forklaring.
  - **Kan kuttes hvis det blir trangt:** FR-17 (overraskende spørsmål etter quiz), repetisjon av svake temaer i FR-10 og demoutvidelsen i FR-26.
- **Bør være med:** FR-7 (henting fra himolde.no), FR-22 og FR-23 (push-varsler).
- **Strekkmål:** FR-24 (tale).

### 9.2 Ikke med
- Flashcards, fordi quizen dekker behovet.
- Spaced repetition, altså repetisjon med økende mellomrom.
- Egne testbrukere. Demoen erstatter dem.
- Betalte kontoer. De hører til visjonen.
- Opplasting av filer (PDF, PowerPoint, bilder). Notater, også innhold fra foilene, legges inn som tekst.
- Åpning for andre brukere med egne kontoer. Det avgjøres etter at appen er prøvd gjennom et helt emne.
- KI-kall i demoen. Alt demoinnhold er laget på forhånd.
- Integrasjon med Canvas eller Leganto.
- Bruk uten nett. Appen krever nettilgang.

## 10. Suksesskriterier

**For studenten, målt fram til eksamen i IBE430 i desember 2026**
- **SM-1 Appen brukes:** Minst én økt på minst fem ulike kvelder i uka fra del 1 er i bruk (18.10) til eksamen. Indikerer at FR-10 og FR-20 virker.
- **SM-2 Målet nås:** Minst 90 % av delkapitlene (19 av 21) er gjennomført før eksamensdatoen. Indikerer at FR-9, FR-14 og FR-15 virker.
  - *Kontrollpunkt 1.11.:* Omtrent så mange delkapitler er gjennomført som planen fra 1.10 tilsier (rundt 10), med de delkapitlene som har notater som øvre grense.
  - *Kontrollpunkt 22.11.:* Brukeren er i rute eller foran studieplanen med planstart 1.10 (FR-9).
- **SM-3 Vurderingen er realistisk:** Den siste vurderingen før eksamen stemmer med hvordan eksamen gikk og hvilke temaer som satt, kontrollert i etterkant. Indikerer at FR-19, FR-21 og FR-28 virker.
  - *Kontrollpunkt før eksamen:* Brukeren noterer én gang i uka fra del 3 er i bruk (15.11) til eksamen om vurderingen stemmer med egen opplevelse. Det gir minst 3 notater, og flertallet sier «stemmer».

**For IBE160**
- **SM-4 Testbar kjerne i oktober:** Når del 1 er ferdig (18.10), kan appen kjøres og testes med kapittel 1–4 i IBE430: velge emnet, åpne et delkapittel, lese KI-sammendraget og ta en quiz med riktig svar ved feil og nye spørsmål om samme tema. Det samme kan gjøres i demoen. Utvikleren bruker denne versjonen før del 2 starter.
- **SM-5 Alt er i drift:** Alle Må-krav i del 1–3 fungerer i en versjon som er i drift innen 22. november, med alle seks kapitlene i IBE430 lagt inn.
- **SM-6 Demoen virker for alle:** Hvem som helst, for eksempel faglærer eller sensor, kan kjøre demoen uten å lage konto. Ved levering viser den hele kveldsøkta: dagens forslag, sammendrag, quiz, forklaringsspørsmål og vurdering (FR-26).
- **SM-7 Dokumentasjon:** Dokumentasjonen viser KI-bruk og kvalitetssikring (tester, gjennomganger og hva som ble rettet) gjennom hele utviklingen, og utviklerens egen bruk fra oktober med hva som ble endret underveis.

**Motvekter (skal ikke optimaliseres)**
- **SM-C1 Lette quizer:** Et høyt quizresultat er ikke et mål i seg selv. Blir spørsmålene så lette at 80 % nås uten anstrengelse, gir SM-2 et falskt bilde. Motvekt til SM-2.
- **SM-C2 Antall varsler:** Flere varsler gir ikke mer læring. Blir varslene masete, slår brukeren dem av. Motvekt til SM-1, hvis FR-22 og FR-23 bygges.
- **SM-C3 Skryt i vurderingen:** En vurdering som bare er positiv, føles god, men er ikke realistisk. Motvekt til SM-3.
- **SM-C4 Pyntet demo:** Demoen skal vise appen slik den virker, ikke et håndplukket utvalg av de beste sammendragene og spørsmålene. Motvekt til SM-6.

## 11. Åpne spørsmål

1. **Når er innleveringsfristen i IBE160?** Planen bygger på 22.11.2026, men datoen er ikke bekreftet.
2. **Hvilken KI-leverandør skal appen bruke?** Avgjøres i arkitekturen ut fra EU-lagring, vilkår om trening, kostnad og kvalitet på norsk.
3. **Fungerer push-varsler på brukerens telefon?** Gjelder bare hvis FR-22 og FR-23 bygges. Testes da tidlig (se addendum).
4. **Er norsk talegjenkjenning god nok?** Testes tidlig i prosjektet, slik briefen sier.
