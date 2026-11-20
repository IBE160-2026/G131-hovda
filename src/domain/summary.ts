/**
 * Regler for sammendrag av delkapitler (FR-11, AD-4, AD-8). Rene funksjoner uten avhengigheter (AD-2).
 */

export const SUMMARY_MAX_WORDS = 600;

/** Status på en sammendragsversjon (AD-8). Importen lagrer bare `klart`. */
export type SummaryStatus = "lages" | "klart" | "feilet";

export const summaryMessages = {
  empty: "Sammendraget er tomt.",
  tooLong: (words: number) => `Sammendraget har ${words} ord, mer enn ${SUMMARY_MAX_WORDS}.`,
} as const;

/**
 * Normaliserer notatteksten før hashing: trimmer, gjør `\r\n` om til `\n`, fjerner mellomrom og
 * tabulatorer på slutten av hver linje og slår sammen flere tomme linjer på rad til én. Usynlige
 * forskjeller gir da ikke utdatert innhold.
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
  /** Instruksjonsversjonen innholdet er laget etter, for eksempel `innhold.v1`. */
  instructionVersion: string;
};

/**
 * Teksten som hashes til `inputHash` (AD-4): normalisert notat, kapittelets læringsmål og
 * nøkkelbegreper og instruksjonsversjonen. JSON skiller feltene, så innhold kan ikke flyttes mellom dem
 * og gi samme hash.
 */
export function summaryHashSource(parts: SummaryHashParts): string {
  return JSON.stringify([
    normalizeNote(parts.noteText),
    normalizeNote(parts.learningGoals),
    normalizeNote(parts.keyConcepts),
    parts.instructionVersion,
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

/**
 * Status for et delkapittel (FR-11, AD-8). I kapittellisten gjelder den både sammendraget og
 * spørsmålsbanken, på lesesiden bare sammendraget. Gjennomført kommer i 1.8.
 */
export type SubchapterStatus = "mangler notater" | "mangler innhold" | "utdatert" | "klart";

export type SubchapterStatusInput = {
  /** Svaret fra `hasNotes` for notatet nå. */
  hasNotes: boolean;
  /**
   * `inputHash` for siste klare versjon av hver innholdstype (sammendrag, spørsmålsbank), eller
   * `null` for en type uten klar versjon.
   */
  readyInputHashes: (string | null)[];
  /** `inputHash` for notatet og kapittelet nå. */
  currentInputHash: string;
};

/**
 * Regnes i denne rekkefølgen: mangler notater, mangler innhold (en av typene har ingen klar
 * versjon), utdatert (en klar versjon har annen hash enn notatet har nå), ellers klart.
 */
export function subchapterStatus(input: SubchapterStatusInput): SubchapterStatus {
  if (!input.hasNotes) return "mangler notater";
  if (input.readyInputHashes.some((hash) => hash === null)) return "mangler innhold";
  if (input.readyInputHashes.some((hash) => hash !== input.currentInputHash)) return "utdatert";
  return "klart";
}
