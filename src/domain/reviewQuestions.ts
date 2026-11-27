/**
 * Gjennomgangsspørsmålene i `## Gjennomgangsspørsmål` i en notatfil (FR-27, AD-6). Ren og
 * deterministisk tolking uten KI (AD-2).
 *
 * - En linje som starter med et heltall og punktum («1.» eller «1.Hva?», først på linja) starter et
 *   nytt spørsmål. Et tall rett etter punktumet («1.2 …») gjør det ikke.
 *   Nummeret er ikke med i teksten, og rekkefølgen er filens.
 * - Linjer før første nummer (innledningen) hoppes over.
 * - Innrykkede linjer og linjer rett under (uten blank linje imellom) hører til spørsmålet over, med
 *   linjeskift og innrykk bevart, så underpunkter som «- a) …» blir med.
 * - En linje uten nummer og uten innrykk etter en blank linje avslutter lista, og resten av seksjonen
 *   hoppes over (for eksempel «**Må avklares før bruk:**»).
 */

/** Et gjennomgangsspørsmål slik det står i fila. */
export type ReviewQuestionInput = {
  /** Teksten uten nummeret. Underpunkter står på egne linjer med innrykket fra fila. */
  text: string;
  /** Linjenummeret til linja med nummeret, for feilmeldinger. */
  line: number;
};

// «1.» og «1.Hva?» starter et spørsmål, men ikke «1.2 …» (et tall rett etter punktumet).
const NUMBERED = /^\d+\.(?!\d)(.*)$/;
const INDENTED = /^\s+\S/;

/** Leser spørsmålene fra linjene i seksjonen, i filens rekkefølge. */
export function readReviewQuestions(lines: readonly { text: string; line: number }[]): ReviewQuestionInput[] {
  const questions: { lines: string[]; line: number }[] = [];
  let afterBlank = false;

  for (const { text, line } of lines) {
    const numbered = NUMBERED.exec(text);
    if (numbered) {
      questions.push({ lines: [(numbered[1] ?? "").trim()], line });
      afterBlank = false;
      continue;
    }
    const current = questions.at(-1);
    if (!current) continue;
    if (text.trim() === "") {
      afterBlank = true;
      continue;
    }
    if (!INDENTED.test(text) && afterBlank) break;
    current.lines.push(text.trimEnd());
    afterBlank = false;
  }

  return questions.map((q) => ({ text: q.lines.join("\n").trim(), line: q.line }));
}

/**
 * Teksten spørsmålet gjenkjennes på: Unicode-normalisert (NFC, så æ, ø og å er like uansett hvordan
 * de er skrevet), whitespace slått sammen, trimmet og med små bokstaver. Punktum og annen
 * tegnsetting beholdes.
 */
export function normalizeReviewQuestion(text: string): string {
  return text.normalize("NFC").replace(/\s+/gu, " ").trim().toLowerCase();
}
