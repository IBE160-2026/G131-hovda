---
title: 'Adversarial gjennomgang av arkitektur-spinen'
target: '../ARCHITECTURE-SPINE.md (updated 2026-10-25)'
sources: ['../../../prds/prd-G131-hovda-2026-09-27/prd.md', '../../../prds/prd-G131-hovda-2026-09-27/addendum.md', '../.memlog.md', '../../../../notater/IBE430/kapittel-1..5.md']
lens: 'To enheter ett nivå ned som følger alle AD-er bokstavelig, men likevel bygges inkompatibelt'
date: '2026-10-25'
---

# Adversarial gjennomgang: Studievenn-spinen

## Konklusjon

**Ikke klar som byggegrunnlag ennå. Paradigmet holder, men eierskapsreglene mangler.** AD-1 til AD-12 sier godt *hvor* kode skal ligge (lag, porter, KI-modul, EU). De sier nesten ingenting om *hvem som eier og skriver* de få entitetene som alle funksjonene deler: delkapittelstrukturen, spørsmålsbanken, «gjennomført», studieplanen og økta. Det er nettopp der to Claude Code-økter som bygger hver sin story, vil gjette ulikt. Begge gjetningene følger da spinen.

Situasjonen gjør dette mer presserende. Memloggen sier at det ikke finnes appkode ennå, og del 1 og 2 leveres samlet 1.11.2026, altså om én uke. Det betyr at import, quiz, plan, dagens forslag, demo og kapittelgjennomgang bygges nesten samtidig, i separate økter. De ti hullene under er sortert etter hvor sannsynlig det er at de biter i løpet av de neste tre ukene. Hvert hull har et forslag til ny eller strammere AD-regel.

| # | Hull | Alvorlighet | Biter i |
|---|---|---|---|
| H1 | To skrivere av kapittelstrukturen: FR-4/FR-5 i appen og importkommandoen | Kritisk | Første import |
| H2 | Spørsmålsbanken har to skrivere (import og appen), og KI-kall i appen er ikke avklart | Kritisk | FR-16, FR-13 påfylling |
| H3 | «Gjennomført» og quizresultatet har ingen eier og ingen tidsstempel | Kritisk | FR-15, FR-20, FR-9 |
| H4 | Plansnapshot (G₀, R₀, D) med planstart tilbake i tid, og dagens forslag som flytter seg i løpet av kvelden | Høy | Del 2 (1.11) |
| H5 | Demoens tilstand per besøk ligger i nettleseren, mens brukstilfellene kjører på serveren | Høy | Første demo-story |
| H6 | Tilbaketrekking mens en quiz er i gang, og hva «besvart» betyr | Høy | Ny import midt i en quiz |
| H7 | Frie svar (forklaring og gjennomgang) mangler som entitet, og ingen eier øktas slutt | Middels–høy | FR-19, FR-28, FR-21 |
| H8 | Importen kjører mot `prod`, mens AD-12 sier at lokal kjøring aldri går mot `prod`. Eier-ID er heller ikke avklart | Middels | Første import |
| H9 | Gjennomgangsspørsmål har to kilder (notatfilen og FR-27 i appen) og ingen identitet | Middels | Del 2 |
| H10 | En feilet ny generering gjør et klart delkapittel uklart, og endringsdeteksjonen er udefinert | Middels | Andre import |

Utenfor topp ti, men verdt én linje: identiteten til spørsmål brukeren har skrevet selv når fasiten endres i notatfilen (H2 dekker det delvis). Teoretiske hull, som flere brukere samtidig, sletting av konto i FR-2 og push, er bevisst utelatt.

---

## H1: To skrivere av kapittelstrukturen [Kritisk]

**Enhet A (story «FR-4/FR-5: lim inn kapittelliste»):** Brukeren oppretter IBE430 i appen og limer inn den engelske listen. Domenet tolker den (AD-2), og Haiku oversetter titlene (AD-7, FR-5). Det lagres 21 delkapitler med `title_en` og `title_no`, og brukeren retter «Salgsprosessen». Alt dette følger AD-5.

**Enhet B (story «importkommando»):** `import.ts` leser `notater/IBE430/kapittel-2.md` og finner `### 2.1 Forretningssystemer` til `### 2.5 SAP-programvaren`. AD-5 sier: «Import oppdaterer på denne nøkkelen. Nytt nummer betyr ny enhet.» Importen gjør derfor en upsert av kapittel og delkapitler, med tittelen fra overskriften og frontmatter-tittelen som kapitteltittel.

**Kollisjonen:**
- Hver import overskriver titler brukeren har rettet i appen, og AD-5 tillater det, fordi titler er attributter som «kan endres».
- Er strukturen ikke limt inn ennå, lager importen kapitler uten `title_en` og uten FR-4-flyten. Addendumet sier at strukturen «skal legges inn via appen på vanlig måte og ikke hardkodes».
- En skrivefeil i et overskriftsnummer i notatfilen («### 2.6» i stedet for «### 2.5») lager et nytt, 22. delkapittel. R₀ og målet om 90 % (19 av 21) blir feil uten at noen merker det.
- `*Ingen notater ennå.*` (2.3 og 2.5 i kapittel-2.md) står som notattekst. Bygger enhet B naivt, får delkapittelet et notat. Da (a) bruker KI-en penger på et sammendrag av plassholderen, og (b) FR-9 regner delkapittelet som «har notater» og gir falskt etterslep.

**Foreslått regel (ny AD-13: Strukturen eies av appen, og importen fester bare innhold):**
> Kapitler og delkapitler opprettes, får nytt navn og slettes bare gjennom brukstilfellet for kapittelstruktur (FR-4/FR-5). Importkommandoen oppretter aldri kapitler eller delkapitler og skriver aldri titler. Finner den et delkapittelnummer som ikke finnes, stopper den med en feil som nevner nummeret, før noe er skrevet. Om et delkapittel «har notater», avgjøres av én domenefunksjon, `hasNotes(noteText)`. Den regner tom tekst, bare mellomrom og plassholderen `*Ingen notater ennå.*` som ingen notater. Både importen, FR-8-statusen («mangler notater») og planformelen (FR-9) bruker denne funksjonen.

(Velger du heller at importen skal eie strukturen, må FR-4 og FR-5 i appen skrives om til bare å lese. Det viktige er at bare én av dem skriver.)

---

## H2: Spørsmålsbanken har to skrivere, og KI-kall i appen er uavklart [Kritisk]

**Enhet A (importkommandoen, AD-4):** Lager 20 spørsmål per delkapittel med Sonnet, gir hvert spørsmål et tema som fritekst, og antar at den er eneste skriver av `quiz_question`.

**Enhet B (story «FR-16 feilrapport» og «FR-13 påfylling»):** FR-16 sier at spørsmålet «erstattes med et nytt om samme tema». FR-13 sier at banken fylles på når færre enn 10 er ubesvart. Ingen AD forbyr KI-kall fra en Next.js-rute (AD-7 krever bare at kallet går gjennom KI-modulen), og AD-4 sier bare at «det finnes ingen bakgrunnsjobb». Enhet B kaller derfor `AiProvider.generateQuestions` synkront i en serverhandling på Vercel.

**Kollisjonen:**
- Det finnes to genereringsløp med ulik kontekst. Importen har hele notatfilen, med læringsmål og nøkkelbegreper (AD-7). Appen har bare det som ligger i databasen, og læringsmål og nøkkelbegreper på kapittelnivå har ingen entitet i ER-diagrammet. Spørsmål laget fra appen blir derfor laget med mindre kontekst.
- **Temaene glir fra hverandre.** Importen skriver «Forretningsprosess», påfyllingen skriver «forretningsprosesser». FR-14 («nytt spørsmål om samme tema») og invarianten i FR-26 (minst 2 per tema) svikter uten at noen merker det. ER-diagrammet har `THEME` som entitet, men ingen AD sier hvem som oppretter temaer.
- Neste import ser at notatet er uendret og gjør ingenting. Eller den ser at banken ikke har 20 KI-spørsmål fra importen og lager 20 nye. Begge tolkningene følger AD-4 («endrer bare det som er endret»).
- FR-12 (feilrapport på sammendrag, «lages på nytt») og FR-5 (oversetting) har samme uavklarte spørsmål om hvor KI-kallet kjører.

**Foreslått regel (stram AD-4 og ny AD-14):**
> **AD-4 (strammere):** KI-kall kjører i appen (på serveren, gjennom KI-modulen) bare for FR-5, FR-19 og FR-21, og senere FR-17 og FR-18. Alt innhold per delkapittel (sammendrag, spørsmålsbank, påfylling og erstatning) lages bare av ett brukstilfelle i applikasjonslaget, `generateSubchapterContent(subchapterId, mode)`, der `mode` er `full`, `refill` eller `replace(theme)`. Importkommandoen kaller det. En feilrapport (FR-12, FR-16) trekker innholdet tilbake med en gang og merker delkapittelet `trenger_påfylling`. Den nye genereringen kjøres ved neste import (`import --pending`). Til da velger quizen et annet spørsmål om samme tema fra banken.
>
> **AD-14 (temaer):** Temaer er en entitet per delkapittel og opprettes bare i et `full`-løp. `refill` og `replace` får listen over eksisterende temaer i prompten, og skjemaet (AD-7) godtar bare de temaene. Et spørsmål uten gyldig tema-ID får status `feilet`.

Hvis FR-16 skal erstatte spørsmålet umiddelbart i appen, må det stå eksplisitt, og da må konteksten til kapittelet (læringsmål og nøkkelbegreper) lagres i databasen ved import, slik at begge løpene får samme input.

---

## H3: «Gjennomført» og quizresultatet har ingen eier [Kritisk]

**Enhet A (story «FR-14/FR-15 ta quiz»):** Ved siste svar regner domenet ut `score ≥ 0.8` og setter `subchapter.completed = true`. Kolonnen er boolsk og har ikke tidsstempel.

**Enhet B (story «FR-20 framdriftsindikator» og «FR-9 plan»):** Regner gjennomført ut på nytt fra `quiz_answer`: «finnes en økt med minst 8 av 10 riktige». FR-16 sier at et spørsmål som er rapportert feil, ikke teller (8 av 9). B tar derfor bort tilbaketrukne spørsmål når den regner.

**Kollisjonen:**
- A og B kan gi ulikt antall gjennomførte delkapitler. Brukeren rapporterer et spørsmål fra en *tidligere* quiz. B regner da 7 av 9 = 78 % som ikke gjennomført, mens A sier gjennomført. Indikatoren og etterslepet er uenige med kapittellisten.
- A mister *når* delkapittelet ble gjennomført. FR-9 trenger det for G₀ på planstart (H4), og FR-28 trenger det for å si «kapittelgjennomgangen er klar».
- Hva skjer med «gjennomført» når notatene endres, eller når en senere quiz gir 50 %? PRD-en sier ingenting, og hver økt velger sin egen tolkning.
- Repetisjonsspørsmålene i FR-10 (del 3) skal ikke telle i quizresultatet, men ingen AD sier hvor dette flagget ligger.

**Foreslått regel (ny AD-15: Gjennomført er en hendelse som skrives én gang):**
> Bare brukstilfellet `finishQuiz` skriver til `subchapter_completion (owner, subchapterId, completedAt UTC, quizSessionId)`, og bare én gang per delkapittel. Den regnes ut av domenefunksjonen `quizResult(answers)`, som tar bort spørsmål som var tilbaketrukket *da quizen ble avsluttet* og spørsmål merket som repetisjon. Gjennomført kan ikke gå tilbake: senere quizer, feilrapporter, nye notater og ny import endrer det aldri. Quizøkta lagrer resultatet (`correct`, `counted`) når den avsluttes, og det regnes ikke ut på nytt. Alle som leser (indikator, plan, kapittelgjennomgang, demo), bruker `subchapter_completion` og regner aldri ut «gjennomført» fra svar selv.

---

## H4: Plansnapshot og dagens forslag som flytter seg [Høy]

**Enhet A (story «FR-3 eksamensdato og planstart»):** Lagrer `study_plan { examDate, planStart: 2026-10-01 }` og regner ut G₀ og R₀ *nå*, 1.11, fra dagens antall gjennomførte (for eksempel G₀ = 6).

**Enhet B (story «FR-9/FR-10 startsiden»):** Leser `study_plan` og regner G₀ på nytt hver gang fra antall gjennomførte *før* planstart (G₀ = 0, fordi ingenting var gjennomført 1.10).

**Kollisjonen:**
- Med planstart tilbake i tid (et krav for IBE430: 1.10) blir etterslepet helt forskjellig: «i rute» i A og «6 bak» i B. Begge følger AD-2 og AD-11.
- R₀ og D: Hva skjer når kapittel 6 importeres, eller et delkapittel legges til i FR-4 etter planstart? Endres R₀, eller ikke?
- **Dagens forslag flytter seg i løpet av kvelden.** B regner forslaget ut på hver forespørsel. Når 3.2 blir gjennomført kl. 22:10, viser startsiden plutselig «I kveld: 3.3», og etterslepet går ned slik at antallet krymper. Avbrutt økt (FR-10) og «Økta startes med ett trykk» peker da på ulike ting. Gjennomgangsspørsmålene i FR-10 (10, 5 eller 0, avhengig av antall delkapitler) hopper også.

**Foreslått regel (ny AD-16):**
> `study_plan` lagrer `planStart`, `examDate`, `G0`, `R0` og `D`. De regnes ut *én gang* av domenefunksjonen `startPlan(completions, subchapters, planStart, examDate)`, med G₀ = antall `completedAt` før `planStart` (Oslo-dato), og bare når eksamensdatoen eller planstart lagres. Ingen andre skriver eller regner ut disse feltene. Delkapitler som legges til etter planstart, endrer ikke R₀. Dagens forslag er en ren funksjon av tilstanden **ved starten av Oslo-dagen** (gjennomførte før i dag og innhold som var klart), pluss en markering av hvilke forslag som er gjort i dag. Det endrer seg ikke før midnatt. Demoen gir samme funksjon en fast `Clock` og faste planinndata.

---

## H5: Demotilstanden ligger i nettleseren, men brukstilfellene kjører på serveren [Høy]

**Enhet A (story «quiz», ekte app):** `takeQuiz` kjører som en Next.js-serverhandling. Den henter `DataSource` fra komposisjonsroten på serveren og skriver svar til Supabase.

**Enhet B (story «demo», AD-3):** Demo-adapteren leser `demo-data/*.json` og holder «tilstand per besøk». Addendumet sier: «for eksempel i nettleserens sessionStorage».

**Kollisjonen:** En serverhandling kan ikke lese sessionStorage, og en Vercel-funksjon kan ikke holde tilstand per besøk i minnet. Enhet B ender derfor med (a) en egen quizflyt på klientsiden (en fork, akkurat det AD-3 skal hindre), eller (b) at domenet og applikasjonslaget importeres i en klientkomponent med `DataSource` i minnet, mens enhet A har lagt inn serverpakker i applikasjonslaget. Begge følger AD-1 og AD-3. I tillegg skriver `export-demo.ts` filer i et format den bestemmer selv, mens demo-adapteren leser et format den bestemmer selv. Ingen kontrakt binder dem sammen.

**Foreslått regel (stram AD-3):**
> `src/domain` og `src/application` er isomorfe: de importerer ingen pakker som bare virker på serveren og bruker ikke `process.env`, slik at de kan kjøres i nettleseren. Demoen kjører brukstilfellene i nettleseren med `DemoDataSource`, som er (frosne filer + skrivelag i minnet, speilet til sessionStorage) og en fast `DemoClock`. Den ekte appen kjører de samme brukstilfellene på serveren med `SupabaseDataSource`. Skjermene kaller brukstilfellene gjennom ett grensesnitt som skjuler hvilken variant som kjører. Formatet på demofilene er et skjema i `src/application` (for eksempel zod). Både `export-demo.ts` og `DemoDataSource` validerer mot det, og testen i NFR-8 (minst 20 per delkapittel, minst 2 per tema) kjøres mot skjemaet. Demofilene inneholder ingen eier-ID eller e-post.

---

## H6: Tilbaketrekking midt i en quiz, og hva «besvart» betyr [Høy]

**Enhet A (story «quiz», FR-10):** En quiz som er i gang, lagres med 10 utvalgte spørsmål-ID-er. Brukeren har svart på 4 og legger seg.

**Enhet B (importen, AD-6):** Notatet til 3.2 er endret. AD-6: «bare *ubesvarte, KI-genererte* spørsmål erstattes.» Seks av spørsmålene i quizen som er i gang, er ubesvart. De trekkes tilbake og erstattes.

**Kollisjonen:** Neste kveld fortsetter quizen (FR-10) med seks tilbaketrukne spørsmål. Enhet A viser dem kanskje (status ignoreres), eller hopper over dem slik at quizen får 4 spørsmål. Begge deler bryter FR-14 («alltid 10»). FR-16 med 8 av 9 blandes inn i det samme. «Besvart» kan bety *noen gang besvart av eieren*, *besvart i en avsluttet quiz* eller *valgt ut til en quiz*. AD-6 velger ingen av dem.

**Foreslått regel (stram AD-6):**
> Et spørsmål regnes som «brukt» når det er valgt ut til en quizøkt, uansett om det er besvart. Brukte spørsmål trekkes aldri tilbake automatisk. En quiz som er i gang, fullføres alltid med spørsmålene den ble startet med, også om noen av dem er tilbaketrukket senere. Bare en feilrapport (FR-16) fjerner et spørsmål fra en quiz som er i gang, og da regnes resultatet av det som er igjen. Quizutvalget (domenet) velger bare spørsmål med status `aktiv`. Svar fra demoen teller aldri som «brukt».

---

## H7: Frie svar mangler som entitet, og ingen eier øktas slutt [Middels–høy]

**Enhet A (story «FR-27/28 kapittelgjennomgang», del 2):** Lagrer svaret som et felt på `feedback`-raden og regner gjennomgangen som fullført når hvert `review_question` har en `feedback`.

**Enhet B (story «FR-17/18 forklaringsspørsmål», del 3):** Lager tabellen `explanation_answer` med `feedback_id`. FR-19 krever at «svaret lagres før tilbakemeldingen lages» og at det kan prøves igjen når KI feiler.

**Kollisjonen:**
- Med A går svaret tapt når KI feiler, og gjennomgangen blir aldri fullført hvis tilbakemeldingen har feilet. B har en egen modell. FR-21 (vurderingen) må da lese to ulike former, og telle «29 gjennomgangsspørsmål» på to måter.
- **Øktas slutt:** FR-21 lager vurderingen «etter hver økt», og FR-17 skal komme «aldri i to økter på rad, minst hver tredje». `SESSION` finnes i ER-diagrammet, men bare koblet til quizsvar. Quizstoryen utløser vurderingen når quizen er ferdig, og forklaringsstoryen utløser den når spørsmålet er besvart. Resultatet blir to vurderinger per kveld, eller ingen. Økter med bare kapittelgjennomgang eller trening (FR-18) har ingen `SESSION`.

**Foreslått regel (ny AD-17):**
> Alle frie svar lagres i én entitet, `written_answer (owner, kind: explanation|review, questionId, sessionId, text, createdAt)`, *før* KI-kallet. `feedback` hører til et svar (0..1 per forsøk) og har status `lages|klart|feilet`. «Besvart» i FR-28 betyr at det finnes et `written_answer`, uansett om tilbakemeldingen lyktes. `session` er en egen enhet med `startSession` og `endSession` i applikasjonslaget. Den dekker quiz, forklaring, gjennomgang og trening. `endSession` er det eneste stedet som utløser vurderingen (FR-21) og oppdaterer telleren for FR-17.

ER-diagrammet bør da få `WRITTEN_ANSWER` mellom spørsmålene og `FEEDBACK`, og `SESSION` koblet til alle svartyper.

---

## H8: Importen mot `prod` og eier-ID-en [Middels]

**Enhet A (oppsett og konvensjoner):** AD-12: «Lokal utvikling kjører mot `dev`, aldri mot `prod`.» `.env.local` får nøklene til `dev`.

**Enhet B (importkommandoen):** Kjøres på PC-en (Structural Seed: `IMP --> SPROD`) og leser `.env.local`, altså `dev`.

**Kollisjonen:** Notatene havner i `dev`, og eieren ser ingenting i appen som er i drift. Eller noen legger `prod`-nøkkelen i `.env.local` for å få importen til å virke, og da kjører dev-serveren og testene mot ekte data. Begge deler bryter AD-12 på hver sin måte. I tillegg går importen forbi RLS (`service_role`) og må selv sette `owner`. Hvis eier-ID-en hardkodes eller hentes fra feil prosjekt, blir radene usynlige (RLS filtrerer dem bort) uten noen feilmelding.

**Foreslått regel (stram AD-10 og AD-12):**
> Import og eksport krever `--target dev|prod`, leser `.env.dev` eller `.env.prod` (begge i `.gitignore`), og ber om bekreftelse ved `prod`. Dev-serveren leser bare `.env.local`, som peker på `dev`. Eieren finnes ved oppslag på e-post i Auth (miljøvariabelen `OWNER_EMAIL`) i målprosjektet. Finnes ikke eieren, eller ikke emnet (H1), stopper kommandoen før noe skrives. `export-demo` leser alltid fra `prod`.

---

## H9: Gjennomgangsspørsmål har to kilder og ingen identitet [Middels]

**Enhet A (importen):** Tolker `## Gjennomgangsspørsmål` i notatfilen (AD-2) og skriver `review_question` med nummeret som rekkefølge.

**Enhet B (story «FR-27 lim inn i appen»):** Har eget skjema for innliming, med rett, legg til og slett, og erstatter KI-genererte spørsmål.

**Kollisjonen:** `kapittel-1.md` har ingen seksjon for gjennomgangsspørsmål. De 29 spørsmålene finnes bare i PRD-addendumet, så kapittel 1 må limes inn i appen. Neste import av kapittel-1.md ser at seksjonen mangler. Tolker den det som «ingen spørsmål», trekker den tilbake eller sletter de 29. Lar den være, er det uklart hvilken kilde som gjelder når filen senere får en seksjon. AD-6 gjelder quizspørsmål, men sier ikke uttrykkelig at gjennomgangsspørsmål med svar aldri slettes. Spørsmål som byttes om, endrer «rekkefølgen de ble limt inn» (FR-28) og ødelegger «neste ubesvarte».

**Foreslått regel (utvid AD-6 og legg til kilde):**
> Gjennomgangsspørsmål følger AD-6: de trekkes tilbake og slettes aldri, og har stabil ID. Hvert kapittel har én kilde, `source: notes_file | app | ai`. Importen eier bare kapitler med `source = notes_file`. Mangler seksjonen, lar importen spørsmålene være i fred. I appen er FR-27 skrivebeskyttet for kapitler med kilden `notes_file`. Spørsmålene gjenkjennes på normalisert tekst. Endret tekst gir et nytt spørsmål, og det gamle trekkes tilbake.

(Merk: Notatmappen eies av et annet vindu. Om de 29 spørsmålene skal inn i `kapittel-1.md`, avgjøres der.)

---

## H10: En feilet ny generering gjør et klart delkapittel uklart, og endringsdeteksjonen er udefinert [Middels]

**Enhet A (importen):** Notatet til 1.4 er utvidet. Ny generering feiler (skjemavalidering, AD-7), og delkapittelet får status `feilet` (AD-8).

**Enhet B (dagens forslag og kapittellisten):** AD-8: «velger aldri et delkapittel som ikke er klart». 1.4 forsvinner fra forslaget og kan ikke åpnes, selv om det forrige sammendraget og banken fortsatt er gyldige.

**I tillegg:** AD-4 sier at importen er «idempotent: den endrer bare det som er endret», men ikke *hva* som sammenlignes. Hasher én økt hele filen, regenereres alle delkapitlene når én rettelse legges inn, og alle ubesvarte spørsmål byttes ut, noe som koster penger. Hasher en annen økt bare `### n.m`-blokken, gir en endring i læringsmålene for kapittelet (som er KI-kontekst etter AD-7) aldri noen ny generering. Teksten «Fra spørsmålsbanken (spørsmål 5–8): …» i notatblokkene gjør dette vanskeligere.

**Foreslått regel (stram AD-8 og AD-4):**
> Sammendrag og spørsmålsbank har versjoner. Delkapittelet viser den siste versjonen som er `klart`. En feilet ny generering registreres på den nye versjonen (`feilet`, slik at den kan prøves på nytt) og tar aldri bort en versjon som er klar. `klart` betyr at det finnes en klar versjon av begge. Endringer oppdages med `inputHash = hash(normalisert delkapittelnotat + læringsmål og nøkkelbegreper for kapittelet + promptversjon)` per artefakt. Seksjonene Råtekst og Rettelser er aldri med i hashen eller i KI-input. `--force <n.m>` tvinger fram en ny generering.

---

## Hvordan dette bør tas inn i spinen

1. **Før første story:** AD-13 (H1), AD-15 (H3) og strammere AD-4 og AD-14 (H2). De tre avgjør skjemaet for `subchapter`, `quiz_question`, `theme` og `subchapter_completion`, som alle de andre storyene bygger på.
2. **Før demo-storyen:** isomorft applikasjonslag og skjema for demofilene (H5).
3. **Før del 2-storyene:** AD-16 (H4), AD-17 (H7) og kilderegelen for gjennomgangsspørsmål (H9).
4. **Små tillegg i AD-12 og AD-10 med en gang:** `--target`, oppslag på eier og fiks av Structural Seed (H8).
5. ER-diagrammet: legg til `SUBCHAPTER_COMPLETION`, `WRITTEN_ANSWER` og kontekst for kapittelet (læringsmål og nøkkelbegreper), og koble `SESSION` til alle svartyper.
6. «Når to stories er uenige»: Legg til en linje i Consistency Conventions: *Hver entitet har én skrivende eier (et brukstilfelle). Andre leser den bare gjennom `DataSource` og regner ikke ut avledet tilstand selv.* Ta med en tabell over hvem som eier hva: struktur → FR-4, notat/innhold → import, gjennomført → `finishQuiz`, plan → `startPlan`, vurdering → `endSession`.
