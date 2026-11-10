# Supabase-prosjekter

## 2026-11-10 kl. 22:37 — Marte

### Oppgave
Sette opp `studievenn-dev` og `studievenn-prod` i eu-central-1 etter sjekklista i Design Notes i [spec-1-2](../../G131-hovda/implementation-artifacts/spec-1-2-eieren-logger-inn-bak-tilgangslasen.md). Registreringen skulle slås av og eierens bruker legges til. Nøklene for dev skulle inn i `.env.local`, slik at story 1.2 kan testes mot dev.

### Plan
- Claude kunne ikke opprette prosjektene, fordi det verken fantes Supabase CLI, tilgangstoken eller Supabase-verktøy. Specen sier dessuten at Marte gjør det i dashbordet.
- Marte gjorde dashbordstegene. Claude skrev `.env.local` og sjekket dev-nøkkelen.
- Avklart: `studievenn-dev` og `studievenn-prod` er Supabase-prosjekter. I Vercel brukes det eksisterende prosjektet `g131-hovda`, med prod-nøkler for Production og dev-nøkler for Preview.

### Resultat
- `.env.local` er laget fra `.env.example` og er gitignorert:
  - `NEXT_PUBLIC_SUPABASE_URL=https://ddfuxxawkghlqzpvighk.supabase.co`. `/rest/v1/` er fjernet.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: publishable-nøkkel (`sb_publishable_…`).
  - `OWNER_EMAIL=marte.h.hansen@himolde.no`. Først sto `hovda` her ved en feil. Det ble rettet da brukerlista i prod viste `hansen`, og Marte bekreftet at `hansen` er riktig.
  - Service role og AWS står tomme.
- Sjekket mot `GET /auth/v1/settings` i dev:
  - Nøkkelen virker.
  - `disable_signup=true`, så registrering er av.
  - E-post er på.
- Disse tingene er ikke sjekket av Claude:
  - at eierens bruker finnes i dev
  - noe som helst i `studievenn-prod`

- Vercel-prosjektet `g131-hovda`:
  - Første forsøk ble feil: nøkkelverdiene havnet i navnefeltet, og dev-nøkkelen lå i Production. Variablene ble slettet og lagt inn på nytt.
  - Ut fra skjermbildene finnes nå både `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` i Production og i Preview.
  - Verdiene er skjult, så Claude har ikke sjekket dem.
- Production i Vercel er rettet og sjekket med skjermbilde:
  - `NEXT_PUBLIC_SUPABASE_URL` hadde først dashbord-lenken som verdi. Nå er den `https://frykrsmzrbdvijtaivcd.supabase.co`.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` er `sb_publishable_toA2…`.
- Sjekket `GET /auth/v1/settings` mot prod med prod-nøkkelen: den virker, `disable_signup=true` og e-post er på.
- Produksjonsadressen er `https://g131-hovda.vercel.app`. I studievenn-prod ble den først lagt inn som Redirect URL uten `https://`, mens Site URL fortsatt sto som `localhost`. Det er rettet: Site URL er `https://g131-hovda.vercel.app`, og Redirect URLs er tom. Sjekket med skjermbilde.
- Brukerlista i studievenn-prod ble sjekket med skjermbilde: det finnes bare én bruker, `marte.h.hansen@himolde.no`, med innlogging via e-post.
- Brukeren i dev er ikke sjekket. Den blir testet første gang Marte logger inn mot dev.

### Åpne punkter
- Bekreft at `studievenn-prod` finnes i eu-central-1, at registreringen er av og at bare eierens bruker finnes der. Sett Site URL til `https://g131-hovda.vercel.app`.
- ~~Legg Supabase-nøklene inn i Vercel-prosjektet `g131-hovda`: prod for Production, dev for Preview.~~ Løst 2026-11-10.
