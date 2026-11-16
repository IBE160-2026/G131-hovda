---
title: 'Story 1.3: Eieren oppretter emnet IBE430 med læringsutbytte'
type: 'feature'
created: '2026-11-11'
status: 'done'
baseline_commit: '5f36efff7c4516d3fa3645f4173d67587d06af1d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Appen kjenner ingen emner. Uten emne med læringsutbytte og eksamensform kan ikke importen (1.4) eller KI-innholdet (1.5) knyttes til noe, og «den kjenner emnet» gjelder ikke (FR-3 uten eksamensdato, FR-6).

**Approach:** Første migrering lager tabellen `courses` med eier, RLS og `GRANT` (AD-10) og kjøres med Supabase CLI mot `dev` og så `prod`. Eieren kan opprette, endre, slette og velge aktivt emne i appen. Startsiden viser det aktive emnet.

## Boundaries & Constraints

**Always:**
- Porten `DataSource` i `src/application` med emnemetodene. Supabase-koden ligger i `src/adapters/supabase` og hentes via komposisjonsroten (AD-1).
- RLS slipper bare gjennom eierens rader, og adapteren filtrerer i tillegg på eier (AD-10). Emnekoden er unik per eier.
- Skjemaendringer bare via `supabase/migrations/` og Supabase CLI, `dev` før `prod`, aldri via dashbordet.
- Hver ny side i `(innlogget)` pakker innholdet i `OwnerOnly` (fra story 1.2). Server Actions sjekker eieren selv.
- Ingenting er spesialtilpasset IBE430. Norsk bokmål, `<label>` på alle felt, tastaturbrukbart, ingen sidelengs rulling fra 320 px.

**Beslutninger (Marte, 11.11.2026):**
- Aktivt emne lagres i databasen, i tabellen `user_settings` med `active_course_id`, så valget følger eieren på alle enheter. Tabellen har eier, RLS og `GRANT` som `courses`.
- Marte kjører `npx supabase login` og `npx supabase link` selv. Claude kjører `db push` etterpå. Ingen tilgangstoken eller databasepassord går gjennom Claude.
- Specen holdes samlet (ca. 2 700 tokens), fordi migrering, port, adapter og sider ikke kan leveres hver for seg.

**Never:**
- Ikke eksamensdato eller planstart (del 2), ikke kapitler eller import (1.4), ikke innliming av kapittelstruktur (FR-4) eller henting fra himolde.no (FR-7).
- Ikke kjøre migreringen mot `prod` eller pushe til `main` uten at Marte har sagt ja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nytt emne | Kode «ibe430 », navn, læringsutbytte, eksamensform | Lagres som `IBE430`, vises i emnelisten | N/A |
| Første emne | Eieren har ingen emner og oppretter ett | Emnet blir aktivt | N/A |
| Kode finnes | Kode som eieren alt har (uansett store/små bokstaver) | Blir på skjemaet med utfylte felt | «Du har allerede et emne med koden IBE430.» |
| Ugyldig kode | Tom, over 20 tegn eller med mellomrom | Blir på skjemaet | «Emnekoden må være 1–20 bokstaver eller tall, uten mellomrom.» |
| Tomt navn | Navn bare mellomrom | Blir på skjemaet | «Skriv inn et navn på emnet.» |
| Endre | Ny kode, navn eller tekst | Lagres, emnelisten viser endringen | Samme feil som ved oppretting |
| Slette | Eieren bekrefter på bekreftelsessiden | Emnet er borte. Var det aktivt, blir et annet emne aktivt, ellers ingen | N/A |
| Bytte emne | Eieren velger et annet emne | Startsiden viser det valgte emnet | N/A |
| Ingen emner | Eieren har ingen emner | Startsiden ber eieren opprette et emne | N/A |
| Annen bruker | Testkonto i `dev` leser `courses` direkte | Ingen av eierens rader | N/A |
| Database nede | Nettverksfeil | Blir på siden | «Noe gikk galt. Prøv igjen senere.» |

</frozen-after-approval>

## Code Map

- `src/application/auth.ts` -- mønster for porter: rene typer og et interface, ingen Next.js eller Supabase.
- `src/adapters/supabase/serverClient.ts` -- `createSupabaseServerClient(cookies)`. Gjenbrukes, så databasekall går med eierens økt og RLS virker.
- `src/adapters/supabase/auth.ts`, `auth.test.ts` -- mønster for adapter og tester med falsk klient.
- `src/composition/server.ts` -- `getAuth()` (skrivbare cookies) og `getOwnerForRender()` (`React.cache`). Får `getDataSource()` på samme måte.
- `src/app/(innlogget)/layout.tsx`, `OwnerGate.tsx`, `OwnerOnly.tsx` -- tilgangslåsen. Nye sider bruker `OwnerOnly`.
- `src/app/(innlogget)/start/page.tsx` -- viser i dag bare «Hei!». Får aktivt emne og lenke til emnelisten.
- `src/app/logg-inn/LoginForm.tsx`, `actions.ts` -- mønster for skjema med `useActionState`, feilmelding i `role="alert"` og `aria-describedby`.
- `src/app/globals.css` -- fargetokener, også `--error`.
- `supabase/migrations/` -- tom (`.gitkeep`). Supabase CLI er ikke installert. Prosjekt-ref: `dev` `ddfuxxawkghlqzpvighk`, `prod` `frykrsmzrbdvijtaivcd`.
- `vitest.config.ts` -- tar med `src/**/*.test.ts`. CI har ingen Supabase-nøkler.
- `G131-hovda/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md` -- Consistency Conventions mangler regelen om `OwnerOnly` (utsatt punkt fra 1.2).

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- legg til `supabase` (CLI) som utviklingsavhengighet med fast versjon, og skriptet `test:dev`
- [x] `supabase/config.toml` + `supabase/migrations/<tidsstempel>_courses.sql` -- `npx supabase init`, og tabellen `courses` (id, `owner_id` med FK til `auth.users` `on delete cascade` og standard `auth.uid()`, `code`, `name`, `learning_outcomes`, `exam_form`, tidsstempler), unik indeks på (`owner_id`, `upper(code)`), RLS for select/insert/update/delete på `owner_id = auth.uid()`, `GRANT` til `authenticated`, ingenting til `anon` -- AD-10. Samme migrering lager `user_settings` (`owner_id` som primærnøkkel med FK og `on delete cascade`, `active_course_id` med FK til `courses` og `on delete set null`) med RLS og `GRANT`
- [x] `src/domain/course.ts` + `course.test.ts` -- `normalizeCourseCode` og `validateCourseInput` (regler og meldinger fra matrisen) -- AD-2
- [x] `src/application/dataSource.ts` -- porten: `listCourses`, `getCourse`, `createCourse`, `updateCourse`, `deleteCourse`, `getActiveCourse`, `setActiveCourse`. Utfall `ok | duplicate | unavailable` for skriving
- [x] `src/application/courses.ts` + test -- brukstilfellene `saveCourse` (validerer, oppretter eller endrer, første emne blir aktivt) og `removeCourse` (velger nytt aktivt emne)
- [x] `src/adapters/supabase/dataSource.ts` + test -- `SupabaseDataSource`, filtrerer på eier, gjør `23505` om til `duplicate` og nettverksfeil til `unavailable`
- [x] `src/composition/server.ts` -- `getDataSource()` for Server Actions og visning
- [x] `src/app/(innlogget)/emner/page.tsx` -- emnelisten med markert aktivt emne og «Velg»-knapp (Server Action)
- [x] `src/app/(innlogget)/emner/ny/page.tsx`, `emner/[id]/page.tsx`, `CourseForm.tsx`, `actions.ts` -- skjema for ny og endre (kode, navn, læringsutbytte og eksamensform som tekstfelt)
- [x] `src/app/(innlogget)/emner/[id]/slett/page.tsx` -- bekreftelsesside med «Slett emnet» og «Avbryt»
- [x] `src/app/(innlogget)/start/page.tsx` -- vis aktivt emne og «Bytt emne», eller be eieren opprette et emne. Kapittellisten kommer i 1.4
- [x] `src/app/(innlogget)/ownerOnly.test.ts` -- går gjennom alle `page.tsx` under `(innlogget)` og feiler hvis en ikke bruker `OwnerOnly`
- [x] `src/adapters/supabase/rls.dev.test.ts` -- logger inn testkontoen mot `dev` og sjekker at `courses` gir null rader fra eieren. Kjøres bare med `npm run test:dev`, ikke i CI
- [x] `ARCHITECTURE-SPINE.md` -- legg regelen om `OwnerOnly` inn i Consistency Conventions
- [x] `README.md` -- kort om migreringer (`npx supabase db push`) og `npm run test:dev`

**Acceptance Criteria:**
- Given migreringen, when den kjøres med `npx supabase db push` mot `dev` og så mot `prod`, then finnes `courses` med FK, `on delete cascade`, RLS og `GRANT` i begge.
- Given at eieren er innlogget, when eieren oppretter IBE430 med læringsutbytte og eksamensform, then vises emnet i emnelisten og som aktivt emne på startsiden.
- Given to emner, when eieren velger det andre, then viser startsiden det, og et tredje emne kan legges til uten kodeendring.
- Given testkontoen i `dev`, when `npm run test:dev` kjører, then gir `courses` ingen av eierens rader.
- Given en ny `page.tsx` i `(innlogget)` uten `OwnerOnly`, when `npm test` kjører, then feiler testen.

## Implementation Notes

- Testen for `OwnerOnly` heter `ownerOnlyPages.test.ts`, ikke `ownerOnly.test.ts`: på Windows kolliderer navnet med `OwnerOnly.test.ts` fra 1.2 (filsystemet skiller ikke store og små bokstaver).
- `user_settings` peker på `courses` med en sammensatt FK (`owner_id`, `active_course_id`) og `on delete set null (active_course_id)` (Postgres 15+, dev kjører 17). Da kan aktivt emne bare være eierens eget.
- Supabase CLI 3.2.0 kjører `db push` mot lokal stack som standard. Mot det koblede prosjektet trengs `--remote`.
- Brukstilfellet `chooseCourse` ligger sammen med `saveCourse` og `removeCourse`, så aktivt emne bare skrives fra `src/application/courses.ts`.
- `test:dev` bruker `vitest.dev.config.ts`, som leser `.env.local`. Vanlig `npm test` utelater `*.dev.test.ts`.
- Migreringen er kjørt mot `dev` 16.11.2026. Ikke mot `prod`.

## Spec Change Log

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | Startsiden viser «ingen emner» når `listCourses` er `unavailable` (edge, verification-gap) | medium | patch | `start/page.tsx`: `hasCourses` blir false ved `unavailable`, motsier matriseraden «Database nede» |
| 2 | Ingen test av `ActiveCourse` på startsiden (verification-gap) | medium | patch | Ingen `start/page.test.ts`; samme mønster som `OwnerOnly.test.ts` finnes. Slått sammen med 1 |
| 3 | `on delete set null (active_course_id)` aldri testet mot database (verification-gap, blind) | medium | patch | Bare `MemoryDataSource` simulerer regelen; `rls.dev.test.ts` skriver aldri `user_settings` |
| 4 | Duplikattesten lekker rad i `dev` om andre insert lykkes (blind, edge) | low | patch | `rls.dev.test.ts`: `second` legges ikke i `createdIds`. Direkte rettelse, tas med 3 |
| 5 | Feilveiene i `chooseCourseAction` og `notFound` i `updateCourseAction` er utestet (verification-gap, blind) | medium | patch | `actions.test.ts` dekker bare suksess for velg; `getCourse`-mock gir alltid emnet |
| 6 | RLS-lesetestene består også når eieren ikke har rader i `dev` (blind, edge, verification-gap) | medium | defer | Krever en annen konto eller seed-data med eierens rader |
| 7 | `OwnerOnly`-testen er en regex som godtar innhold utenfor omslaget (blind, edge, verification-gap) | medium | defer | Bevisst tekstheuristikk; sterkere sjekk (AST) er eget arbeid |
| 8 | Data-klienten under visning kan fornye tokenet en gang til (edge) | maybe-false | defer | `getDataSourceForRender` lager egen klient med samme cookies; uklart om supabase-js fornyer to ganger utenfor gjenbruksvinduet på 10 s |
| 9 | AK om `prod` ikke oppfylt (blind, edge) | false | reject | Ikke en kodefeil: `prod` venter på ja fra Marte (Never-regelen). Tas i presentasjonen |
| 10 | Spec-status og sprint-status ulike (blind) | false | reject | Sprint-status synkes til `review` i neste steg |
| 11 | Oppgavelinjen nevner `ownerOnly.test.ts` (blind) | low | reject | Rettelsen er å endre specen; forklart i Implementation Notes |
| 12 | `notFound` ved velg gir generisk feilmelding (blind, edge) | low | reject | Krever sletting i annen fane; rettelsen legger til gren og ny query-verdi |
| 13 | `removeCourse`/`saveCourse` ignorerer feil fra `setActiveCourse` (blind, edge) | low | reject | Krever feil midt i flyten; eieren kan velge emne selv, startsiden ber om det |
| 14 | 23503 ved velg blir `unavailable` (edge) | low | reject | Kappløp mellom to faner; generisk melding er akseptabel |
| 15 | Ingen lengdegrense på navn/tekst, `maxLength` 40 mot 20, ingen NFC (blind, edge) | low | reject | Én eier skriver selv; domenet avviser koder over 20 |
| 16 | `test:dev` kan kjøres mot `prod` (blind, edge) | low | reject | `.env.local` peker alltid på `dev` etter konvensjonen; rettelsen er en ny vakt |
| 17 | Tilgjengelighet: fokus etter feil, flere `role="alert"`, dobbel sletting (blind) | low | reject | Feil vises ved feltene med `aria-describedby`; dobbel sletting sletter ingenting nytt |
| 18 | Startsiden importerer fra `emner/` (blind) | low | reject | Ingen konkret skade nå |
| 19 | README/config.toml: testkonto, kobling, `seed.sql`, `enable_signup` (blind) | low | reject | `config.toml` gjelder bare lokal stack; README nevner testkontoen |
| 20 | Opprydding i `afterAll` sjekker ikke feil (edge) | low | reject | Bare testrester i `dev` |

## Design Notes

**Supabase CLI (Marte, i terminalen):** `npx supabase login`, deretter `npx supabase link --project-ref ddfuxxawkghlqzpvighk` med databasepassordet for `dev`. Før `prod`: `npx supabase link --project-ref frykrsmzrbdvijtaivcd`, og etter `db push` kobles det tilbake til `dev`.

**Forutsetning (Marte, i dashbordet for `dev`):** Users → Add user med en testkonto (f.eks. `rls-test@example.com`) og «Auto confirm». E-post og passord legges i `.env.local` som `RLS_TEST_EMAIL` og `RLS_TEST_PASSWORD`, og navnene i `.env.example`.

**Unik kode.** Unik indeks på `upper(code)` gjør at «ibe430» og «IBE430» kolliderer også om noen skriver rett i databasen. Domenet normaliserer i tillegg til store bokstaver uten mellomrom.

**Sletting** fjerner bare emnet nå. Når kapitler kommer (1.4), følger de med via `on delete cascade` fra `courses`.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test` -- expected: ingen feil, også de nye testene
- `npm run build` -- expected: lykkes
- `npx supabase db push` (dev) -- expected: migreringen kjøres uten feil
- `npm run test:dev` -- expected: RLS-testen passerer

**Manual checks (if no CLI):**
- Mot `dev`: opprett IBE430, prøv samme kode på nytt, endre, legg til et emne til, bytt aktivt emne, slett med bekreftelse.
- Etter ja fra Marte: `db push` mot `prod`, deploy og samme sjekk på `https://g131-hovda.vercel.app`.
