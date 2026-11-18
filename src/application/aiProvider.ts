// Porten for KI (AD-7). Brukstilfellene kjenner bare denne, ikke Bedrock. Bare importen kaller KI
// i denne epicen.

/** Det KI-en får for å lage sammendraget av ett delkapittel. Bare notatet er kilden. */
export type SummaryInput = {
  courseCode: string;
  courseName: string;
  /** Emnets læringsutbytte, som kontekst. */
  learningOutcomes: string;
  chapterNumber: number;
  chapterTitle: string;
  /** Kapittelets læringsmål og nøkkelbegreper, som kontekst. */
  learningGoals: string;
  keyConcepts: string;
  subchapterNumber: string;
  subchapterTitle: string;
  noteText: string;
};

/**
 * Resultatet av ett KI-kall. Ved feil er `reason` en kort norsk årsak. Modell-ID og promptversjon
 * er alltid med, så også en feilet versjon viser hvordan den ble forsøkt laget.
 */
export type SummaryResult =
  | { status: "ok"; text: string; modelId: string; promptVersion: string }
  | { status: "failed"; reason: string; modelId: string; promptVersion: string };

export interface AiProvider {
  /** Promptversjonen for sammendrag. Inngår i `inputHash`, så en ny prompt gir nye sammendrag. */
  readonly summaryPromptVersion: string;
  /** Kaster ikke: feil i kallet eller i svaret gir `failed`. */
  summarize(input: SummaryInput): Promise<SummaryResult>;
}
