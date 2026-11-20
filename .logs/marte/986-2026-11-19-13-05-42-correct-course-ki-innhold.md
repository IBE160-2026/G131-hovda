# Correct course: KI-innhold lages på forhånd

## 2026-11-19 kl. 13:05 — Marte

### Oppgave
Marte valgte at appen ikke skal kalle noen KI-leverandør (ingen AWS/Bedrock), fordi den ikke skal publiseres. Alt KI-innhold lages på forhånd i Claude Code og legges i innholdsfiler som importen leser. Planen ble justert med `bmad-correct-course`.

### Plan
- `bmad-correct-course` i samlet modus (batch), med valgene: egen innholdsfil per kapittel (`notater/<EMNE>/kapittel-<n>.innhold.md`), fjern Bedrock-koden, modellsvar og selvvurdering for 4.3 og 5.2, vurderingen regnes ut med vanlig kode.
- Endringsforslag: [sprint-change-proposal-2026-11-19.md](../../G131-hovda/planning-artifacts/sprint-change-proposal-2026-11-19.md), godkjent av Marte.

### Resultat
- PRD: §1, brukerreisene, ordlisten (ny: innholdsfil), endringsnotat 19.11, FR-8, 11, 12, 13, 16, 19 (nå «Svare og se modellsvar»), 21 (regel i koden), 26 (demo med modellsvar), 27, NFR-3, NFR-4, NFR-6, §9 og åpent spørsmål 2 (avgjort).
- ARCHITECTURE-SPINE: AD-4 (innholdsfil og `inputHash` per delkapittel), AD-7 og AD-18 erstattet (gammel regel står som historikk), AD-8, AD-12, AD-14, AD-16, stack, diagrammer, kildetre, konvensjoner, kart over krav, åpne spørsmål og utsatte punkter.
- `epics.md`: kravoversikt og AD-oversikt, Story 1.5 (ny AK), 1.6, 1.9, 2.2, Epic 4 heter nå «Kapittelgjennomgang med modellsvar», Story 4.3 «Eieren ser modellsvaret og vurderer svaret sitt», 4.5, 4.6, 5.1, 5.2, 5.3, 5.6.
- Spec 1.5a satt til `superseded`. `sprint-status.yaml`: 1-5 → `in-progress`, 4-3-nøkkelen har fått nytt navn.
- NFR-4: Marte bekreftet at trening på data er slått av i Claude-kontoen.
- `issues.md`: AWS-oppsettet, KI-testen med AWS-nøkler og `eu.`-ID-ene er lukket som utgått.
- Planendringene er ikke committet (bare loggen).

### Åpne punkter
- Bygg Story 1.5a v2 med `bmad-build`: fjern `src/adapters/bedrock/`, `AiProvider`, `getAiProviderForScript` og KI-pakkene, lag tolking av innholdsfila i `src/domain`, skriv instruksjonen `notater/_instruksjoner/innhold.v1.md`, og lag sammendragene for IBE430 kapittel 1.
- PR-en for `story-1-5a-ki-sammendrag` inneholder Bedrock-koden; den bør ikke merges før 1.5a v2 er bygget på samme gren.
