# Instruksjon for innhold, versjon 2 (`innhold.v2`)

Denne instruksjonen styrer hvordan KI-innholdet til Studievenn lages i Claude Code. Appen kaller aldri en KI-leverandør. Innholdet skrives i innholdsfila `notater/<EMNE>/kapittel-<n>.innhold.md`, og importen (`npm run import`) leser og validerer fila.

Versjonen står i frontmatter i innholdsfila (`instruksjon: innhold.v2`) og inngår i `inputHash`. Endres reglene her, lag en ny fil (`innhold.v3.md`) og oppdater `CONTENT_INSTRUCTION_VERSION` i `src/domain/contentFile.ts`. Da blir alt eksisterende innhold utdatert og må lages på nytt.

Versjon 2 gjelder sammendrag (`## Sammendrag`) og quizspørsmål (`## Quizspørsmål`). Reglene for sammendrag er de samme som i versjon 1 (`innhold.v1.md`).

## Kontekst

Les dette før du skriver:

- **Emnets læringsutbytte**, slik det står i appen for emnet (eieren limer det inn i økta hvis det trengs).
- **Kapittelets læringsmål** (`## Læringsmål for kapittelet`) og **nøkkelbegreper** (`## Nøkkelbegreper`) i notatfila `kapittel-<n>.md`.
- **Notatet til hvert delkapittel**: teksten under `### n.m Tittel` i `## Fordelt på delkapitler`.
- **Brukerens egne spørsmål**: tabellen i `## Spørsmålsbank` i notatfila, bare for quizspørsmålene.

Læringsutbyttet, læringsmålene og nøkkelbegrepene er bare kontekst. De viser hva som er viktig, men de er ikke kilder. `## Råtekst`, `## Rettelser` og `## Gjennomgangsspørsmål` brukes aldri. `## Spørsmålsbank` brukes bare slik det står under «Brukerens egne spørsmål».

## Regler for sammendrag

- Skriv på norsk bokmål.
- Bruk bare innholdet i notatet til delkapittelet. Ikke legg til fakta, eksempler, tall eller kilder som ikke står der. Står noe bare i læringsmålene eller nøkkelbegrepene, skal det ikke med.
- Høyst 600 ord, gjerne mye kortere. Ta med det viktigste og få med begrepene notatet forklarer.
- Tonen er kort, ærlig og vennlig. Leseren repeterer pensum om kvelden. Er notatet tynt, blir sammendraget kort. Ikke fyll ut.
- Si det som er tydelig i notatet, før det som er uklart. Er noe i notatet uklart eller ser ut til å motsi seg selv, ikke løs det. Hold deg til det notatet sier.
- Bruk enkel Markdown: korte avsnitt og punktlister der det hjelper, gjerne **fet** skrift for nøkkelbegreper. Ingen overskrifter i teksten (`#`, `##`, `###`), og ingen overskrift med delkapittelets tittel.
- Bare delkapitler med notater får sammendrag. Et delkapittel uten notater (tomt eller `*Ingen notater ennå.*`) skal ikke stå i fila.

## Regler for quizspørsmål

- Skriv på norsk bokmål. Bare delkapitler med notater får spørsmålsbank.
- Lag først en **temaliste** for delkapittelet: de viktigste temaene i notatet, med korte, faste navn. Temaene brukes senere til «nytt spørsmål om samme tema» og «svakt tema», så navnene endres ikke senere.
- Lag så **nøyaktig 20 spørsmål** for delkapittelet, brukerens egne medregnet. Hvert tema har **minst 2** spørsmål.
- Hvert spørsmål har **fire alternativer** og **nøyaktig ett riktig**. De gale alternativene er troverdige, omtrent like lange som det riktige og tydelig gale ut fra notatet. Ikke bruk «alle de ovennevnte» eller «ingen av dem». Bytt på hvor det riktige alternativet står.
- Bruk bare innholdet i notatet til delkapittelet. Det riktige svaret skal stå i notatet. Korte eksempler som bruker det notatet sier, er greit.
- Hvert spørsmål har en **kort forklaring** på én linje som sier hvorfor svaret er riktig, med støtte i notatet.
- Samme spørsmålstekst kan ikke stå to ganger i et delkapittel. Spør om ulike sider av temaet, ikke bare med nye ord.
- Er noe i notatet uklart eller motsier seg selv, ikke lag spørsmål om det.

### Brukerens egne spørsmål

- Hvert spørsmål i tabellen i `## Spørsmålsbank` blir med i banken til sitt delkapittel, med `Kilde: spørsmålsbank <nr>`.
- Spørsmålsteksten er den samme som i tabellen, og det riktige alternativet er brukerens fasit, ordrett. Lag bare tre gale alternativer, forklaringen og temaet.
- Er fasiten «Ja» eller «Nei», skriv spørsmålet om til et flervalgsspørsmål med fire alternativer. Det riktige alternativet er påstanden slik fasiten bekrefter eller avkrefter den. Skriv originalteksten ordrett i `Original:`.
- Spørsmål som har nummeret i den fete starten av et punkt under «**Må avklares før bruk:**», tas ikke med. Importen sier hvilke den hopper over.

## Filformat

```markdown
---
emne: IBE430
kapittel: 1
instruksjon: innhold.v2
modell: claude-code/claude-opus-5-5
---

## Sammendrag

### 1.1 Tittel som i notatfila
<!-- inputHash: 64 hex-tegn -->
Teksten …

## Quizspørsmål

### 1.1 Tittel som i notatfila
<!-- inputHash: 64 hex-tegn -->
Temaer:
- Første tema
- Andre tema

#### Spørsmålsteksten?
- [ ] Galt alternativ
- [x] Riktig alternativ
- [ ] Galt alternativ
- [ ] Galt alternativ
Forklaring: Én linje.
Tema: Første tema
Kilde: spørsmålsbank 1
Original: Bare for omskrevne Ja/Nei-spørsmål.
```

- `emne` og `kapittel` må være de samme som i notatfila og filnavnet.
- `modell` er modellen som laget innholdet, med prefikset `claude-code/`.
- Under hver seksjon står ett `### n.m Tittel` per delkapittel. Nummeret er nøkkelen, tittelen er bare til hjelp.
- Første linje under overskriften er `<!-- inputHash: … -->` med hashen fra `npm run innhold:hash`. Samme hash brukes i begge seksjonene.
- Under `## Sammendrag` er resten sammendraget.
- Under `## Quizspørsmål` står `Temaer:` med én `- tema` per linje, og så ett `#### Spørsmål` per spørsmål med alternativene (`- [ ]` og `- [x]`), `Forklaring:` og `Tema:`. `Kilde:` står bare på brukerens egne spørsmål, og `Original:` bare på omskrevne Ja/Nei-spørsmål.
- Ingen andre `#`- eller `##`-seksjoner i versjon 2.

## Arbeidsflyt

1. Kjør `npm run innhold:hash -- <EMNE> <n>`. Kommandoen skriver `n.m <inputHash>` for hvert delkapittel med notater og leser ingen database.
2. Skriv sammendragene og spørsmålsbankene etter reglene over, og lim inn hashen for hvert delkapittel.
3. Kjør `npm run import -- --target dev <EMNE> <n>` og sjekk utskriften. Hele fila valideres før noe skrives.
4. Når notatet, læringsmålene eller nøkkelbegrepene endres, sier importen «sammendrag utdatert» og «spørsmålsbank utdatert». Lag sammendraget på nytt for de delkapitlene og hent ny hash. Har delkapittelet allerede en klar spørsmålsbank, sier importen da «spørsmålsbank endret, ikke lagt inn» og avslutter med kode 1 til erstatning og påfylling av spørsmål kommer i en senere versjon av importen. Sammendraget lagres likevel.
5. En rettet sammendragstekst med samme hash gir en ny versjon ved neste import. Uendret tekst gir ingen ny versjon. En klar spørsmålsbank erstattes ikke ennå: er den endret i fila, sier importen fra og skriver ingenting.
