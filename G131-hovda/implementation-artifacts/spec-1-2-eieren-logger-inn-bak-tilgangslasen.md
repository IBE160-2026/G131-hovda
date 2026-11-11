---
title: 'Story 1.2: Eieren logger inn bak tilgangslåsen'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_commit: 'f12d12ab6093cbd609b7c8c410dfbcdac31cc20c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/G131-hovda/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Appen har ingen innlogging. Uten en tilgangslås kan ingen story med brukerdata (1.3 og videre) bygges, og dataene er ikke beskyttet (FR-25, AD-9).

**Approach:** Supabase Auth med e-post og passord i prosjektene `dev` og `prod` (eu-central-1), bare eierens konto og registrering av. Appen får en innloggingsside, en beskyttet startside, utlogging og fornying av økta i serverkode, uten middleware.

## Boundaries & Constraints

**Always:**
- `@supabase/ssr` med cookies. Økta lagres i varige cookies (huskes på enheten).
- Ingen `middleware.ts` eller `proxy.ts` (AD-12). Tokens fornyes bare der cookies kan skrives (Route Handler eller Server Action).
- Supabase-koden ligger i `src/adapters/supabase`. `src/app` henter den via komposisjonsroten, aldri direkte (AD-1).
- Tilgangen sjekkes på serveren med verifisert bruker (`getUser`/`getClaims`), ikke bare ved å lese cookien.
- Én felles norsk feilmelding for feil passord og ukjent e-post. Ingen side eller lenke for registrering.
- Norsk bokmål, semantisk skjema med `<label>`, tastaturbrukbart, ingen sidelengs rulling fra 320 px.

**Beslutninger (Marte, 10.11.2026):**
- Norske ruter: `/logg-inn` og `/start`. Et bevisst avvik fra ordlista (engelsk for ruter), fordi URL-ene er en del av det norske grensesnittet. Filer, funksjoner og typer er fortsatt engelske.
- En innlogget eier som åpner forsiden `/` eller `/logg-inn`, sendes rett til `/start`.
- Marte lager Supabase-prosjektene `dev` og `prod` nå etter sjekklista i Design Notes og legger nøklene for `dev` i `.env.local`, så innloggingen kan testes mot `dev`.
- Specen beholdes samlet (ca. 2 000 tokens), fordi innlogging, startside, utlogging og fornying ikke kan leveres hver for seg.

**Never:**
- Ingen tabeller eller migreringer (story 1.3).
- Ikke tilbakestilling av passord eller kontosletting (FR-1, FR-2 kommer senere).
- Ikke opprette Supabase-prosjekter, endre Vercel-miljøvariabler eller pushe til `main` uten at Marte har sagt ja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Riktig innlogging | Eierens e-post og passord | Videre til startsiden | N/A |
| Feil passord | Riktig e-post, feil passord | Blir på innloggingssiden, felles feilmelding, e-posten står igjen i feltet | Melding: «Feil e-post eller passord.» |
| Ukjent e-post | E-post uten konto | Samme som feil passord | Samme melding |
| Tomt felt | E-post eller passord tomt | Nettleseren stopper innsendingen (`required`) | N/A |
| Supabase nede | Nettverksfeil | Blir på siden | «Innloggingen virker ikke akkurat nå. Prøv igjen senere.» |
| Uinnlogget på beskyttet side | Ingen økt | Sendes til forsiden `/` | N/A |
| Utløpt tilgangstoken | Gyldig fornyingstoken | Økta fornyes og siden vises | Feiler fornyingen: til forsiden |
| Utlogging | Innlogget | Til forsiden, beskyttede sider gir forsiden | N/A |

</frozen-after-approval>

## Code Map

- `src/app/page.tsx` -- forsiden, lenker til `/logg-inn`. Lenken beholdes. Får en sjekk som sender innlogget eier til `/start`.
- `src/app/layout.tsx`, `src/app/globals.css` -- rotlayout og fargetokener (`bg-accent`, `text-muted`, `bg-card` osv.). Gjenbrukes for nye sider.
- `src/adapters/supabase/` -- tom (`.gitkeep`). Her kommer Supabase-klientene.
- `eslint.config.mjs` -- `src/app` og `scripts` kan ikke importere `@/adapters`. Ny mappe `src/composition/` er ikke begrenset og blir komposisjonsroten.
- `next.config.ts` -- `cacheComponents: true`. `cookies()` utenfor `Suspense` kan gi byggefeil (utsatt punkt fra story 1.1).
- `.env.example` -- har allerede `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Uendret.
- Pakker: `@supabase/ssr@0.12.7`, `@supabase/supabase-js@2.119.0`. Supabase CLI er ikke installert og trengs ikke her.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- legg til `@supabase/ssr` og `@supabase/supabase-js` med faste versjoner
- [x] `src/application/auth.ts` -- port `Auth`: `signIn(email, password)` gir `ok | invalid | unavailable`, `signOut()`, `getOwner()` gir bruker eller `null` -- brukstilfellene skal ikke kjenne Supabase
- [x] `src/adapters/supabase/serverClient.ts`, `src/adapters/supabase/auth.ts` -- `createServerClient` med `next/headers`-cookies og `SupabaseAuth` som implementerer porten, og som oversetter Supabase-feil til de tre utfallene -- AD-9
- [x] `src/adapters/supabase/auth.test.ts` -- tester feiloversettelsen (feil passord og ukjent e-post gir `invalid`, nettverksfeil gir `unavailable`) med en falsk Supabase-klient
- [x] `src/composition/server.ts` -- komposisjonsroten for Next.js-serveren, gir `getAuth()` -- AD-1
- [x] `src/app/page.tsx` -- send innlogget eier til `/start` (forsiden vises ellers som før)
- [x] `src/app/logg-inn/page.tsx` + `actions.ts` -- skjema og Server Action for innlogging, redirect til `/start` ved `ok`, og innlogget eier sendes rett til `/start`
- [x] `src/app/(innlogget)/layout.tsx` -- sjekker eieren, sender uinnloggede til `/`, sender til fornyingsruten ved utløpt token
- [x] `src/app/(innlogget)/start/page.tsx` -- enkel startside («Hei!», tekst om at emnene kommer) med «Logg ut»-knapp (Server Action)
- [x] `src/app/auth/forny/route.ts` -- Route Handler som fornyer økta, skriver cookies og sender tilbake til en relativ `neste`-sti (ellers `/`)
- [x] `README.md` -- kort om `.env.local` og at innlogging krever Supabase-nøkler

**Acceptance Criteria:**
- Given eierens konto i `dev`, when eieren logger inn, lukker nettleseren og åpner `/start` igjen, then startsiden vises uten ny innlogging.
- Given at tilgangstokenet er utløpt, when eieren åpner `/start`, then økta fornyes i serverkode og startsiden vises.
- Given `npm run build`, when bygget kjører, then det lykkes og lager ingen middleware.
- Given Supabase-dashbordet for `dev` og `prod`, when innstillingene sjekkes, then er registrering av, og bare eierens konto finnes.
- Given `fornyingsruten` med `neste=https://annen.no`, when den åpnes, then sendes brukeren til en side i appen, ikke ut.

## Implementation Notes

- `cacheComponents` står på. Alle lesinger av økta ligger i `<Suspense>` (`RedirectIfOwner`, `OwnerGate`, `OwnerOnly`), og bygget lykkes med `/`, `/logg-inn` og `/start` som Partial Prerender.
- Sider i `(innlogget)` rendres for seg, uavhengig av layouten. Uten egen sjekk havnet startsidens statiske markup i RSC-dataene til uinnloggede (sett med curl). Derfor pakker hver side innholdet i `OwnerOnly`. Komposisjonsroten deler ett `getUser`-oppslag per forespørsel med `React.cache` (`getOwnerForRender`).
- Komposisjonsroten har `getAuth()` (skrivbare cookies, for Server Actions og Route Handlers) og `getOwnerForRender()` (Server Components, merker fornying i `setAll`).
- Layouten vet ikke hvilken sti som vises. Ved fornying viser den `RefreshSession` (klientkomponent), som sender til `/auth/forny?neste=<sti>` med `window.location`.
- Feiloversettelsen er sjekket mot `dev`: feil passord og ukjent e-post gir begge `AuthApiError 400 invalid_credentials`.
- Utlogging bruker `scope: "local"`, så bare denne enheten logges ut.
- `vitest.config.ts` har fått alias for `@/`, så testene kan mocke komposisjonsroten.
- Nytt fargetoken `--error` for feilmeldingen.

## Spec Change Log

## Review Triage Log

- 2026-11-11: Review-laget (Blind Hunter, Edge Case Hunter, Verification Gap) ble hoppet over etter valg fra Marte. Ingen funn er vurdert.

## Design Notes

**Fornying uten middleware.** `getSession()` i Supabase fornyer utløpte tokens selv, også i Server Components, der cookies ikke kan skrives. Da går det nye tokenet tapt. Løsning: klienten i Server Components har en `setAll` som bare merker at en fornying skjedde. Layouten sender da til `/auth/forny?neste=<sti>`, som fornyer på nytt med skrivbare cookies og sender tilbake. Det virker fordi Supabase godtar samme fornyingstoken igjen innen gjenbruksvinduet (standard 10 s).

**`cacheComponents`.** `cookies()` legges inne i `Suspense` der det trengs. Gir det problemer med redirect, slås `cacheComponents` av, og det skrives i Implementation Notes.

**Sjekkliste for Supabase (Marte, i dashbordet):** to prosjekter `studievenn-dev` og `studievenn-prod` i eu-central-1. Authentication → Sign In / Providers: e-post på, «Allow new users to sign up» av, «Confirm email» kan stå. Users → Add user med egen e-post og passord, «Auto confirm». URL Configuration: Site URL `http://localhost:3000` i dev og Vercel-adressen i prod. Nøklene legges i `.env.local` (dev) og i Vercel (prod for Production, dev for Preview).

## Verification

**Commands:**
- `npm run typecheck` -- expected: ingen feil
- `npm run lint` -- expected: ingen feil
- `npm test` -- expected: alle tester passerer, også `auth.test.ts`
- `npm run build` -- expected: lykkes, ingen middleware

**Manual checks (if no CLI):**
- Mot `dev`: logg inn riktig, feil passord, ukjent e-post, logg ut, åpne `/start` uinnlogget.
- Fornying: sett JWT-utløp lavt i `dev` (Auth settings), vent, åpne `/start` og se at økta fornyes.
- Etter deploy: samme sjekk mot `prod` på Vercel-adressen.
