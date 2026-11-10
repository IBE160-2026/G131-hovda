# Story 1.1: prosjektoppsett og forside

## 2026-11-10 kl. 20:54 — Marte

### Oppgave
Bygge story 1.1 etter den godkjente spesifikasjonen: Next.js-prosjekt med arkitekturens lag, tester, CI og en norsk forside klar for deploy til Vercel.

### Plan
- Følge `bmad-build` fra byggesteget, uten hjelpeagenter (Martes valg).
- Spesifikasjon: [spec-1-1](../../G131-hovda/implementation-artifacts/spec-1-1-prosjektet-er-satt-opp-og-forsiden-er-i-drift.md). Fortsetter [sprintplan-og-ett-vindu](997-2026-11-09-22-12-06-sprintplan-og-ett-vindu.md).

### Resultat
- Commit `fc2edcb`: Next.js 16.4.6, React 19.3, Tailwind CSS 4.3, Vitest 4.1 i roten av repoet. Kildetreet fra arkitekturen, `hasNotes()` med 6 tester, ESLint-regler for lagene i `src/domain`, `src/application`, `src/app` og `scripts`, GitHub Actions (typesjekk, lint, tester), `vercel.json` med `fra1`, `.env.example` og en README-seksjon.
- Verifisert lokalt: `npm run typecheck`, `npm run lint`, `npm test` (6 av 6) og `npm run build` lykkes. Lagreglene er sjekket med midlertidige filer med ulovlige importer.
- Gjennomgangen ble gjort i samme økt (ikke uavhengig). Den fant at `src/application` ikke var dekket av lagregelen. Det er rettet. Ett punkt om `cacheComponents` er utsatt til story 1.2 (`deferred-work.md`).
- Story 1.1 står som `review` i sprintplanen. Ingenting er pushet.
- Vercel-prosjektet `g131-hovda` ble opprettet i en annen økt (se [vercel-prosjekt](996-2026-11-10-20-53-14-vercel-prosjekt.md)).

### Åpne punkter
- Etter første deploy: sjekk at forsiden er oppe på Vercel-adressen, at funksjonsregionen er `fra1`, og at GitHub Actions passerer.
- Sjekk forsiden i nettleser i mobil-, iPad- og PC-bredde (ikke gjort i økten).
- `npm audit` viser 7 moderate sårbarheter i `@typescript-eslint` (bare utviklingsavhengigheter). Følg med på en oppdatering av eslint-config-next.
