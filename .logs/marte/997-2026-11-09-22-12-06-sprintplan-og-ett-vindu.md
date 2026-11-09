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
