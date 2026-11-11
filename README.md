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

Miljøvariablene står i `.env.example`. Kopier fila til `.env.local` og fyll inn verdiene når appen trenger Supabase eller KI. Filer med ekte verdier (`.env*.local`) skal aldri committes.

Innloggingen bruker Supabase Auth. For å logge inn lokalt må `.env.local` ha `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` fra Supabase-prosjektet `studievenn-dev`. Uten dem virker forsiden og bygget, men ikke innloggingen. Det finnes bare eierens konto, og registrering er slått av.

Planleggingen ligger i `G131-hovda/planning-artifacts/`, og kildenotatene for emnene i `G131-hovda/notater/`.
