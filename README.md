# Gruppe G131

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- Marte Hovda Hansen

## Kjøre appen lokalt

Appen heter Studievenn og er laget med Next.js 16, TypeScript og Tailwind CSS. Du trenger Node.js 20.9 eller nyere.

```sh
npm install        # installer avhengigheter
npm run dev        # start utviklingsserveren på http://localhost:3000
npm test           # kjør enhetstestene (Vitest)
npm run lint       # sjekk koden, blant annet at lagene i arkitekturen holdes
npm run typecheck  # typesjekk med TypeScript
npm run build      # bygg appen for produksjon
```

Miljøvariablene står i `.env.example`. Kopier fila til `.env.local` og fyll inn verdiene når appen trenger Supabase. Filer med ekte verdier (`.env*.local`) skal aldri committes.

Innloggingen bruker Supabase Auth. For å logge inn lokalt må `.env.local` ha `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` fra Supabase-prosjektet `studievenn-dev`. Uten dem virker bygget, men ikke forsiden og innloggingen. Det finnes bare eierens konto, og registrering er slått av.

### Databasen og migreringer

Skjemaet, RLS og `GRANT` endres bare med migreringer i `supabase/migrations/`, aldri i dashbordet. Supabase CLI er en utviklingsavhengighet, så den kjøres med `npx`. Kjør alltid mot `dev` først og så mot `prod`:

```sh
npx supabase login                                     # én gang per maskin
npx supabase link --project-ref ddfuxxawkghlqzpvighk   # dev (spør om databasepassordet)
npx supabase db push --remote                          # kjør nye migreringer mot det koblede prosjektet
```

For `prod` kobles det til `frykrsmzrbdvijtaivcd` på samme måte, og etter `db push` tilbake til `dev`.

`npm run test:dev` kjører testene som går mot `dev` (`*.dev.test.ts`), blant annet at RLS stenger andre brukere ute. De kjøres ikke i CI. De trenger en testkonto i `dev` (ikke eieren) med `RLS_TEST_EMAIL` og `RLS_TEST_PASSWORD` i `.env.local`.

### Importere notater og sammendrag

Kapitler, delkapitler og notater kommer fra notatfilene i `G131-hovda/notater/<EMNE>/kapittel-<n>.md`, og sammendragene fra innholdsfilene `kapittel-<n>.innhold.md` ved siden av. Begge legges inn med en lokal kommando:

```sh
npm run import -- --target dev IBE430 1    # kapittel 1 i IBE430 til dev
npm run import -- --target prod IBE430 1   # til prod, spør om bekreftelse først
npm run import -- --target dev --force 1.2 IBE430 1   # legger inn sammendraget for 1.2 på nytt
npm run innhold:hash -- IBE430 1                      # hashene innholdsfila skal ha, uten database
```

Importen leser nøklene fra `.env.dev.local` eller `.env.prod.local` i prosjektroten. Fila trenger `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (dashbordet for prosjektet, Settings → API) og `OWNER_EMAIL` (eierens e-post). Service role-nøkkelen omgår RLS, men importen skriver bare eierens rader. Filene skal aldri committes.

- Emnet må finnes fra før. Opprett det i appen først.
- Hele notatfila valideres før noe skrives. Feil gir en norsk melding med linjenummer, kode 1 og ingen endringer. Svikter databasetilkoblingen midt i en import, kan noen endringer alt være lagret. Kjør da importen på nytt, den er idempotent.
- Importen er idempotent. En ny kjøring med samme fil endrer ingenting og skriver «Alt er uendret». Endrede titler og notater oppdateres.
- Et delkapittel som er borte fra fila, slettes ikke, men merkes som fjernet og skjules i kapittellisten. Kommer nummeret tilbake, blir det samme delkapittel aktivt igjen.
- Bare `## Læringsmål for kapittelet`, `## Nøkkelbegreper` og delkapitlene (`### n.m Tittel` under `## Fordelt på delkapitler`) tas med. `## Råtekst`, `## Rettelser`, `## Gjennomgangsspørsmål` og `## Spørsmålsbank` tas aldri med.
- Appen og importen kaller aldri en KI-leverandør, og importen trenger ingen KI-nøkler. Sammendragene (høyst 600 ord, bare fra notatet) lages på forhånd i Claude Code etter instruksjonen `G131-hovda/notater/_instruksjoner/innhold.v1.md` og skrives i innholdsfila. Instruksjonen beskriver regler, filformat og arbeidsflyt.
- Hvert delkapittel i innholdsfila har en `inputHash`: en hash av normalisert notat, kapittelets læringsmål og nøkkelbegreper og instruksjonsversjonen. `npm run innhold:hash -- <EMNE> <n>` skriver `n.m <inputHash>` for hvert delkapittel med notater.
- Hele innholdsfila valideres sammen med notatfila før noe skrives, også før bekreftelsen mot prod. Sammendrag som er tomme eller over 600 ord, ukjente delkapitler, delkapitler uten notater, duplikater, feil `emne` eller `kapittel`, manglende `instruksjon` eller `modell`, ugyldig hash og ukjente `##`-seksjoner gir en norsk melding med linjenummer, kode 1 og ingen endringer.
- Hver linje i utskriften sier hva som skjedde med sammendraget: «sammendrag lagt inn» (ny klar versjon), «sammendrag uendret» (samme tekst og hash som siste klare versjon), «sammendrag utdatert» eller «mangler innhold».
- «Sammendrag utdatert» betyr at hashen i fila er ulik notatets hash nå, fordi notatet, læringsmålene, nøkkelbegrepene eller instruksjonen er endret. Sammendraget lagres ikke, og importen avslutter med kode 1. Lag det på nytt etter instruksjonen og lim inn ny hash.
- «Mangler innhold» betyr at delkapittelet har notater, men ikke står i innholdsfila, eller at fila ikke finnes. Kapitlene lagres likevel, og koden er 0.
- En rettet tekst med samme hash gir en ny versjon. Tidligere klare versjoner tas aldri bort. Hver versjon lagrer modellen (`modell`) og instruksjonsversjonen (`instruksjon`) fra fila.
- `--force <n.m>` legger inn sammendraget for ett delkapittel på nytt selv om det er uendret. Delkapittelet må høre til kapittelet som importeres, ha notater og stå i innholdsfila.

Planleggingen ligger i `G131-hovda/planning-artifacts/`, og kildenotatene for emnene i `G131-hovda/notater/`.
