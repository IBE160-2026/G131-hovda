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
- source_spec: `G131-hovda/implementation-artifacts/spec-1-4-importen-legger-inn-kapitler-delkapitler-og-notater.md`
  summary: `findUserId` i `src/composition/script.ts` (paginering og store/små bokstaver i `OWNER_EMAIL`) er utestet.
  evidence: Klienten lages inne i `getDataSourceForScript`, så en test krever å injisere klienten. En endret stoppbetingelse eller fjernet `.toLowerCase()` merkes ikke av noen test.
- source_spec: `G131-hovda/implementation-artifacts/spec-1-4-importen-legger-inn-kapitler-delkapitler-og-notater.md`
  summary: Ingen automatisk test av service role-GRANT på `chapters`, `subchapters` og `courses`.
  evidence: `rls.dev.test.ts` tester bare `authenticated` og `anon`. Uten `grant select on courses to service_role` feiler importen med «Fikk ikke kontakt med databasen». Krever service role-nøkkelen i dev-testmiljøet.
- source_spec: `G131-hovda/implementation-artifacts/spec-1-4-importen-legger-inn-kapitler-delkapitler-og-notater.md`
  summary: Alle databasefeil blir «unavailable», så importen sier «Fikk ikke kontakt med databasen» også når tabellene mangler.
  evidence: `guarded()` (fra 1.3) kaster Postgres-koden. Kjøres importen mot `prod` før migreringen er pushet, blir meldingen misvisende. For scriptet bør koden/meldingen skrives til stderr.
- source_spec: `G131-hovda/implementation-artifacts/spec-1-5-importen-lager-ki-sammendrag-og-eieren-kan-lese-dem.md`
  summary: Story 1.5b: kapittellisten viser status per delkapittel («mangler notater», «innhold lages», «klart», «feilet»), og eieren kan åpne et klart delkapittel og lese siste klare sammendrag på under 3 s (side `/delkapittel/<id>` i `OwnerOnly`, 404 uten klar versjon).
  evidence: Marte valgte 18.11.2026 å dele story 1.5 fordi specen var på rundt 3 000 tokens. 1.5a (KI-modul, migrering og import) må være ferdig først.
- source_spec: `G131-hovda/implementation-artifacts/spec-1-5-importen-lager-ki-sammendrag-og-eieren-kan-lese-dem.md`
  summary: RLS-lesetesten for `summary_versions` i `rls.dev.test.ts` beviser ingenting så lenge tabellen i `dev` ikke har eierrader.
  evidence: Testen filtrerer bort testkontoens egne rader og venter en tom liste; med tom tabell består den også med `using (true)`. Bør kreve minst én eierrad (telle med service role) etter første import med KI mot `dev`.
- source_spec: `G131-hovda/implementation-artifacts/spec-1-5a-v2-importen-legger-inn-sammendrag-fra-innholdsfila.md`
  summary: Grenen i `scripts/import.ts` der innholdsfila finnes, men ikke kan leses (ikke ENOENT, kode 1), har ingen test.
  evidence: Verification-gap-review 19.11.2026. Returnerer `readContentFile` `null` for alle feil, blir en ulesbar fil stille til «mangler innhold» med kode 0, og ingen test feiler. Krever en fixturmappe eller en katalog på fil-stien i en spawn-test.
- source_spec: `G131-hovda/implementation-artifacts/spec-1-5b-status-i-kapittellisten-og-lesesiden.md`
  summary: `listSummaryVersions` for et helt emne kan bli avkortet av PostgREST max-rows, så delkapitler feilaktig viser «mangler innhold».
  evidence: Uverifisert (antatt middels). Supabase-adapteren henter alle versjonene for alle delkapittel-ID-ene uten paginering. Avgjøres ved å sjekke max-rows i prosjektet og telle `summary_versions`-rader per emne etter gjentatte importer.
- source_spec: `G131-hovda/implementation-artifacts/spec-1-6a-importen-legger-inn-sporsmalsbanken.md`
  summary: Story 1.6b: når notatet er endret, sier importen at spørsmålsbanken er utdatert, nye spørsmål med den eksisterende temalisten erstatter bare ubrukte KI-spørsmål (som trekkes tilbake med status), og importen sier fra og fyller på når færre enn 10 aktive spørsmål er ubesvart.
  evidence: Marte valgte 20.11.2026 å dele story 1.6. «Brukt» og «ubesvart» krever quizer og svar fra 1.7, så 1.6b bør bygges etter 1.7.
- source_spec: `G131-hovda/implementation-artifacts/spec-1-6a-importen-legger-inn-sporsmalsbanken.md`
  summary: Innholdsfiler (sammendrag og quizspørsmål etter `innhold.v2`) for IBE430 kapittel 2–5, og import mot `prod` for kapittel 1–5 så alle delkapitler med notater er klare i drift.
  evidence: Siste akseptansekriterium i story 1.6. Marte valgte 20.11.2026 å skille det ut; prod krever hennes ja.
- source_spec: `G131-hovda/implementation-artifacts/spec-1-6a-importen-legger-inn-sporsmalsbanken.md`
  summary: `listQuestionBanks` for et helt emne kan bli avkortet av PostgREST max-rows, så delkapitler feilaktig viser «mangler innhold».
  evidence: Uverifisert (antatt middels). Samme mønster som for `listSummaryVersions`: adapteren henter alle bankversjonene (også `feilet` og `lages`) uten paginering. Avgjøres ved å sjekke max-rows og telle `question_bank_versions` per emne.

- source_spec: `G131-hovda/implementation-artifacts/spec-1-8-delkapittelet-krysses-av-og-framdriften-vises.md`
  summary: The SQL in `finish_quiz` and the RLS for `subchapter_completions` are only verified by `npm run test:dev`, which CI does not run.
  evidence: `vitest.config.ts` excludes `*.dev.test.ts` and `.github/workflows/ci.yml` runs only typecheck, lint and `npm test`; a regression such as `on conflict do update` would pass CI because app tests run against `MemoryDataSource`. Closing it needs a CI database (same gap for all earlier migrations).

- source_spec: `G131-hovda/implementation-artifacts/spec-1-9a-eieren-sier-fra-om-feil-i-quizsporsmal.md`
  summary: Story 1.9b: eieren melder feil i et sammendrag, sammendraget merkes og vises til neste import, importen lister merkede sammendrag, og neste import legger inn den rettede versjonen fra innholdsfila (FR-12).
  evidence: Marte valgte 22.11.2026 å dele story 1.9 og ta quizspørsmålene først. Sammendragsdelen kan leveres for seg (merke på sammendragsversjonen og en liste i importen).
