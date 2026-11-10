/**
 * Plassholderen notatfilene bruker for delkapitler som ennå ikke har notater.
 */
export const NO_NOTES_PLACEHOLDER = "*Ingen notater ennå.*";

/**
 * Eneste definisjon av «har notater» (AD-2). Tom tekst, bare mellomrom og
 * plassholderen `*Ingen notater ennå.*` betyr at delkapittelet mangler notater.
 */
export function hasNotes(noteText: string | null | undefined): boolean {
  const trimmed = (noteText ?? "").trim();
  return trimmed !== "" && trimmed !== NO_NOTES_PLACEHOLDER;
}
