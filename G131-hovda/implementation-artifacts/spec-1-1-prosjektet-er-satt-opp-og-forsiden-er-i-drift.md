---
title: 'Story 1.1: Prosjektet er satt opp og forsiden er i drift'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_commit: 'ca03c38b5fbfb6cebefdf808c292ae73f1b0763c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Det finnes ingen appkode ennå. Uten et prosjekt med arkitekturens lag, tester, CI og automatisk deploy kan ingen senere story bygges, testes eller settes i drift (NFR-7, NFR-8).

**Approach:** Opprett et Next.js 16.4-prosjekt i TypeScript med kildetreet fra arkitekturen, en lint-regel som håndhever lagene (AD-1), Vitest med én domenetest, GitHub Actions og en norsk forside med innloggingsknapp, deployet til Vercel i `fra1`.

## Boundaries & Constraints

**Always:**
- Next.js 16.4.x (minst 16.4.1, nå 16.4.6) med App Router og TypeScript i strict-modus. Ingen `middleware.ts`.
- `vercel.json` med `"regions": ["fra1"]`.
- Lint feiler når `src/domain` importerer fra `src/application`, `src/adapters`, `src/app`, `next`, `react`, `@supabase/*` eller `@anthropic-ai/*`, og når `src/app` eller `scripts` importerer fra `src/adapters`.
- Forsiden er på norsk bokmål (`<html lang="nb">`), sier kort hva Studievenn er, har en knapp «Logg inn» og har ingen sidelengs rulling fra 320 px bredde. Semantisk HTML og god kontrast.
- `.env.example` lister variabelnavnene uten verdier. `.env*.local` er ignorert (dekkes allerede av `.env.*` i `.gitignore`).
- Norske commit-meldinger, små commits.

**Beslutninger (Marte, 10.11.2026):**
- Appen ligger i roten av repoet (`src/`, `package.json` ved siden av `_bmad/`, `.claude/` og `G131-hovda/`). Notatene leses fra `G131-hovda/notater/`.
- Styling med Tailwind CSS 4.
- Marte kobler GitHub-repoet til et nytt Vercel-prosjekt i Vercel-dashbordet. Deploy skjer ved push til `main`. Ingen Vercel CLI.

**Never:**
- Ingen Supabase, innlogging eller database (story 1.2). Knappen «Logg inn» lenker til `/logg-inn`, som ikke finnes ennå.
- Ingen KI-kode eller Bedrock-avhengigheter.
- Ingen push til `main` eller oppretting av Vercel-prosjekt uten at Marte har sagt ja.

</frozen-after-approval>

## Code Map

- `.gitignore` -- dekker allerede `node_modules/`, `.next/`, `.vercel/`, `next-env.d.ts`, `.env.*` med unntak for `.env.example`. Gjenbrukes, endres ikke.
- `README.md` -- kort gruppebeskrivelse. Får en seksjon om hvordan appen kjøres lokalt.
- `G131-hovda/notater/IBE430/kapittel-*.md` -- notatfilene. Røres ikke i denne storyen.
- `_bmad/`, `.claude/`, `.logs/` -- verktøy og logger. Skal ikke med i lint, typesjekk eller Vercel-bygg.
- Ingen eksisterende appkode. Verktøy: Node 26.10, npm 11.19. `gh`, `vercel` og `supabase` CLI er ikke installert.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/` -- opprett med `create-next-app@16.4.6` (TypeScript, App Router, `src/`-mappe, ESLint, uten Turbopack-spesifikke valg) -- grunnlaget
- [x] `src/domain/`, `src/application/`, `src/adapters/{supabase,bedrock,demo,clock}/`, `scripts/`, `supabase/migrations/`, `demo-data/` -- opprett, med `.gitkeep` der mappen ellers er tom -- kildetreet fra AD-1
- [x] `src/domain/hasNotes.ts` + `src/domain/hasNotes.test.ts` -- `hasNotes(noteText)` etter AD-2 med tester (tom, mellomrom, `*Ingen notater ennå.*`, ekte tekst) -- første domenetest, og funksjonen trengs i story 1.4
- [x] `vitest.config.ts`, `package.json`-skript `test`, `typecheck`, `lint` -- Vitest kjører `src/**/*.test.ts`
- [x] `eslint.config.mjs` -- `no-restricted-imports` per mappe for lagreglene -- AD-1
- [x] `src/app/layout.tsx`, `src/app/page.tsx`, stiler -- norsk forside med kort tekst og «Logg inn»-knapp, responsiv -- AC-ene for forsiden
- [x] `vercel.json` -- `regions: ["fra1"]` -- AD-12
- [x] `.github/workflows/ci.yml` -- ved push og pull request: `npm ci`, typesjekk, lint, test
- [x] `.env.example` -- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OWNER_EMAIL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, alle uten verdier
- [x] `README.md` -- seksjon «Kjøre appen lokalt» (`npm install`, `npm run dev`, `npm test`, `npm run lint`, `npm run typecheck`)

**Acceptance Criteria:**
- Given prosjektet, when `npm test` kjøres, then Vitest kjører `hasNotes`-testene og alle passerer.
- Given en fil i `src/domain` som importerer fra `src/adapters` eller `next`, when `npm run lint` kjøres, then lint feiler. Det samme gjelder `src/app` eller `scripts` som importerer fra `src/adapters`.
- Given en push til GitHub, when Actions kjører, then typesjekk, lint og tester kjøres og passerer.
- Given at `main` er pushet og koblet til Vercel, when bygget er ferdig, then forsiden vises på en offentlig HTTPS-adresse med funksjonsregion `fra1`.
- Given forsiden i 320 px, 768 px og 1280 px bredde, when den vises, then er det ingen sidelengs rulling, teksten er på norsk og «Logg inn»-knappen er synlig.

## Verification

**Commands:**
- `npm run typecheck` -- expected: ingen feil
- `npm run lint` -- expected: ingen feil; en midlertidig ulovlig import i `src/domain` gir feil
- `npm test` -- expected: alle tester passerer
- `npm run build` -- expected: bygget lykkes, ingen middleware

**Manual checks (if no CLI):**
- `npm run dev` og se forsiden i nettleseren i mobil-, iPad- og PC-bredde.
- Etter deploy: åpne Vercel-adressen og sjekk at funksjonsregionen er `fra1`.

## Implementation Notes

- Prosjektet er laget med `create-next-app@16.4.6` i scratchpad og kopiert til roten, fordi verktøyet ikke skriver over eksisterende README og `.gitignore`. Malens `public/`-SVG-er, README og `.gitignore` er ikke tatt med. Repoets `.gitignore` dekker alt.
- Malen slo på `cacheComponents` og `partialPrefetching` i `next.config.ts`. Beholdt som standard for 16.4.
- Versjoner: next 16.4.6, react 19.3.0, tailwindcss 4.3.3, vitest 4.1.12, eslint 9, typescript 5.
- `typecheck` kjører `next typegen && tsc --noEmit`, fordi `LayoutProps` er en generert type. `tsconfig.json` og ESLint ignorerer `_bmad/`, `.claude/`, `.logs/` og `G131-hovda/`.
- Lagregelen bruker `no-restricted-imports` per mappe (ingen ekstra pakke). Sjekket med midlertidige filer: ulovlige importer i `src/domain`, `src/app` og `scripts` ga 5 feil som forventet.
- CI bruker Node 24 (LTS). Lokalt er Node 26.
- `npm audit` viser 7 moderate sårbarheter i `@typescript-eslint` (bare utviklingsavhengigheter via eslint-config-next). Ikke rettet med `--force`.
- `hasNotes` godtar også `null` og `undefined` og gir false for dem.
- Responsiv visning er ikke sjekket i nettleser her. Det må gjøres manuelt.

## Spec Change Log

## Review Triage Log

Gjennomgangen er gjort i samme økt som implementeringen (uten hjelpeagenter, etter Martes valg), og er derfor ikke uavhengig.

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|---|---|---|---|
| 1 | Lagregelen dekket ikke `src/application`, og `src/domain` kunne importere Node-moduler | medium | AD-1 sier at avhengigheter bare går innover, og at domene og applikasjon ikke bruker serverkode. Testfil i `src/application` med import fra `@/adapters` og `node:fs` ga ingen feil før rettelsen | patch: regel for `src/application` og felles liste over serverimporter, sjekket med midlertidige filer (4 feil som forventet) |
| 2 | `cacheComponents: true` fra malen kan kreve `Suspense` rundt dynamiske kall som `cookies()` når innloggingen kommer | maybe-false | Avhenger av hvordan Supabase-økta leses i story 1.2. Avgjøres når den bygges | defer |
| 3 | CI kjører både ved push og pull request, så noen kjøringer blir doble | low | Ufarlig og gratis for offentlige repoer, og å rette det krever en ekstra regel | avvist |
