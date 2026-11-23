---
emne: IBE430
kapittel: 2
instruksjon: innhold.v2
modell: claude-code/claude-opus-5-5
---

## Sammendrag

### 2.1 Forretningssystemer
<!-- inputHash: 6166a1e044a23c3668067a75218d81b178b0b5ee3e43f412e6b66811dcb47d1e -->
Bedriftssystemer (ES) har én hovedrolle: å **administrere og utføre forretningsprosesser**. I dagens konkurransepregede globale miljø er det vanskelig å se for seg hvordan selskaper skulle fungert uten dem. Et ES består av **maskinvare, programvare og en database**.

**Utviklingen.** Systemene har gått fra frittstående systemer på store, dyre datamaskiner, til pakkede applikasjoner og distribuerte systemer på billigere, mindre maskiner. Notatet beskriver tre steg:

- dyre **stormaskiner** i de tidlige dagene
- et paradigmeskifte til kostnadseffektive og skalerbare **trelags klient-server-applikasjoner**
- dagens systemer basert på **tjenesteorientert arkitektur (SOA)**

**Globalisering og BPR.** Paradigmeskiftet i dataarkitektur skjedde samtidig med globalisering og **reengineering av forretningsprosesser (BPR)**. På 1980-tallet begynte bedrifter å utvide globalt og å se organisasjoner fra et prosessperspektiv i stedet for et funksjonelt perspektiv. BPR kom på 1990-tallet som en måte å omorientere driften rundt forretningsprosesser, så den globale, distribuerte organisasjonen ble lettere å administrere og kontrollere.

**ERP-systemer** (Enterprise Resource Planning) er verdens største og mest komplekse ES. I IBE430 er et ERP-system et IT-system som støtter og automatiserer forretningsprosesser ved å integrere aktiviteter og dele data i hele organisasjonen. ERP-systemer:

- fokuserer først og fremst på den **interne driften** og integrerer funksjonelle og tverrfunksjonelle prosesser
- dekker typisk drift (produksjon), personaladministrasjon, økonomi og regnskap, salg og distribusjon og innkjøp

Programvaren i alle ERP-systemer består av tre typer moduler: **brukergrensesnitt (klient)**, **applikasjonslogikk (applikasjon)** og **datahåndtering**. Den kan kjøre på stormaskin, i en klient-server-arkitektur eller i en SOA.

Etter hvert som flere bedrifter kjøpte ERP-systemer, ble neste steg å koble dem sammen, så de kunne støtte prosesser mellom og blant bedrifter. ERP er **hjertet og sjelen** i de fleste bedrifters ES-landskap, og utvides med **CRM, SCM, SRM og PLM** for å samarbeide med leverandører og kunder. **PLM-systemer** hjelper selskaper med å ta nye produktideer fra det virtuelle tegnebrettet helt til produksjonsanlegget.

**Applikasjonspakker og andre løsninger.** Samlingen av disse systemene kalles en **applikasjonspakke**. Suiteleverandører som SAP og Oracle tilbyr omfattende samlinger som dekker de fleste standard forretningsprosessene i et selskap. De fleste bedrifter bruker i dag både programpakker og nisjeapplikasjoner:

- **Programpakker** har de fleste prosessene som trengs for å drive et selskap, i en tett integrert pakke.
- **De beste løsningene** har ofte litt bedre funksjonalitet, men koster ekstra å integrere med andre applikasjoner og systemer.
- **Nisjeapplikasjoner** leveres av mindre **ISV-er**. De bygger oppå eller mellom programpakkene og de beste applikasjonene og håndterer svært spesifikke forretningsprosesser.

### 2.2 Datatyper i forretningssystemer
<!-- inputHash: d0ba9bf2a0e8205cef2cb6222c34f19a48b8de4dc16d39fbb02bc9e219a680ae -->
Notatet her er kort. Det finnes tre typer data i ERP-systemer:

- **organisasjonsdata**, for eksempel avdelingsnavn
- **masterdata**, for eksempel leverandørnavn
- **transaksjonsdata**, for eksempel antall varer bestilt

### 2.4 Oversikt over SAP
<!-- inputHash: 72e40995d8fd2de41ccb32b5e247444a664018ffb6307ae9f2233a3026bedff6 -->
Notatet her er kort. **SAP** er verdens største og ledende ES-leverandør. SAP var det første selskapet som skapte et **fullstendig integrert og globalt ERP-system**, og veksten og ekspansjonen deres gikk parallelt med utviklingen og adopsjonen av ES-løsninger.

## Quizspørsmål

### 2.1 Forretningssystemer
<!-- inputHash: 6166a1e044a23c3668067a75218d81b178b0b5ee3e43f412e6b66811dcb47d1e -->
Temaer:
- Bedriftssystemenes rolle
- Utviklingen av bedriftssystemer
- Globalisering og BPR
- ERP-systemer
- ERP-programvaren
- Applikasjonspakker
- Programpakker og nisjeapplikasjoner

#### Hva er bedriftssystemenes rolle ifølge notatet?
- [ ] Å erstatte de ansatte i alle funksjonelle avdelinger
- [x] Å administrere og utføre forretningsprosesser
- [ ] Å lagre regnskapet for revisoren hvert år
- [ ] Å styre maskinene i produksjonsanlegget
Forklaring: Notatet sier at bedriftssystemers rolle er å administrere og utføre forretningsprosesser.
Tema: Bedriftssystemenes rolle

#### Hvilke komponenter inngår i et bedriftssystem?
- [ ] Brukere, leverandører og kunder
- [ ] Avdelinger, prosesser og ledelse
- [ ] Nettverk, skjermer og skrivere
- [x] Maskinvare, programvare og en database
Forklaring: Notatet sier at komponentene i et ES inkluderer maskinvare, programvare og en database.
Tema: Bedriftssystemenes rolle

#### Hvordan har bedriftssystemene utviklet seg?
- [x] Fra frittstående systemer på store, dyre datamaskiner til pakkede applikasjoner og distribuerte systemer på billigere, mindre systemer
- [ ] Fra distribuerte systemer på mange små maskiner til ett felles system på en stor, dyr stormaskin
- [ ] Fra pakkede applikasjoner til frittstående systemer som hver avdeling utvikler selv på egne maskiner
- [ ] Fra papirbaserte rutiner direkte til tjenesteorienterte systemer uten noen steg imellom
Forklaring: Notatet beskriver utviklingen fra frittstående systemer på store, dyre maskiner til pakkede og distribuerte systemer på billigere, mindre maskiner.
Tema: Utviklingen av bedriftssystemer

#### Hva slags applikasjoner kom med paradigmeskiftet etter de dyre stormaskinene?
- [ ] Frittstående applikasjoner for hver enkelt avdeling
- [ ] Nisjeapplikasjoner fra mindre leverandører
- [x] Kostnadseffektive og skalerbare trelags klient-server-applikasjoner
- [ ] Regnearkbaserte applikasjoner på hver ansatts maskin
Forklaring: Notatet sier at paradigmeskiftet gikk fra dyre stormaskiner til kostnadseffektive og skalerbare trelags klient-server-applikasjoner.
Tema: Utviklingen av bedriftssystemer

#### Hva bygger dagens bedriftssystemer på ifølge notatet?
- [ ] Frittstående stormaskiner
- [x] Tjenesteorientert arkitektur (SOA)
- [ ] Ett regneark per avdeling
- [ ] Trelags klient-server alene
Forklaring: Notatet beskriver utviklingen fram til dagens SOA-baserte systemer.
Tema: Utviklingen av bedriftssystemer

#### Hvilke forretningstrender skjedde samtidig med paradigmeskiftet innen dataarkitektur?
- [ ] Automatisering og utsetting av IT-drift
- [ ] Digitalisering og overgang til netthandel
- [x] Globalisering og reengineering av forretningsprosesser (BPR)
- [ ] Sentralisering og nedbemanning av avdelinger
Forklaring: Notatet sier at paradigmeskiftet skjedde samtidig med globalisering og BPR.
Tema: Globalisering og BPR

#### Hvilket perspektiv begynte bedrifter å se organisasjoner fra på 1980-tallet?
- [ ] Et funksjonelt perspektiv snarere enn et prosessperspektiv
- [ ] Et økonomisk perspektiv snarere enn et teknisk perspektiv
- [ ] Et lokalt perspektiv snarere enn et globalt perspektiv
- [x] Et prosessperspektiv snarere enn et funksjonelt perspektiv
Forklaring: Notatet sier at bedrifter begynte å se på organisasjoner fra et prosessperspektiv snarere enn et funksjonelt perspektiv.
Tema: Globalisering og BPR

#### Hva var BPR en måte å gjøre på 1990-tallet?
- [x] Å omorientere driften rundt forretningsprosesser for bedre å styre den globale, distribuerte organisasjonen
- [ ] Å dele organisasjonen inn i flere funksjonelle avdelinger med hvert sitt system
- [ ] Å flytte all produksjon tilbake til ett land for å få bedre kontroll
- [ ] Å bytte ut alle stormaskiner med regneark i hver avdeling
Forklaring: BPR dukket opp som en måte å omorientere driften rundt forretningsprosesser for å administrere og kontrollere den globale, distribuerte organisasjonen.
Tema: Globalisering og BPR

#### Beskriv definisjonen av ERP i IBE430.
- [ ] Et ERP-system er et regnskapssystem som samler økonomidata fra hver avdeling og lager rapporter til ledelsen én gang i måneden.
- [x] Et ERP-system er et IT-system som støtter og automatiserer forretningsprosesser ved å integrere aktiviteter og dele data i hele organisasjonen.
- [ ] Et ERP-system er et IT-system som kobler bedriften til kundene og leverandørene, men som ikke brukes i den interne driften.
- [ ] Et ERP-system er en samling frittstående programmer der hver avdeling har sitt eget system med egne data.
Forklaring: Dette er definisjonen av ERP i IBE430: et IT-system som støtter og automatiserer prosesser ved å integrere aktiviteter og dele data.
Tema: ERP-systemer
Kilde: spørsmålsbank 6

#### Hva kjennetegner ERP-systemer blant bedriftssystemene?
- [ ] De er de minste og enkleste bedriftssystemene
- [ ] De er systemer som bare små bedrifter bruker
- [ ] De er nisjeapplikasjoner for svært spesifikke prosesser
- [x] De er verdens største og mest komplekse bedriftssystemer
Forklaring: Notatet sier at ERP-systemer er verdens største og mest komplekse ES.
Tema: ERP-systemer

#### Hva fokuserer ERP-systemer først og fremst på?
- [x] Den interne driften i en organisasjon
- [ ] Samarbeidet med kunder og leverandører
- [ ] Utviklingen av nye produktideer
- [ ] Markedsføringen av bedriftens produkter
Forklaring: Notatet sier at ERP-systemer primært fokuserer på den interne driften i en organisasjon.
Tema: ERP-systemer

#### Hva ble neste steg etter hvert som flere bedrifter kjøpte ERP-systemer?
- [ ] Å erstatte ERP-systemene med frittstående systemer i hver avdeling
- [x] Å koble systemene sammen så de kunne støtte prosesser mellom og blant bedrifter
- [ ] Å flytte ERP-systemene tilbake til store, dyre stormaskiner
- [ ] Å begrense ERP-systemene til bare økonomi og regnskap
Forklaring: Notatet sier at neste trinn var å koble systemene sammen så de kunne støtte prosesser mellom og blant bedrifter.
Tema: ERP-systemer

#### Hvilke tre typer moduler består programvaren i alle ERP-systemer av?
- [ ] Maskinvare, programvare og en database
- [ ] Innkjøp, produksjon og salg
- [x] Brukergrensesnitt (klient), applikasjonslogikk (applikasjon) og datahåndtering
- [ ] Organisasjonsdata, masterdata og transaksjonsdata
Forklaring: Notatet sier at programvaren i alle ERP-systemer består av brukergrensesnitt (klient), applikasjonslogikk (applikasjon) og datahåndtering.
Tema: ERP-programvaren

#### Hvilke arkitekturer kan programvaren til et ERP-system kjøre på?
- [ ] Bare på én stor, dyr stormaskin
- [ ] Bare i nettleseren på hver ansatts maskin
- [ ] Bare hos leverandøren som en nisjeapplikasjon
- [x] Stormaskin, klient-server eller tjenesteorientert arkitektur (SOA)
Forklaring: Notatet sier at programvaren kan kjøre på stormaskin, i en klient-server-arkitektur eller i en SOA.
Tema: ERP-programvaren

#### Hva hjelper PLM-systemer selskaper med?
- [x] Å ta nye produktideer fra det virtuelle tegnebrettet helt til produksjonsanlegget
- [ ] Å holde oversikt over lønn og ferie for alle ansatte i selskapet
- [ ] Å sende fakturaer til kundene når varene er levert fra lageret
- [ ] Å velge den billigste leverandøren for hver innkjøpsordre
Forklaring: Notatet sier at PLM-systemer hjelper selskaper med å ta nye produktideer fra det virtuelle tegnebrettet til produksjonsanlegget.
Tema: Applikasjonspakker

#### Hva tilbyr suiteleverandører som SAP og Oracle?
- [ ] Enkeltstående nisjeapplikasjoner for svært spesifikke prosesser
- [x] Omfattende samlinger av applikasjoner som dekker de fleste standard forretningsprosessene
- [ ] Bare maskinvare og databaser som kundene bygger egne systemer på
- [ ] Rådgivning om reengineering av prosesser, men ingen programvare
Forklaring: Notatet sier at suiteleverandører som SAP og Oracle tilbyr omfattende samlinger som dekker de fleste standard forretningsprosessene i et selskap.
Tema: Applikasjonspakker

#### Hva utvider og kompletterer ERP-prosessene for å samarbeide med leverandører og kunder?
- [ ] Drift, økonomi og innkjøp
- [ ] Klient, applikasjon og datahåndtering
- [x] CRM-, SCM-, SRM- og PLM-funksjonalitet
- [ ] Globalisering og BPR
Forklaring: Notatet sier at ERP-prosesser utvides og kompletteres av CRM-, SCM-, SRM- og PLM-funksjonalitet for å samarbeide med leverandører og kunder.
Tema: Applikasjonspakker

#### Hva er fordelen med programpakker?
- [ ] De har alltid bedre funksjonalitet enn alle andre løsninger
- [ ] De lages av mindre leverandører for svært spesifikke prosesser
- [ ] De koster ingenting å integrere med andre systemer
- [x] De har de fleste prosessene som trengs for å drive et selskap, i en tett integrert pakke
Forklaring: Notatet sier at programpakker har fordelen av å inneholde de fleste prosessene som trengs, i en tett integrert pakke.
Tema: Programpakker og nisjeapplikasjoner

#### Hva kjennetegner de beste løsningene sammenlignet med programpakker?
- [x] Litt bedre funksjonalitet, men ekstra kostnad for å integrere med andre applikasjoner og systemer
- [ ] Dårligere funksjonalitet, men ingen kostnad for å integrere med andre applikasjoner og systemer
- [ ] Samme funksjonalitet, men de kan bare brukes av de største selskapene i verden
- [ ] Alle forretningsprosessene i én pakke, men bare for den interne driften i selskapet
Forklaring: Notatet sier at de beste løsningene har litt bedre funksjonalitet, men kommer med ekstra kostnad ved å integrere.
Tema: Programpakker og nisjeapplikasjoner

#### Hvem leverer nisjeapplikasjoner?
- [ ] Suiteleverandører som SAP og Oracle
- [x] Mindre ISV-er
- [ ] Bedriftens egen økonomiavdeling
- [ ] Leverandørene av stormaskiner
Forklaring: Notatet sier at nisjeapplikasjoner leveres av mindre ISV-er som bygger oppå eller mellom programpakker og de beste applikasjonene.
Tema: Programpakker og nisjeapplikasjoner
