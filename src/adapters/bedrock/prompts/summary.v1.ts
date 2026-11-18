// Prompten for sammendrag, versjon 1 (AD-7). Endres teksten, lag en ny fil (summary.v2.ts) med ny
// versjon. Versjonen inngår i inputHash, så alle sammendrag lages da på nytt ved neste import.
import * as z from "zod/v4";
import type { SummaryInput } from "@/application/aiProvider";

export const SUMMARY_PROMPT_VERSION = "summary.v1";

/** Skjemaet svaret må følge (strukturert utdata). Ordgrensen sjekkes etterpå. */
export const summarySchema = z.object({
  sammendrag: z.string().min(1),
});

export const summarySystemPrompt = `Du lager sammendrag for en student som leser dem om kvelden for å repetere pensum.

Regler:
- Skriv på norsk bokmål.
- Bruk bare innholdet i notatet til delkapittelet. Ikke legg til fakta, eksempler eller kilder som ikke står der.
- Læringsutbyttet, læringsmålene og nøkkelbegrepene er bare kontekst: de viser hva som er viktig, men er ikke kilder. Står noe bare der og ikke i notatet, skal det ikke med.
- Høyst 600 ord, gjerne kortere. Ta med det viktigste og få med nøkkelbegrepene som notatet forklarer.
- Tonen er kort, ærlig og vennlig. Er notatet tynt, blir sammendraget kort. Ikke fyll ut.
- Bruk enkel Markdown: korte avsnitt, og punktlister der det hjelper. Ingen overskrift med delkapittelets tittel.

Svar bare med feltet «sammendrag».`;

/** Brukermeldingen: konteksten først, så notatet, avgrenset så det ikke blandes med instruksjonene. */
export function summaryUserMessage(input: SummaryInput): string {
  const orNone = (text: string) => (text.trim() === "" ? "(ingen)" : text.trim());
  return [
    `Emne: ${input.courseCode} ${input.courseName}`,
    `Emnets læringsutbytte:\n${orNone(input.learningOutcomes)}`,
    `Kapittel ${input.chapterNumber}: ${input.chapterTitle}`,
    `Kapittelets læringsmål:\n${orNone(input.learningGoals)}`,
    `Kapittelets nøkkelbegreper:\n${orNone(input.keyConcepts)}`,
    `Delkapittel ${input.subchapterNumber}: ${input.subchapterTitle}`,
    `Notatet til delkapittelet (eneste kilde):\n<notat>\n${input.noteText.trim()}\n</notat>`,
    "Lag sammendraget av notatet.",
  ].join("\n\n");
}
