# Sprintplan og ett vindu

## 2026-11-09 kl. 22:12 — Marte

### Oppgave
Starte programmeringen av Studievenn. Marte slo sammen notatvinduet og app-vinduet, slik at alt arbeid nå gjøres i ett vindu.

### Plan
- Oppdatere minnet, slik at skillet mellom notatvindu og app-vindu er borte.
- Kjøre `bmad-sprint-planning`: sjekke om planleggingen er klar, og lage `sprint-status.yaml` fra `epics.md`.

### Resultat
- Minnet er oppdatert: `notater-mappe-eies-av-annet-vindu` er slettet, `ett-vindu` er lagt til, og `kapittelnotater` er oppdatert.
- Sjekken ga CONCERNS (se åpne punkter). Marte valgte å starte likevel.
- `G131-hovda/implementation-artifacts/sprint-status.yaml` er laget: 6 epics og 28 stories, alle i backlog. Epic 6 har ingen stories.
- `sprint-status.yaml` og `G131-hovda/planning-artifacts/epics.md` er ikke committet.

### Åpne punkter
- Epic 6 («Kontoen din», FR-1 og FR-2) mangler stories, og siste kontrollsteg i `epics.md` er ikke kjørt (`stepsCompleted: [1, 2]`). Fullfør med `bmad-create-epics-and-stories` før Epic 6, og kjør sprintplanleggingen på nytt etterpå.
- Avklar Bedrock før story 1.5: pris i EU-profilen, AWS sine vilkår om trening på data (NFR-4), modelltilgang i eu-central-1, AWS-konto med fakturering og IAM-nøkler.
- PRD-en har ikke fått datobeslutningene fra 09.11.2026 (måldato 10.12, planstart når eksamensdatoen legges inn, i stedet for 1.10.2026).

## 2026-11-10 kl. 20:38 — Marte

### Oppgave
Starte story 1.1 med `bmad-build`: lage spesifikasjonen og stoppe etter godkjenning, så byggingen kan tas i en ny økt.

### Plan
- Committe `epics.md` og sprintplanen.
- Samle Epic 1-konteksten og skrive spesifikasjonen for story 1.1, uten hjelpeagenter (Martes valg).
- Få Martes avgjørelser og godkjenning.

### Resultat
- `epics.md` og `sprint-status.yaml` er committet (`dfbdfcf`).
- Laget `G131-hovda/implementation-artifacts/epic-1-context.md` og `spec-1-1-prosjektet-er-satt-opp-og-forsiden-er-i-drift.md` (status `ready-for-dev`), committet i `c34ac54`.
- Martes avgjørelser: appen ligger i roten av repoet, Tailwind CSS 4, og Marte kobler repoet til Vercel selv i dashbordet.
- Sprintplanen: `epic-1` er `in-progress`, og story 1.1 er `ready-for-dev`.
- Ingen appkode er skrevet ennå.

### Åpne punkter
- Bygg story 1.1 i en ny `bmad-build`-økt (spesifikasjonen er godkjent).
- Marte må koble GitHub-repoet til et nytt Vercel-prosjekt før forsiden kan være i drift.
