- source_spec: `G131-hovda/implementation-artifacts/spec-1-1-prosjektet-er-satt-opp-og-forsiden-er-i-drift.md`
  summary: Sjekk om `cacheComponents: true` i `next.config.ts` krever `Suspense` eller andre grep når Supabase-økta leses i story 1.2.
  evidence: Uverifisert (antatt middels). Avgjøres ved å bygge innloggingen i story 1.2 og se om `next build` eller sidevisningen klager på dynamiske kall utenfor `Suspense`.
