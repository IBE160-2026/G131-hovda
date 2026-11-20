// `inputHash` for sammendrag (AD-4). Bruker den globale `crypto.subtle`, som finnes både i Node og
// i nettleseren, så applikasjonslaget trenger ingen serverkode (AD-1).
import type { ChapterInput } from "@/domain/chapter";
import { CONTENT_INSTRUCTION_VERSION } from "@/domain/contentFile";
import { hasNotes } from "@/domain/hasNotes";
import { checkNotesFileTarget, parseNotesFile } from "@/domain/notesFile";
import { questionBankContentSource, type ContentQuestionBank } from "@/domain/questionBank";
import { summaryHashSource, type SummaryHashParts } from "@/domain/summary";

/** SHA-256 av teksten, som 64 heksadesimale tegn. */
async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 av hash-grunnlaget. */
export function summaryInputHash(parts: SummaryHashParts): Promise<string> {
  return sha256Hex(summaryHashSource(parts));
}

/** `contentHash` for en spørsmålsbank: like temaer og spørsmål gir lik hash. */
export function questionBankContentHash(bank: Pick<ContentQuestionBank, "themes" | "questions">): Promise<string> {
  return sha256Hex(questionBankContentSource(bank));
}

/** Hashen for ett delkapittel slik den er nå, med instruksjonsversjonen importen kjenner. */
export function subchapterInputHash(
  chapter: Pick<ChapterInput, "learningGoals" | "keyConcepts">,
  noteText: string,
): Promise<string> {
  return summaryInputHash({
    noteText,
    learningGoals: chapter.learningGoals,
    keyConcepts: chapter.keyConcepts,
    instructionVersion: CONTENT_INSTRUCTION_VERSION,
  });
}

export type ContentHashesResult =
  | { ok: true; hashes: { number: string; inputHash: string }[] }
  | { ok: false; errors: string[] };

/**
 * Hashene innholdsfilen skal ha, for delkapitlene med notater i notatfilen. Leser ingen database.
 * Brukes av `npm run innhold:hash` når innholdet lages i Claude Code.
 */
export async function contentHashes(
  notesText: string,
  target: { courseCode: string; chapterNumber: number },
): Promise<ContentHashesResult> {
  const parsed = parseNotesFile(notesText);
  if (!parsed.ok) return parsed;
  const errors = checkNotesFileTarget(parsed.value, target);
  if (errors.length > 0) return { ok: false, errors };
  const chapter = parsed.value.chapter;
  const hashes: { number: string; inputHash: string }[] = [];
  for (const sub of chapter.subchapters) {
    if (hasNotes(sub.noteText)) {
      hashes.push({ number: sub.number, inputHash: await subchapterInputHash(chapter, sub.noteText) });
    }
  }
  return { ok: true, hashes };
}
