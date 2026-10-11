---
emne: IBE430
kapittel: 5
tittel: "Produksjonsprosessen"
lagt_inn: 2026-10-11
---

# IBE430 kapittel 5: notater

Brukerens notater til kapittel 5, lagt inn 11.10.2026 i tre omganger. Notatene er kildemateriale for sammendrag og spørsmålsbank (PRD §3 «Notat»). Delkapittelstrukturen står i PRD-addendumet, «Kapittelstruktur for IBE430».

Skrivefeil er rettet i alt unntatt råteksten nederst. Innholdet er ikke omformulert.

## Læringsmål for kapittelet

Fra innliming 1. Læringsmålene gjelder kapittel 5 og er ikke emnets offisielle læringsutbytte (PRD §3).

Etter at kapittelet er fullført, skal du kunne:
- beskrive trinnene i produksjonsprosessen
- forklare rollen til ulike funksjonsområder i effektiv og virkningsfull fullføring av prosessen
- identifisere de viktigste data-, dokument- og informasjonsstrømmene knyttet til produksjonsprosessen
- forklare rollen til bedriftssystemer i å støtte prosessen

## Fordelt på delkapitler

Notatet i appen ligger per delkapittel. Teksten er fordelt slik, fra råteksten nederst.

### 5.1 Nøkkelbegreper og forutsetninger

Produksjonsprosessen er også kjent som plan-to-produce-prosessen. Produksjonsprosessen inkluderer alle trinnene som er nødvendige for å lage ferdige varer fra komponenter. Denne prosessen er mer kompleks enn anskaffelses- og oppfyllelsesprosessen. Det finnes mange forskjellige typer produksjonsprosesser, og de kan klassifiseres på ulike måter. Produksjon kan for eksempel involvere enten montering eller tilvirkning. I motsetning til tilvirkning innebærer montering å ta en rekke komponentmaterialer, for eksempel et produkt eller en råvare, og sette dem sammen for å produsere. En annen måte å klassifisere produksjon på er diskret produksjon, der produktene kan telles stykk for stykk, i motsetning til prosessproduksjon, der produktene lages i mengder. Noen bedrifter produserer varer kun som svar på direkte kundeordrer, mens andre lager et lager av produkter som de kan lagre og deretter bruke senere for å møte kundenes behov. Den førstnevnte strategien kalles «produksjon på bestilling», og den siste kalles «produksjon på lager».

I anskaffelses- og leveringsprosessen var materialene som ble anskaffet og solgt, handelsvarer, det vil si materialer som ganske enkelt kjøpes og deretter videreselges. Derfor fokuserer stamdataene i stor grad på kunder, leverandører og materialer. I motsetning til dette involverer produksjonsprosessen en annen type materiale, nemlig et sammensatt materiale eller produkt. Med andre ord produseres materialet ved å sette sammen flere komponentmaterialer. Av denne grunn involverer produksjonsprosessen tre ekstra typer stamdata: materialliste, arbeidssenter og produktruting.

En materialliste (BOM) identifiserer alle materialene eller delene som trengs for å lage en enhet av et ferdig produkt. Den er basert på produktets design. Selve oppgaven med å lage produktet skjer i et arbeidssenter. En eller flere oppgaver eller operasjoner kan fullføres i et arbeidssenter. Produktruting definerer trinnene eller operasjonene som er nødvendige for å lage produktet. For hver operasjon viser rutingen arbeidssenteret der operasjonen skal utføres, tiden som er avsatt til hver operasjon, og materialet som skal brukes i hver operasjon.

Produksjonsprosessen starter med en produksjonsforespørsel i form av en planlagt ordre. Den planlagte ordren brukes til å be om at selskapet produserer en spesifisert mengde varer. Det ligner på en innkjøpsrekvisisjon som diskutert i kapittel 3. Forskjellen er at en innkjøpsrekvisisjon brukes for materialer kjøpt fra leverandører, mens en planlagt ordre brukes for materialer produsert i selskapet. En produksjonsordre gir skriftlig autorisasjon til verkstedet til å produsere den angitte mengden produkter. Flere planlagte ordrer kan slås sammen til én produksjonsordre, eller en planlagt ordre kan deles inn i mange produksjonsordrer, avhengig av forespurt mengde og tilgjengelig produksjonskapasitet i de ulike anleggene.

Oppsummering: Produksjonsprosesser er i virkeligheten komplekse og kan involvere mange flere trinn enn nevnt over. Hensikten er imidlertid å fokusere på det grunnleggende. En produksjonsprosess begynner med et behov for materialer. Behovet skyldes en spesifikk kundeordre når strategien produksjon på bestilling er i bruk, eller et behov for å øke lagerbeholdningen når strategien produksjon på lager brukes. I begge tilfeller representeres behovet av en planlagt ordre. En planlagt ordre må godkjennes av produksjonslederen, og når den er godkjent, resulterer den i en produksjonsordre. En produksjonsordre er en forpliktelse til produksjon og autoriserer lageret til å frigi materialer til å produsere de nødvendige produktene. Den autoriserer verkstedet til å starte produksjonen. Materialene sendes deretter ut fra lageret til verkstedet, der produksjonen kan starte. Når produksjonen er fullført, flyttes den produserte varen til lageret.

De viktigste trinnene i en klassisk produksjonsprosess strekker seg fra idé til ferdig levert produkt, og kan deles inn i fem kjernefaser: planlegging, innkjøp, selve produksjonen, kvalitetskontroll og distribusjon.

Gjennomgangsspørsmål 2 besvares med trinnene fra oppsummeringen over (bokas modell): planlagt ordre, godkjenning, produksjonsordre, uttak av materialer fra lageret, produksjon og ferdigvarer til lageret. De fem kjernefasene er en bredere oversikt.

Flyter (kopiert fra kapittel 4, 4.1): De fire flytene er fysisk flyt, dataflyt, dokumentflyt og informasjonsflyt.

Flytene forklart (kopiert fra kapittel 1, 1.4):
- Fysisk flyt: materialflyt.
- Dataflyt: flyt av rådata mellom personer og systemer.
- Dokumentflyt: for eksempel at en faktura sendes.
- Informasjonsflyt: kunnskap for beslutninger.

### 5.2 Forretningssystemenes rolle i produksjonsprosessen

Forretningssystemets rolle i produksjonsprosessen er at ERP-systemet fungerer som den digitale hjernen i en produksjonsbedrift. Systemets viktigste rolle er å binde sammen alle avdelingene, automatisere prosesser og gi full oversikt over ressursene fra råvare til ferdig produkt. Systemet sørger for at bedriften har kontroll på hva som skal produseres, når det skal gjøres, og hvilke ressurser som kreves. For lite råvarer stopper produksjonen, mens for mye råvarer binder opp kapital. ERP-systemet finner balansen.

## Gjennomgangsspørsmål

Fra innliming 1. Spørsmålene dekker hele kapittelet og stilles i kapittelgjennomgangen (FR-28), ikke per delkapittel.

1. Forklar forskjellen mellom strategiene produksjon på bestilling og produksjon på lager.
2. Forklar de viktigste trinnene i en grunnleggende produksjonsprosess.
3. Beskriv kort de viktigste dokumentene i produksjonsprosessen med tanke på deres rolle i prosessen.

## Rettelser

- Alle skrivefeil er rettet 11.10.2026 (brukerens beskjed: rett alltid feilskrevne ord). Blant annet «påbestilling» → «på bestilling», «produser på lager» → «produksjon på lager», «flerekomponentmaterialer av denne grunnen» → «flere komponentmaterialer. Av denne grunn», «en forpliktelse ogsåå produksjon og autorisere lagere» → «en forpliktelse til produksjon og autoriserer lageret» og «ruten» → «rutingen».
- Stamdata er det samme som masterdata i kapittel 2. Ordet «stamdata» er beholdt slik det sto.
- Oppsummeringen (godkjent av brukeren 11.10.2026): Strateginavnene er satt inn, og «I begge tilfeller presenteres dette produksjonsstrategien er i bruk» → «I begge tilfeller representeres behovet av en planlagt ordre». «Sendes … til produksjonsordren» → «sendes … til verkstedet».
- Lagt til etter de fem kjernefasene (godkjent av brukeren 11.10.2026): en setning om at gjennomgangsspørsmål 2 besvares med bokas trinn.
- 5.1 (brukerens beskjed 11.10.2026): «enten montering eller produksjon. I motsetning til dette innebærer produksjon …» → «enten montering eller tilvirkning. I motsetning til tilvirkning innebærer montering …».
- 5.1 (brukerens beskjed 11.10.2026): Setningen om de fire flytene er kopiert fra kapittel 4. Den står i begge kapitlene.
- 5.1 (brukerens beskjed 11.10.2026): «i form av diskret produksjon» er fullført: «diskret produksjon, der produktene kan telles stykk for stykk, i motsetning til prosessproduksjon, der produktene lages i mengder».
- 5.1 (brukerens beskjed 11.10.2026): Forklaringene av de fire flytene er kopiert fra kapittel 1 (1.4).

## Råtekst

Gjengitt uendret, med skrivefeil, slik den ble limt inn. Før tekst herfra vises til demobesøkende, må skrivefeilene rettes.

### Innliming 1 (11.10.2026)

```text
Kapittel 5: Produksjonsprosessen 
Etter kapittelelt er fullført skal du kunne beskrive trinnene i produsjonsprosessen. Forklare rollen til ulike funksjonsområdet i effektiv og virkningsfullfullføring av prosessen. Identifisere de viktigste data, dokument- og infomrasjonssstrømmende knyttet til produksjonsprosessen. Forklare rollen til bedriftssystemer i å støtte prosessen. Produksjonsprosessen ogsåkjent som plan-to-produce-prosessen. Produksjonsprosessen inkluderer alle trinnene som er nødvending for å lage ferdige varer fra komponenter. Denne prosessen er mer kompleks enn anskaffelses- og oppfyllesprosessen. Det finnes mange forskjelllige typer produksjonsprosesser og de kan klassifiseres på ulike måter. Produksjon kan for eksempel involvere endten montering eller produksjon. I motsetning til dette innebærer produksjon å ta en rekke komponentmaterialer, for eksempel et produkt, råvare og sette dem sammen for å produsere. En annen måte å klassifisere produksjon på er i form av diskret produksjon. Noen bedrifter produserer varer kun som svar på direkte kundeordre, mens andre laget et lager av produkter som de kan lagre og deretter bruke senere fir å møte kundenes behov. Den føstnevnte strategien kalles produksjon på bestilling" og den siste kalles "produser på lager". I anskaffelses og leveringsprosessen var materialene som ble anskaffet og solgt handelsvarer, det vil si materialer som ganske enkelt kjøpes og derretter videreselges. Derfor fokuserer stamdataen i sstor grad p kunder, leverandører og materialer. I motsetning til dette involverer produksjonsprosessen en annen type materiale, nemlig et sammensatt materiale eller produkt. MEd andre ord produseres materiale ved å sette sammen flerekomponentmaterialer av denne grunnen innvolverer produksjonsprosessen tre ekstra typer stamdata: materialliste, arbeidssenter og produktruting. 

En materialliste (BOM) identifiserer alle materialene eller delene som trengs for å lage en enhet av et ferdig produkt. Den er basert på produktets design. Selve oppgaven med å lage produktet skjer i arbeidssenter. En eller flere oppgaver eller operasjoner kan fullføres i et arbeidssenter. Produktruting definerer trinnene eller opperasjonene som er nødvendige for  lage produtket. For hver opperasjon viser ruten arbeidssenteret der operasjoenne skal utføres, tiden som er avsatt for hver opersjon og materialet som skal brukes i hver opperasjon. Produksjonsprosessen starter med en produskjonsforespørsel i form av en planlagt ordre. Den planlagte ordren brukes til å be om at selskpet produserer en spesifisert mengde varer. DEt ligner på en innkjøpsrekvisisjon som diskutert i kap. 3. Forskjellen er at en innkjøpsrekvisisjon brukes for materialer kjøpt fra leverandør, mens en planlagt ordre brukes materialer produsert i selskapet. En produksjonsordre gir skriftlig autorisasjon til verkstedet til å produsere den angitte mengden produkter. Flere planlagte ordre kan slåås sammen til en produksjonsordre, ellr en planlagt ordre kan deles inn i mange produksjonsordre, avhenging av forespurt mengde og tilgjengelig produksjonskapasitet i de ulike anleggene. 

Oppsummering: Produksjonsprosess er i virkeligheten kompleks og kan involvere mange flere trinn en nevnt over. Hensikten er imidlertidig å fokusere på det grunnleggende. En produksjonsprosess bgeynner med et behov for materialer. Behovet skyldes en spesifikk kundeordre, når en produskjonsstrategi er i bruk, eller på grunn av et behov for å øke behovet i form av lagerbeholdning av materiler på lager, når en startegi brukes. I begge tilfeller presenteres dette produksjonsstrategien er i bruk. En planlagt ordre må godkjennes av produksjonslederen, og når den er godkjent, resulterer den i en produksjonsordre. En produksjonsordre er en forpliktelse ogsåå produksjon og autorisere lagere til å frigi materialer til å produsere de nødvendige produktene. Den autoriserer verkstedet for å starte produksjonene. MAterialene sendes derretter ut fra laeret til produksjonsordren, hvor produksjonen kan starte, når produksjonen er fullført flyttes den produserte varen til lageret. 

spørsmål: 
1. Forklar forskjellen mellom produksjon påbestilling og produksjon på lager-strategi?
2. Forklar de viktigste trinnene i en grunnleggende produksjonsprsess. 
3. Beskriv kort de viktigste dokumentene i produksjonsprosessen med tanke på ders rolle i prosesen.
```

### Innliming 2 (11.10.2026)

```text
De viktigste trinnene i en klassisk produksjonsprosess trekker eg ra ide til ferdig levert produkt, og kan deles inn i fem kjernefaser. Planleggging, nnkjøp, selve produksjonene, kvalitetskontroll og distrubusjon.
```

### Innliming 3 (11.10.2026)

```text
Forretningssystemets rolle i produksjonsprosesse er at ERP systemet fungere som den digitale hjernernen i en produksjonsbedrift. systemets viktigste rolle er å binde sammen alle avdelingene, automatisere prosesser og gi full oversikt over ressursene fra råvare til ferdi produkt. Systemet sørger fora t bedriften har kontroll på hva som skal produseres, når det skal gjøres og hvilke ressurser som kreves. For lite råvarer stopper produksjonen, mens for mye råvarer binder opp kapital. ERP-systemet finner balansen.
```
