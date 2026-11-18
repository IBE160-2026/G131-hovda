/**
 * Regler for KI-sammendrag av delkapitler (FR-11, AD-4, AD-8). Rene funksjoner uten avhengigheter (AD-2).
 */

export const SUMMARY_MAX_WORDS = 600;

/** Status på en sammendragsversjon (AD-8). Importen lagrer bare `klart` og `feilet`. */
export type SummaryStatus = "lages" | "klart" | "feilet";

export const summaryMessages = {
  empty: "Sammendraget er tomt.",
  tooLong: (words: number) => `Sammendraget har ${words} ord, mer enn ${SUMMARY_MAX_WORDS}.`,
} as const;

/**
 * Normaliserer notatteksten før hashing: trimmer, gjør `\r\n` om til `\n`, fjerner mellomrom og
 * tabulatorer på slutten av hver linje og slår sammen flere tomme linjer på rad til én. Usynlige
 * forskjeller gir da ikke nye KI-kall.
 */
export function normalizeNote(noteText: string): string {
  return noteText
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type SummaryHashParts = {
  noteText: string;
  learningGoals: string;
  keyConcepts: string;
  promptVersion: string;
};

/**
 * Teksten som hashes til `inputHash` (AD-4): normalisert notat, kapittelets læringsmål og
 * nøkkelbegreper og promptversjonen. JSON skiller feltene, så innhold kan ikke flyttes mellom dem
 * og gi samme hash.
 */
export function summaryHashSource(parts: SummaryHashParts): string {
  return JSON.stringify([
    normalizeNote(parts.noteText),
    normalizeNote(parts.learningGoals),
    normalizeNote(parts.keyConcepts),
    parts.promptVersion,
  ]);
}

/** Antall ord, skilt med mellomrom eller linjeskift. */
export function countWords(text: string): number {
  return text.split(/\s+/u).filter((word) => word !== "").length;
}

export type SummaryValidation = { ok: true; text: string } | { ok: false; reason: string };

/** Et sammendrag må ha tekst og være på høyst 600 ord. */
export function validateSummaryText(text: string): SummaryValidation {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, reason: summaryMessages.empty };
  const words = countWords(trimmed);
  if (words > SUMMARY_MAX_WORDS) return { ok: false, reason: summaryMessages.tooLong(words) };
  return { ok: true, text: trimmed };
}
