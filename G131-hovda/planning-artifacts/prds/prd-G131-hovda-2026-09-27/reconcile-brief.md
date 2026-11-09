---
title: "Avstemming: PRD mot product brief"
created: 2026-10-08
input: planning-artifacts/briefs/brief-G131-hovda-2026-09-27/brief.md (+ addendum.md)
mot: prd.md og addendum.md (status draft, oppdatert 08.10.2026)
---

# Avstemming: PRD mot product brief (Studievenn)

Formål: finne det briefen sier som mangler, er svekket eller motsagt i PRD-en, særlig kvalitative idéer som en FR-struktur lett mister. Avvik som `.memlog.md` registrerer som beslutning eller override, er listet for seg til slutt og regnes ikke som hull.

Samlet: PRD-en dekker briefen godt. Omfang, trinn, demo, persona, to-i-én-effekten og «ikke en spådom» er tatt med. Hullene ligger mest i posisjonering, følelsen rundt etterslep, hva demoen viser fram, og et par suksesskriterier som er svekket i oversettelsen.

## Hull

### H1. Den ærlige posisjoneringen og de tre forskjellene mangler som eget innhold (middels-høy)
- **Briefen:** «Studievenn finner ikke opp noe nytt, men tilpasser velkjente idéer til én studiehverdag.» og «Studievenn kommer ikke til å slå Google NotebookLM eller Quizlet … og prosjektet later ikke som noe annet.» Deretter tre forskjeller: «Den tar beslutningen for deg», «Den kjenner emnet», «Den er laget for kort og oppstykket tid og for trening til muntlig eksamen». Brief-addendum: ingen funnet verktøy gir vurdering per emne målt mot læringsutbyttet.
- **PRD-en:** Bare i negativ form: §2.2 (ikke-brukere) og §8 («Et generelt KI-studieverktøy som konkurrerer med NotebookLM eller Quizlet»). De tre forskjellene står ikke samlet noe sted, og den ydmyke formuleringen («finner ikke opp noe nytt») er borte. Nedstrøms (arkitektur, epics) mister dermed hva som må beskyttes når noe kuttes.
- **Forslag:** Legg til et kort avsnitt i §1 (eller ny §1.1 «Hva som skiller den ut») med de tre forskjellene og den ærlige setningen, og knytt hver forskjell til FR-ene som bærer den (FR-10/FR-9; FR-6/FR-21; FR-11 600 ord, FR-17–19).

### H2. «Dårlig samvittighet» som problem – etterslep-meldingene har ingen tone-regel (middels-høy)
- **Briefen:** «Konsekvensene er stress, dårlig samvittighet og i noen tilfeller dårlig karakter eller stryk. Det som mangler, er … en bærekraftig og målrettet måte å bruke den på.»
- **PRD-en:** §6 regulerer tonen i vurderingen («pynter ikke … men formulerer seg heller ikke nedslående»), men ikke etterslep. FR-20 sier at «bak» skal være «tydelig markert», FR-9 gir 2 delkapitler per kveld og økter på lørdag/søndag, og FR-23 [Bør] gir varsel 7 av 7 dager. Ingenting sier at dette skal oppleves som en vei tilbake og ikke som en påminnelse om å ha feilet. SM-C2 dekker bare antall varsler.
- **Forslag:** Utvid §6 med en regel for etterslep: vis hva som skal til for å komme i rute (f.eks. «2 delkapitler i kveld, så er du i rute fredag»), ikke bare et minustall, og bruk ikke skyldspråk. Vurder en motvekt SM-C5 («Press som fører til at appen ikke åpnes»).

### H3. Demoen viser ikke det som skiller appen ut (middels-høy)
- **Briefen:** Demoen skal la faglærer, sensor eller medstudenter «prøve kveldsøkta». Kveldsøkta i briefen er dagens forslag + sammendrag + quiz + forklaringsspørsmål, og forskjellene er «tar beslutningen for deg» og ærlig vurdering mot læringsutbyttet.
- **PRD-en:** FR-26 og UJ-5 låser demoen til del 1-innhold (velge selv, sammendrag, quiz). Fordi demoen ikke gjør KI-kall (memlog-beslutning), kan den heller ikke vise forklaringsspørsmål med tilbakemelding eller vurdering. I novemberversjonen ser sensor altså ikke dagens forslag, forklaringsspørsmål eller vurdering. UJ-5 sier at Eli «ser hva som skiller appen fra en vanlig quiz», men det er nytt-spørsmål-regelen og ikke briefens forskjeller. Memloggen bestemmer ferdiglaget innhold, men ikke at demoen skal forbli på del 1-nivå.
- **Forslag:** Legg til i FR-26 at demoen fra del 2/3 også viser et ferdiglaget dagens forslag, et fremdriftsbilde og et eksempel på forklaringsspørsmål med ferdiglaget tilbakemelding og vurdering (ingen KI-kall). Alternativt: registrer i memloggen at demoen bevisst bare viser kjernen, og skriv det i §2.

### H4. SM-1 er svekket: «fem kvelder» er blitt «fem økter» (middels)
- **Briefen:** «Appen blir faktisk brukt, minst fem kvelder i uka fra oktober til eksamen. De to andre dagene brukes fleksibelt.»
- **PRD-en:** SM-1: «Minst fem økter i uka». En økt omfatter også selvvalgt trening på forklaringsspørsmål (§3), så fem økter på én helgedag oppfyller kriteriet. Det måler ikke den jevne bruken briefen er ute etter (motsatsen til innspurtspugging).
- **Forslag:** «Minst én økt på minst fem ulike dager i uka».

### H5. «Fullførbar økt» på kort tid har ingen øvre grense (middels)
- **Briefen:** «gjør hver kveld om til en konkret, fullførbar økt», «rundt halvannen time … med lite energi igjen», «laget for kort og oppstykket tid … ikke for lange leseøkter».
- **PRD-en:** Bare sammendraget har en grense (FR-11: 600 ord, ca. 5 min). Når brukeren ligger bak, kan en kveld bli 2 sammendrag + 2 quizer à 10 spørsmål + opptil 5 repetisjonsspørsmål + et forklaringsspørsmål (FR-9, FR-10, FR-17), uten at noen grense sier at dette fortsatt skal gå an å fullføre på en sliten kveld.
- **Forslag:** NFR eller akseptansekriterium i FR-10: dagens forslag skal kunne fullføres på høyst ca. 45 minutter (anslått), også når brukeren ligger bak. Ellers fordeles etterslepet på flere dager.

### H6. «Den kjenner emnet» kan forsvinne fra del 1 (middels)
- **Briefen:** Sammendraget er «knyttet til emnets læringsutbytte», og «Læringsutbytte og eksamensform styrer sammendrag, spørsmål og tilbakemelding» er en av de tre forskjellene. Del 1 er det som tas i bruk i oktober og vises i demoen.
- **PRD-en:** §9.1 lar FR-6 (læringsutbytte og eksamensform) flyttes til del 2 «hvis det blir trangt». Da blir sammendragene i oktober og demoen (som etter FR-26 skal ha læringsutbytte) generiske, altså nettopp det briefen sier skiller Studievenn fra NotebookLM. Memloggen nevner bare «Oct minimum cut line» som endring, uten at denne avveiningen er begrunnet.
- **Forslag:** Flytt FR-6 inn i «Minimum i del 1» (det er bare to tekstfelt), eller skriv i §9.1 at demoen og del 1 da mister forskjellen «kjenner emnet», og registrer valget i memloggen.

### H7. Målet om å slippe innspurtspugging står ikke som jobb eller mål (lav-middels)
- **Briefen:** Studenten vil «møte til eksamen uten å pugge i siste liten». Tredje del av problemet: «Man ender med å pugge rett før eksamen … innspurtspugging i stedet for jevn læring.»
- **PRD-en:** §2.1 (jobs to be done) har «vite hva jeg skal gjøre», «se om jeg ligger foran eller bak» og «øve på å forklare», men ikke jevn læring i stedet for pugging. §0 sier at bakgrunnen ikke gjentas, så PRD-en mister hvorfor planen fordeler jevnt.
- **Forslag:** Legg til en jobb i §2.1: «Jeg vil jobbe jevnt gjennom semesteret, så jeg slipper å pugge alt rett før eksamen.» Vurder et kontrollpunkt i SM-2, f.eks. at ikke mer enn ca. 20 % av delkapitlene er gjennomført den siste uka før eksamen.

### H8. IBE160-rammene er komprimert (lav)
- **Briefen:** «Prosjektkode og funksjonalitet utgjør 70 % av karakteren, og vurderingen krever en KI-generert applikasjon med dokumentasjon.» Dokumentasjonen skal vise kvalitetssikring: «tester, gjennomganger og hva som ble rettet».
- **PRD-en:** §7 og SM-7 nevner KI-bruk og kvalitetssikring, men ikke 70 %-vektingen (som er et argument for å prioritere fungerende funksjoner framfor finpuss) og ikke «gjennomganger og hva som ble rettet».
- **Forslag:** Ta med vektingen i §7 og skriv i SM-7 «tester, gjennomganger og hva som ble rettet».

### H9. Spaced repetition: PRD-en legger til et løfte (lav)
- **Briefen:** Spaced repetition står under «Ikke med i denne versjonen», uten noe om framtiden. Visjonen nevner bare tale og nye emner.
- **PRD-en:** §9.2: «Det er aktuelt i en senere versjon.» Dette står ikke i briefen eller i memloggen.
- **Forslag:** Fjern bisetningen, eller registrer den i memloggen som en ny beslutning.

## Bevisste avvik (registrert i memloggen, ikke hull)

- Bare tekst, ingen filopplasting. Foiler legges inn som tekst i notatet (briefen: «egne notater og foiler»). Det siste er fortsatt en antakelse som skal bekreftes.
- Kildemateriale er bare egne forelesningsnotater (override pga. opphavsrett og HiMoldes KI-retningslinjer).
- Push-varsler er flyttet til Bør (override). Briefen har dem ikke med blant Må-kravene.
- Oppdiktet persona Kim i brukerreisene.
- Demoen har bare ferdiglaget innhold, ingen KI-kall, og nullstilles per besøk.
- Tilgangslås (passord eller hemmelig lenke) i del 1 før innlogging i del 2. At data følger med over til del 2, er en antakelse.
- «Gjennomført» = minst 80 % riktige på quizen, som er strengere enn briefens «gjennomgått med sammendrag og quiz».
- Fleksible dager (lør/søn) brukes av planen bare ved etterslep. Brukeren kan alltid velge selv.
- Kontrollpunktet i SM-3 er løsnet, og SM-C4 er lagt til av PM (begge er antakelser som skal bekreftes).
