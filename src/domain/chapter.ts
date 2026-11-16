/**
 * Regler for kapitler og delkapitler (FR-8). Rene funksjoner uten avhengigheter (AD-2).
 * Kapittel identifiseres ved (eier, emne, nummer) og delkapittel ved (eier, emne, «n.m») (AD-5).
 * Titler og tekst er attributter.
 */

export type SubchapterInput = {
  /** «n.m», f.eks. «1.2». */
  number: string;
  title: string;
  /** Notatteksten, trimmet. Plassholderen lagres som den er, så `hasNotes` avgjør. */
  noteText: string;
};

export type ChapterInput = {
  number: number;
  title: string;
  learningGoals: string;
  keyConcepts: string;
  /** I rekkefølgen fra notatfilen. */
  subchapters: SubchapterInput[];
};

/** Et lagret delkapittel, også fjernede. `position` er rekkefølgen fra 1. */
export type StoredSubchapter = {
  id: string;
  number: string;
  position: number;
  title: string;
  noteText: string;
  removed: boolean;
};

export type StoredChapterFields = Pick<ChapterInput, "title" | "learningGoals" | "keyConcepts">;

export type ChapterChange = "created" | "updated" | "unchanged";

export type SubchapterChange = "created" | "updated" | "unchanged" | "removed" | "restored";

export type SubchapterFields = { title: string; noteText: string; position: number };

/** Det som skal gjøres med ett delkapittel. `changes` har bare feltene som er endret. */
export type SubchapterStep =
  | { kind: "create"; number: string; fields: SubchapterFields }
  | { kind: "update"; id: string; number: string; changes: Partial<SubchapterFields>; restore: boolean }
  | { kind: "unchanged"; id: string; number: string }
  | { kind: "remove"; id: string; number: string };

/** Feltene i kapittelet som er endret. Tomt objekt betyr uendret. */
export function chapterChanges(
  stored: StoredChapterFields,
  incoming: StoredChapterFields,
): Partial<StoredChapterFields> {
  const changes: Partial<StoredChapterFields> = {};
  if (stored.title !== incoming.title) changes.title = incoming.title;
  if (stored.learningGoals !== incoming.learningGoals) changes.learningGoals = incoming.learningGoals;
  if (stored.keyConcepts !== incoming.keyConcepts) changes.keyConcepts = incoming.keyConcepts;
  return changes;
}

/**
 * Sammenligner lagrede delkapitler med dem i notatfilen. Nye nummer opprettes, endrede felt
 * oppdateres, og aktive delkapitler som er borte fra filen, merkes som fjernet (slettes aldri).
 * Et fjernet nummer som står i filen igjen, blir det samme delkapittelet, aktivt igjen.
 * Stegene kommer i filens rekkefølge, og fjernede til slutt.
 */
export function planSubchapters(
  stored: StoredSubchapter[],
  incoming: SubchapterInput[],
): SubchapterStep[] {
  const byNumber = new Map(stored.map((s) => [s.number, s]));
  const steps: SubchapterStep[] = incoming.map((sub, index) => {
    const fields: SubchapterFields = { title: sub.title, noteText: sub.noteText, position: index + 1 };
    const existing = byNumber.get(sub.number);
    if (!existing) return { kind: "create", number: sub.number, fields };

    const changes: Partial<SubchapterFields> = {};
    if (existing.title !== fields.title) changes.title = fields.title;
    if (existing.noteText !== fields.noteText) changes.noteText = fields.noteText;
    if (existing.position !== fields.position) changes.position = fields.position;
    if (!existing.removed && Object.keys(changes).length === 0) {
      return { kind: "unchanged", id: existing.id, number: sub.number };
    }
    return { kind: "update", id: existing.id, number: sub.number, changes, restore: existing.removed };
  });

  const incomingNumbers = new Set(incoming.map((s) => s.number));
  for (const s of stored) {
    if (!s.removed && !incomingNumbers.has(s.number)) {
      steps.push({ kind: "remove", id: s.id, number: s.number });
    }
  }
  return steps;
}

/** Hva steget betyr for eieren. */
export function subchapterChangeOf(step: SubchapterStep): SubchapterChange {
  switch (step.kind) {
    case "create":
      return "created";
    case "update":
      return step.restore ? "restored" : "updated";
    case "unchanged":
      return "unchanged";
    case "remove":
      return "removed";
  }
}
