- source_spec: `G131-hovda/implementation-artifacts/spec-1-1-prosjektet-er-satt-opp-og-forsiden-er-i-drift.md`
  summary: Sjekk om `cacheComponents: true` i `next.config.ts` krever `Suspense` eller andre grep når Supabase-økta leses i story 1.2.
  evidence: Uverifisert (antatt middels). Avgjøres ved å bygge innloggingen i story 1.2 og se om `next build` eller sidevisningen klager på dynamiske kall utenfor `Suspense`.

## Deferred from: code review of spec-1-2-eieren-logger-inn-bak-tilgangslasen.md (2026-11-11)

- Fornyingsmerkingen i `getOwnerForRender` (`src/composition/server.ts`) er ikke testet mot ekte `setAll` fra Supabase-klienten. En test må mocke `next/headers`, `react.cache` og SSR-klienten og sjekke at `refreshPending` blir `true` bare når `setAll` kalles.
- Regelen «hver side i `src/app/(innlogget)` må pakke innholdet i `OwnerOnly`» håndheves ikke og står bare i Implementation Notes i spec-1-2. Uten den havner sidens statiske markup i RSC-dataene til uinnloggede. Regelen må inn i arkitekturen eller epic-konteksten, og helst sjekkes automatisk, før neste beskyttede side (story 1.3).
- source_spec: `G131-hovda/implementation-artifacts/spec-1-3-eieren-oppretter-emnet-ibe430-med-laeringsutbytte.md`
  summary: RLS-lesetestene i `rls.dev.test.ts` består også når eieren ikke har rader i `dev`, så de beviser ingenting da.
  evidence: Testene sjekker bare at ingen fremmede rader kommer tilbake. Trenger en annen konto eller seed-data med rader eid av noen andre enn testkontoen.
- source_spec: `G131-hovda/implementation-artifacts/spec-1-3-eieren-oppretter-emnet-ibe430-med-laeringsutbytte.md`
  summary: `ownerOnlyPages.test.ts` er en regex som godtar en side der noe innhold ligger utenfor `<OwnerOnly>`.
  evidence: `<><OwnerOnly>…</OwnerOnly><h1>…</h1></>` består testen. Sterkere sjekk: at rotelementet i default-eksporten er `OwnerOnly` (AST eller strengere regex).
- source_spec: `G131-hovda/implementation-artifacts/spec-1-3-eieren-oppretter-emnet-ibe430-med-laeringsutbytte.md`
  summary: (unverified, medium) `getDataSourceForRender` lager en egen Supabase-klient med samme cookies og kan fornye tokenet en gang til under visning.
  evidence: Avgjøres ved å logge inn, la tilgangstokenet gå ut og se om to fornyinger skjer i samme forespørsel, og om økten overlever når de skjer mer enn 10 s fra hverandre.
