---
title: 'Story 1.4: Importen legger inn kapitler, delkapitler og notater'
type: 'feature'
created: '2026-11-16'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Emnet IBE430 finnes i appen, men har ingen kapitler. Notatene ligger bare i `G131-hovda/notater/IBE430/kapittel-<n>.md`, så appen kan ikke vise kapittelstrukturen, og 1.5 og 1.6 har ikke noe å lage KI-innhold fra (FR-8 uten KI, FR-3).

**Approach:** En domenefunksjon tolker notatfilen. Kommandoen `npm run import -- --target dev|prod <EMNE> <n>` validerer hele filen og lagrer kapittel, delkapitler og notater idempotent. Ny migrering lager tabellene. Startsiden viser kapittellisten for det aktive emnet.

## Boundaries & Constraints

**Always:**
- Tolking og validering er rene funksjoner i `src/domain` (AD-2). `hasNotes` i `src/domain/hasNotes.ts` er eneste regel for «har notater».
- Kapittel identifiseres ved (eier, emne, nummer), delkapittel ved (eier, emne, «n.m») (AD-5). Titler er attributter. Notatet lagres per delkapittel.
- Hele filen valideres før noe skrives. Feil gir norsk melding med linjenummer, og ingenting skrives (AD-17).
- Notattekst, læringsmål og nøkkelbegreper tar aldri med `## Råtekst`, `## Rettelser`, `## Gjennomgangsspørsmål` eller `## Spørsmålsbank`.
- `scripts/` importerer aldri `src/adapters` direkte. Eget komposisjonsrot for scripts (AD-1).
- Tabellene får eier-FK med `on delete cascade`, RLS og `GRANT` (AD-10). Migrering via Supabase CLI, `dev` før `prod`.
- Kapittellisten følger reglene fra 1.3: `OwnerOnly`, norsk bokmål, tastaturbrukbart, ingen sidelengs rulling fra 320 px.

**Beslutninger (Marte, 16.11.2026):**
- Et delkapittel som er borte fra filen, slettes ikke. Det merkes som fjernet, skjules i kapittellisten og beholder historikken. Kommer nummeret tilbake, blir det samme delkapittel igjen.
- Specen holdes samlet (ca. 3 000 tokens), fordi migrering, tolking, import og kapittelliste hører sammen.

**Never:**
- Ingen KI-kall, sammendrag, spørsmålsbank, `inputHash` eller `--force` (1.5 og 1.6).
- Ikke tolke `## Gjennomgangsspørsmål` eller `## Spørsmålsbank` til data.
- Ikke kjøre migreringen mot `prod`, importen mot `prod` eller pushe til `main` uten at Marte har sagt ja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Kapittel 1 | `kapittel-1.md` | Kapittel 1 med tittel, læringsmål og 6 delkapitler (1.1–1.6) med notattekst | N/A |
| Kapittel 2 | `kapittel-2.md` | 5 delkapitler. Nøkkelbegreper med, selv om seksjonen står etter delkapitlene. 2.3 og 2.5 mangler notater | N/A |
| Råtekst | `### Innliming 1 (…)` under `## Råtekst` | Blir ikke delkapittel og er ikke med i noen tekst | N/A |
| Feil nummer | `### 2.1 …` i `kapittel-1.md` | Ingenting skrives | «Linje 27: delkapittel 2.1 hører ikke til kapittel 1.» |
| Duplikat | `### 1.2` to ganger | Ingenting skrives | «Linje 40: delkapittel 1.2 står to ganger (første gang på linje 31).» |
| Frontmatter | `kapittel` ulik filnavnet, eller `emne` ulik argumentet | Ingenting skrives | Norsk melding som nevner begge verdiene |
| Første import | IBE430 finnes, ingen kapitler | Kapittel og delkapitler lages | N/A |
| Ny kjøring | Samme fil på nytt | Ingenting endres, utskrift sier «uendret» | N/A |
| Endret fil | Ny tittel eller notattekst | Bare de endrede feltene oppdateres | N/A |
| Fjernet delkapittel | 1.6 finnes i databasen, men ikke i filen | 1.6 merkes som fjernet og vises ikke i kapittellisten. Utskriften sier «fjernet» | N/A |
| Tilbake | 1.6 er merket fjernet og står i filen igjen | Samme 1.6 blir aktivt igjen med ny tittel og tekst | N/A |
| Emne mangler | Eieren har ikke IBE430 | Ingenting skrives | «Fant ikke emnet IBE430. Opprett det i appen først.» |
| Prod | `--target prod` | Spør om bekreftelse før noe skrives | Svarer ikke eieren «ja», avsluttes importen uten endringer |
| Kapittelliste | Kapittel 1–2 importert | Startsiden viser kapitler og delkapitler i rekkefølge med norske titler. 2.3 og 2.5 er merket «mangler notater» | Databasefeil: «Noe gikk galt. Prøv igjen senere.» |

</frozen-after-approval>

## Code Map

- `src/domain/hasNotes.ts` -- `hasNotes` og `NO_NOTES_PLACEHOLDER` finnes alt (fra 1.1). Gjenbrukes.
- `src/domain/course.ts` -- `normalizeCourseCode` for `<EMNE>`-argumentet.
- `src/application/dataSource.ts` -- porten `DataSource` (én eier, `ReadResult`/`WriteResult`). Får kapittelmetoder.
- `src/application/courses.ts` -- mønster for brukstilfeller som er eneste skriver av en entitet.
- `src/adapters/supabase/dataSource.ts` -- `SupabaseDataSource(client, ownerId)`, `guarded()`, filtrerer alltid på `owner_id`. Utvides.
- `src/composition/server.ts` -- `getDataSourceForRender()` for startsiden. Uendret mønster.
- `src/app/(innlogget)/start/page.tsx` -- `ActiveCourse` (eksportert, testet i `page.test.ts`). Kapittellisten legges under aktivt emne.
- `src/app/(innlogget)/emner/styles.ts`, `formState.ts` -- felles klasser og `unavailableMessage`.
- `supabase/migrations/20261116210000_courses.sql` -- mønster for tabell, RLS, `GRANT`, `set_updated_at()`, sammensatt unik (`owner_id`, `id`).
- `eslint.config.mjs` -- forbyr `@/adapters` i `scripts/**` og `src/app/**`, og Node-API i `domain`/`application`.
- `vitest.config.ts` -- tar alt med `scripts/**/*.test.ts`.
- `G131-hovda/notater/IBE430/kapittel-1.md`–`kapittel-5.md` -- ekte testfiler. Frontmatter `emne`, `kapittel`, `tittel` (i anførselstegn), `lagt_inn`, ev. `oppdatert`. Delkapitler `### n.m` ligger under `## Fordelt på delkapitler`. `## Nøkkelbegreper` finnes bare i kapittel 2, etter delkapitlene. `## Råtekst` har `### Innliming …` og ```` ```text ````-blokker. Kapittel 3–5 har 2 delkapitler hver.
- `package.json` -- ingen `import`-skript og ingen `tsx`. Node 26.
- `.env.example` -- har `SUPABASE_SERVICE_ROLE_KEY` og `OWNER_EMAIL`. `.env.dev.local` og `.env.prod.local` finnes ikke ennå.

## Tasks & Acceptance

**Execution:**
- [ ] `package.json` -- `tsx` som utviklingsavhengighet med fast versjon, og skriptet `import`: `tsx scripts/import.ts`
- [ ] `supabase/migrations/<tidsstempel>_chapters.sql` -- `chapters` (eier, `course_id` FK med cascade, `number` int, `title`, `learning_goals`, `key_concepts`, unik (eier, `course_id`, `number`)), `subchapters` (eier, `chapter_id` FK med cascade, `number` tekst «n.m», `position` int, `title`, `note_text`, `removed_at` (null = aktivt), unik (eier, `chapter_id`, `number`)), tidsstempler, RLS og `GRANT` som `courses`
- [ ] `src/domain/notesFile.ts` + `notesFile.test.ts` -- `parseNotesFile(text)` gir kapittelnummer, tittel, læringsmål, nøkkelbegreper og delkapitler, eller feil med linjenummer. Tester mot de ekte filene og matriseradene for tolking
- [ ] `src/application/dataSource.ts` -- metodene `listChapters(courseId)` (med aktive delkapitler i rekkefølge) og `saveChapter(courseId, chapter)` (oppretter, oppdaterer, merker fjernede og gjenoppretter, rapporterer hva som ble endret)
- [ ] `src/application/importChapter.ts` + test -- brukstilfellet: finner emnet, validerer, lagrer, gir sammendrag (opprettet / oppdatert / uendret per delkapittel). Eneste skriver av kapitler
- [ ] `src/adapters/supabase/dataSource.ts` + test -- kapittelmetodene, filtrerer på eier
- [ ] `src/composition/script.ts` -- leser `.env.dev.local` eller `.env.prod.local`, lager Supabase-klient med `SUPABASE_SERVICE_ROLE_KEY`, finner eierens id fra `OWNER_EMAIL` og gir en `DataSource`
- [ ] `scripts/import.ts` + `scripts/importArgs.test.ts` -- tolker argumentene, leser filen, spør «Skriv ja for å importere til prod» ved `prod`, skriver norsk resultat og avslutter med kode 1 ved feil
- [ ] `src/app/(innlogget)/start/page.tsx` + `page.test.ts` -- kapittellisten under aktivt emne: kapitler med delkapitler i rekkefølge, «mangler notater» der `hasNotes` er false. Delkapitlene er ikke lenker ennå (1.7)
- [ ] `src/adapters/supabase/rls.dev.test.ts` -- testkontoen ser ingen fremmede rader i `chapters` og `subchapters`
- [ ] `.env.example`, `README.md` -- beskriv `.env.dev.local`/`.env.prod.local` og `npm run import`

**Acceptance Criteria:**
- Given migreringen, when den kjøres med `npx supabase db push --remote` mot `dev`, then finnes `chapters` og `subchapters` med FK, cascade, RLS og `GRANT`.
- Given IBE430 i `dev`, when `npm run import -- --target dev IBE430 1` og så `… 2` kjøres, then viser startsiden kapittel 1 og 2 med delkapitlene i rekkefølge.
- Given en importert fil, when den importeres på nytt uendret, then sier utskriften at alt er uendret, og ingen rader har ny `updated_at`.
- Given en ugyldig fil, when importen kjøres, then avsluttes den med kode 1, og databasen er uendret.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

**Forutsetning (Marte):** Lag `.env.dev.local` med `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (fra dashbordet for `dev`, Settings → API) og `OWNER_EMAIL`. Ingen nøkler går gjennom Claude. `.env.prod.local` på samme måte når importen skal mot `prod` (etter 1.6).

**Service role.** Scriptet har ingen innlogget økt, så det bruker service role-nøkkelen og omgår RLS. Adapteren filtrerer likevel alltid på eier, og eieren finnes bare via `OWNER_EMAIL`.

**Tolking.** Linjebasert: frontmatter først, så `##`-seksjoner. Delkapitler er `### n.m Tittel` under `## Fordelt på delkapitler`. Et delkapittel slutter ved neste `###` eller `##`. Andre `###` (som `### Innliming 1`) tas aldri med. Notatteksten trimmes, og plassholderen lagres som den er, så `hasNotes` avgjør.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test` -- expected: ingen feil
- `npm run build` -- expected: lykkes
- `npx supabase db push --remote` (dev) -- expected: migreringen kjøres uten feil
- `npm run import -- --target dev IBE430 1` to ganger -- expected: første gang opprettet, andre gang uendret
- `npm run test:dev` -- expected: RLS-testene passerer

**Manual checks (if no CLI):**
- Startsiden i `dev` viser kapittel 1–2 med riktige titler og «mangler notater» på 2.3 og 2.5.
