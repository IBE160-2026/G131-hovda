# Instruksjon for innhold, versjon 1 (`innhold.v1`)

Denne instruksjonen styrer hvordan KI-innholdet til Studievenn lages i Claude Code. Appen kaller aldri en KI-leverandør. Innholdet skrives i innholdsfila `notater/<EMNE>/kapittel-<n>.innhold.md`, og importen (`npm run import`) leser og validerer fila.

Versjonen står i frontmatter i innholdsfila (`instruksjon: innhold.v1`) og inngår i `inputHash`. Endres reglene her, lag en ny fil (`innhold.v2.md`) og oppdater `CONTENT_INSTRUCTION_VERSION` i `src/domain/contentFile.ts`. Da blir alt eksisterende innhold utdatert og må lages på nytt.

Versjon 1 gjelder sammendrag (`## Sammendrag`). Quizspørsmål kommer i en senere versjon.

## Kontekst

Les dette før du skriver:

- **Emnets læringsutbytte**, slik det står i appen for emnet (eieren limer det inn i økta hvis det trengs).
- **Kapittelets læringsmål** (`## Læringsmål for kapittelet`) og **nøkkelbegreper** (`## Nøkkelbegreper`) i notatfila `kapittel-<n>.md`.
- **Notatet til hvert delkapittel**: teksten under `### n.m Tittel` i `## Fordelt på delkapitler`.

Læringsutbyttet, læringsmålene og nøkkelbegrepene er bare kontekst. De viser hva som er viktig, men de er ikke kilder. `## Råtekst`, `## Rettelser`, `## Gjennomgangsspørsmål` og `## Spørsmålsbank` brukes aldri.

## Regler for sammendrag

- Skriv på norsk bokmål.
- Bruk bare innholdet i notatet til delkapittelet. Ikke legg til fakta, eksempler, tall eller kilder som ikke står der. Står noe bare i læringsmålene eller nøkkelbegrepene, skal det ikke med.
- Høyst 600 ord, gjerne mye kortere. Ta med det viktigste og få med begrepene notatet forklarer.
- Tonen er kort, ærlig og vennlig. Leseren repeterer pensum om kvelden. Er notatet tynt, blir sammendraget kort. Ikke fyll ut.
- Si det som er tydelig i notatet, før det som er uklart. Er noe i notatet uklart eller ser ut til å motsi seg selv, ikke løs det. Hold deg til det notatet sier.
- Bruk enkel Markdown: korte avsnitt og punktlister der det hjelper, gjerne **fet** skrift for nøkkelbegreper. Ingen overskrifter i teksten (`#`, `##`, `###`), og ingen overskrift med delkapittelets tittel.
- Bare delkapitler med notater får sammendrag. Et delkapittel uten notater (tomt eller `*Ingen notater ennå.*`) skal ikke stå i fila.

## Filformat

```markdown
---
emne: IBE430
kapittel: 1
instruksjon: innhold.v1
modell: claude-code/claude-opus-5-5
---

## Sammendrag

### 1.1 Tittel som i notatfila
<!-- inputHash: 64 hex-tegn -->
Teksten …
```

- `emne` og `kapittel` må være de samme som i notatfila og filnavnet.
- `modell` er modellen som laget innholdet, med prefikset `claude-code/`.
- Under `## Sammendrag` står ett `### n.m Tittel` per delkapittel. Nummeret er nøkkelen, tittelen er bare til hjelp.
- Første linje under overskriften er `<!-- inputHash: … -->` med hashen fra `npm run innhold:hash`. Resten er sammendraget.
- Ingen andre `#`- eller `##`-seksjoner i versjon 1.

## Arbeidsflyt

1. Kjør `npm run innhold:hash -- <EMNE> <n>`. Kommandoen skriver `n.m <inputHash>` for hvert delkapittel med notater og leser ingen database.
2. Skriv sammendragene etter reglene over, og lim inn hashen for hvert delkapittel.
3. Kjør `npm run import -- --target dev <EMNE> <n>` og sjekk utskriften. Hele fila valideres før noe skrives.
4. Når notatet, læringsmålene eller nøkkelbegrepene endres, sier importen «sammendrag utdatert». Lag sammendraget på nytt for de delkapitlene og hent ny hash.
5. En rettet tekst med samme hash gir en ny versjon ved neste import. Uendret tekst gir ingen ny versjon.
