---
title: "Product Brief: Studievenn"
status: draft
created: 2026-09-27
updated: 2026-09-27
---

# Product Brief: Studievenn

## Sammendrag

Studievenn er en responsiv webapp som hjelper deltidsstudenter med jobb og familie å bruke den lille studietiden godt. Med halvannen time sent på kvelden er problemet sjelden mangel på materiale, men at man ikke vet hvor man skal begynne, ikke ser at man ligger etter, og ender med å pugge rett før eksamen.

Appen gjør hver kveld om til en konkret, fullførbar økt tilpasset eksamensdatoen: KI-generert sammendrag av ett delkapittel, deretter quiz og forklaringsspørsmål. Den gir også en kort, ærlig vurdering av hvordan man ligger an, målt mot emnets læringsutbytte.

Studievenn finner ikke opp noe nytt, men tilpasser velkjente idéer til én studiehverdag. Den utvikles som semesterprosjekt i IBE160 Programmering med KI, med IBE430 Forretningsprosesser og ERP (muntlig eksamen i desember 2026) som første emne.

## Problemet

For en student med fulltidsjobb og familie kommer studietiden sist på dagen. Etter jobb fra 08.00 til 15.30, henting i barnehagen, middag, barnas aktiviteter, legging, rydding og matpakker blir det studietid fra rundt 21.30 til omtrent 23.00, med lite energi igjen. I helgene blir det noen lengre økter hvis tiden strekker til.

Problemet har tre deler:

- **Man vet ikke hvor man skal begynne.** Pensum er stort, og verdifulle minutter går med til å velge, uten garanti for at tiden brukes på det viktigste.
- **Man ser ikke at man ligger etter før det er for sent.** Ingenting gir et tydelig signal gjennom semesteret om hvordan man ligger an i hvert emne.
- **Man ender med å pugge rett før eksamen.** Egne notater og litt ChatGPT hjelper noe, men uten struktur blir det innspurtspugging i stedet for jevn læring.

Konsekvensene er stress, dårlig samvittighet og i noen tilfeller dårlig karakter eller stryk. Det som mangler, er ikke bare tid, men en bærekraftig og målrettet måte å bruke den på.

## Hvem den er for

**Primærbruker i første versjon: utvikleren selv**, en deltidsstudent ved Høgskolen i Molde med fulltidsjobb og små barn. Pilotemnet er IBE430 Forretningsprosesser og ERP, som avsluttes med 15 minutters muntlig eksamen. Suksess betyr å vite hva hver kveld skal brukes til, å se at det går framover, og å møte til eksamen uten å pugge i siste liten.

**Senere: andre studenter i samme situasjon**, med jobb, familie og lite, oppstykket studietid. Appen bygges fra start med innlogging og data per bruker, slik at den kan åpnes for flere senere.

**Flere emner over tid.** Brukeren velger emne fra en liste over egne emner. IBE430 er det første, men ingenting skal være spesialtilpasset det. Nye emner, for eksempel fra vårsemesteret i januar 2027, skal kunne legges til uten endringer i koden.

## Løsningen

Studievenn kan brukes på PC, nettbrett og mobil. For hvert emne brukeren legger inn, henter appen læringsutbyttet og eksamensformen fra emnesiden på himolde.no, og brukeren legger inn kapittelstrukturen fra pensum sammen med egne notater og forelesningsfoiler.

**Kveldsøkta er kjernen.** Brukeren åpner appen og får et konkret forslag: *«I kveld: delkapittel 3.2, deretter quiz.»* Forslaget tar hensyn til eksamensdatoen og hvor mye som gjenstår, så arbeidet fordeles jevnt i stedet for å hope seg opp. Økta har to steg:

1. **Et kort sammendrag av delkapittelet**, laget av KI ut fra brukerens eget materiale og knyttet til emnets læringsutbytte.
2. **En quiz på det samme delkapittelet**, med spørsmål fra en spørsmålsbank. Ved feil svar vises riktig svar med forklaring, og senere kommer et *nytt* spørsmål om samme tema. Slik trener man på forståelse, ikke på å huske svaralternativer.

**Trening til muntlig eksamen.** I tillegg til raske kontrollspørsmål har appen forklaringsspørsmål som brukeren svarer på med egne ord, som tekst eller tale. KI-en sier hva som var bra og hva som manglet, sammenlignet med læringsutbyttet.

**«Hvordan ligger jeg an?»** Ut fra resultatene på quiz og forklaringsspørsmål gir appen en ærlig tilbakemelding per emne på én eller to setninger, for eksempel: *«Du har god kontroll på innkjøpsprosessen, men trenger mer arbeid med dokumentflyt i produksjon.»* Dette er veiledning basert på egne svar, ikke en spådom om eksamen.

## Hva som skiller den ut, og ambisjonsnivået

Studievenn kommer ikke til å slå Google NotebookLM eller Quizlet som generelle KI-verktøy for studier. Sammendrag, flashcards og quiz fra opplastet materiale finnes allerede i disse og i norske tjenester som StuderSmartere.no, og prosjektet later ikke som noe annet.

Det Studievenn gjør annerledes, er smalt, men reelt:

- **Den tar beslutningen for deg.** I stedet for en verktøykasse sier den hva som bør gjøres i kveld.
- **Den kjenner emnet.** Læringsutbytte og eksamensform styrer sammendrag, spørsmål og tilbakemelding; generelle verktøy vet ikke at studenten skal ha muntlig eksamen i IBE430.
- **Den er laget for kort og oppstykket tid** og for trening til muntlig eksamen, ikke for lange leseøkter.

**Den største verdien ligger i to-i-én-effekten.** IBE160-prosjektet brukes i et emne utvikleren faktisk tar, IBE430, og gir læring på to fronter: å utvikle en KI-basert fullstack-applikasjon og å arbeide aktivt med pensum, læringsutbytte og eksamensform i IBE430. Bare det å bygge appen tvinger fram en grundig gjennomgang av fagstoffet.

## Omfang

Én utvikler har fra slutten av september til undervisningsslutt 22. november 2026, som også er leveringsfristen i planleggingen. Siden eksamen i IBE430 er i starten av desember, bygges og brukes appen samtidig: en enkel versjon med ett delkapittel, sammendrag og quiz tas i bruk i oktober og utvides gradvis. Det gir læring i IBE430 underveis og ekte brukertesting til dokumentasjonen i IBE160.

**Må være med (novemberversjonen)**
- Innlogging og data per bruker
- Emneliste: legge til emner og velge hvilket man vil jobbe med
- Legge inn kapittel- og delkapittelstruktur og laste opp egne notater og foiler
- KI-generert sammendrag per delkapittel
- Quiz per delkapittel fra en spørsmålsbank: riktig svar vises ved feil, og et nytt spørsmål om samme tema kommer senere
- Eksamensdato og dagens forslag («I kveld: …»)
- Forklaringsspørsmål besvart med tekst, med tilbakemelding fra KI-en. De trengs fordi muntlig eksamen tester forklaring, og vurderingen ikke kan bli realistisk uten dem.
- En kort vurdering av hvordan man ligger an, per emne, basert på både quiz og forklaringsspørsmål, som også sier hvor mye den bygger på

**Bør være med hvis tiden strekker til**
- Automatisk henting av læringsutbytte og eksamensform fra himolde.no, med mulighet til å lime inn selv hvis hentingen feiler

**Strekkmål: tale**
Tale som svarform på forklaringsspørsmål, fordi det ligger nærmest muntlig eksamen. Tale bygges bare som et tillegg til tekstsvar, og først når alt over fungerer. En kort test av norsk talegjenkjenning på egne enheter tidlig i prosjektet avklarer om det er gjennomførbart.

**Ikke med i denne versjonen**
- Flashcards, fordi quizen dekker behovet
- Spaced repetition, altså repetisjon med økende mellomrom
- Åpning for andre brukere
- Integrasjon med Canvas eller Leganto
- Opplasting av opphavsrettsbeskyttede lærebøker

## Suksesskriterier

**For studenten, målt fram til eksamen i IBE430 i starten av desember 2026:**
- **Appen blir faktisk brukt**, minst fem kvelder i uka fra oktober til eksamen. De to andre dagene brukes fleksibelt.
- **Minst 90 % av delkapitlene er gjennomgått** med sammendrag og quiz før eksamen.
- **Vurderingen er realistisk.** Siste vurdering før eksamen stemmer med hvordan eksamen går, kontrollert i etterkant mot resultatet og egen opplevelse av hvilke temaer som satt.

**For IBE160-prosjektet:**
Prosjektkode og funksjonalitet utgjør 70 % av karakteren, og vurderingen krever en KI-generert applikasjon med dokumentasjon.
- Alle punktene under «Må være med» fungerer i en versjon som er satt i drift og brukes av utvikleren.
- Dokumentasjonen viser hvordan KI ble brukt gjennom hele utviklingen (planlegging, koding og testing), og hvordan koden ble kvalitetssikret (tester, gjennomganger og hva som ble rettet).
- Egen bruk av appen fra oktober er dokumentert som brukertesting.

## Visjon

Studievenn er først og fremst et studieprosjekt i IBE160 og et studieverktøy fram mot eksamen i IBE430 i desember 2026. Alt etter det er en bonus. Fungerer appen godt, er det naturlig å fortsette å bruke den i nye emner fra januar 2027. Målet for neste versjon er tale som svarform, slik at forklaringsspørsmålene ligner enda mer på muntlig eksamen, hvis prosjektet kommer så langt. Om appen skal åpnes for andre studenter, avgjøres først etter at den er prøvd i et helt emne.
