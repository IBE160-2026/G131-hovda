- source_spec: `G131-hovda/implementation-artifacts/spec-1-1-prosjektet-er-satt-opp-og-forsiden-er-i-drift.md`
  summary: Sjekk om `cacheComponents: true` i `next.config.ts` krever `Suspense` eller andre grep når Supabase-økta leses i story 1.2.
  evidence: Uverifisert (antatt middels). Avgjøres ved å bygge innloggingen i story 1.2 og se om `next build` eller sidevisningen klager på dynamiske kall utenfor `Suspense`.

## Deferred from: code review of spec-1-2-eieren-logger-inn-bak-tilgangslasen.md (2026-11-11)

- Fornyingsmerkingen i `getOwnerForRender` (`src/composition/server.ts`) er ikke testet mot ekte `setAll` fra Supabase-klienten. En test må mocke `next/headers`, `react.cache` og SSR-klienten og sjekke at `refreshPending` blir `true` bare når `setAll` kalles.
- Regelen «hver side i `src/app/(innlogget)` må pakke innholdet i `OwnerOnly`» håndheves ikke og står bare i Implementation Notes i spec-1-2. Uten den havner sidens statiske markup i RSC-dataene til uinnloggede. Regelen må inn i arkitekturen eller epic-konteksten, og helst sjekkes automatisk, før neste beskyttede side (story 1.3).
