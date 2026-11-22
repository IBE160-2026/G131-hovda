/**
 * Regler for quizen på et delkapittel (FR-10, FR-14, AD-6, AD-16). Rene funksjoner uten
 * avhengigheter (AD-2). En quiz har alltid 10 ulike spørsmål fra banken. Et spørsmål er brukt når
 * det er valgt til en quiz, også når det senere blir erstattet.
 */

export const QUIZ_LENGTH = 10;

/** Andelen riktige som krysser av delkapittelet: 80 %, som brøk så den regnes med heltall (AD-13). */
export const COMPLETION_SHARE = { numerator: 8, denominator: 10 } as const;

/**
 * Om resultatet krysser av delkapittelet: `correct / counted ≥ 0,8`. `counted` er spørsmålene som
 * teller, så et tilbaketrukket spørsmål (1.9) kan trekkes fra. Regnes med heltall, så 8/10 og 8/9
 * er nok, men 7/10 er det ikke. Uten spørsmål som teller, krysses ingenting av.
 */
export function isCompleted(correct: number, counted: number): boolean {
  if (counted <= 0) return false;
  return correct * COMPLETION_SHARE.denominator >= counted * COMPLETION_SHARE.numerator;
}

/** Et aktivt spørsmål i banken, med temaet det hører til. */
export type BankQuestion = { id: string; themeId: string };

/**
 * Hva eieren har fått før på delkapittelet: når hvert spørsmål sist ble valgt til en quiz (ISO-tid
 * i UTC), og temaet den siste ferdige quizen overførte (feil svar på siste spørsmål).
 */
export type QuizHistory = {
  lastUsed: ReadonlyMap<string, string>;
  carryThemeId: string | null;
};

/**
 * Et element i en quiz. Et erstattet element står igjen, så spørsmålet regnes som brukt. Et element
 * som er `trukket`, ble meldt som feil mens quizen pågikk (1.9a), og teller ikke i resultatet.
 */
export type QuizItemState = {
  position: number;
  questionId: string;
  themeId: string;
  status: "aktiv" | "erstattet" | "trukket";
  answered: boolean;
  /** `null` når elementet ikke er besvart. */
  correct: boolean | null;
};

/** Hva et feil svar fører til: et nytt spørsmål på en senere posisjon, et overført tema, eller ingenting. */
export type Replacement =
  | { kind: "replace"; position: number; questionId: string }
  | { kind: "carry"; themeId: string }
  | null;

/** Stokker en kopi med Fisher–Yates. `random` gir et tall i [0, 1), og injiseres så testene er deterministiske. */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Spørsmålene eieren aldri har fått først, så de som ble brukt for lengst siden. Ubrukte stokkes
 * med `random` når den er med, ellers beholdes rekkefølgen i banken.
 */
function byLeastRecentlyUsed<T extends BankQuestion>(
  questions: readonly T[],
  lastUsed: ReadonlyMap<string, string>,
  random?: () => number,
): T[] {
  const unused = questions.filter((q) => !lastUsed.has(q.id));
  const used = questions
    .filter((q) => lastUsed.has(q.id))
    .sort((a, b) => lastUsed.get(a.id)!.localeCompare(lastUsed.get(b.id)!));
  return [...(random ? shuffled(unused, random) : unused), ...used];
}

/**
 * Velger 10 ulike spørsmål til en ny quiz: først ett om temaet som ble overført fra forrige quiz,
 * så spørsmål eieren aldri har fått, så de som ble brukt for lengst siden. `null` når banken har
 * færre enn 10 spørsmål.
 */
export function selectQuizQuestions(
  bank: readonly BankQuestion[],
  history: QuizHistory,
  random: () => number,
): string[] | null {
  const unique = [...new Map(bank.map((q) => [q.id, q])).values()];
  if (unique.length < QUIZ_LENGTH) return null;
  const ordered = byLeastRecentlyUsed(unique, history.lastUsed, random);
  const carried = history.carryThemeId ? ordered.find((q) => q.themeId === history.carryThemeId) : undefined;
  const rest = ordered.filter((q) => q !== carried);
  return [...(carried ? [carried] : []), ...rest].slice(0, QUIZ_LENGTH).map((q) => q.id);
}

/**
 * Hva som skjer når spørsmålet på `wrongPosition` er besvart feil. Er det ingen ubesvarte spørsmål
 * etter det, overføres temaet til neste quiz. Ellers byttes det siste ubesvarte spørsmålet, helst et
 * som ikke selv er en erstatning, mot et om samme tema som ikke har vært i quizen. Kandidatene er
 * først spørsmål eieren aldri har fått, så de som ble brukt for lengst siden. `null` uten kandidat.
 */
export function chooseReplacement(
  items: readonly QuizItemState[],
  wrongPosition: number,
  bank: readonly BankQuestion[],
  history: Pick<QuizHistory, "lastUsed">,
): Replacement {
  const active = items.filter((i) => i.status === "aktiv");
  const wrong = active.find((i) => i.position === wrongPosition);
  if (!wrong) return null;
  const remaining = active.filter((i) => i.position > wrongPosition && !i.answered).sort((a, b) => a.position - b.position);
  if (remaining.length === 0) return { kind: "carry", themeId: wrong.themeId };

  const inQuiz = new Set(items.map((i) => i.questionId));
  const candidates = byLeastRecentlyUsed(
    bank.filter((q) => q.themeId === wrong.themeId && !inQuiz.has(q.id)),
    history.lastUsed,
  );
  if (candidates.length === 0) return null;

  const replaced = new Set(items.filter((i) => i.status === "erstattet").map((i) => i.position));
  const target = remaining.findLast((i) => !replaced.has(i.position)) ?? remaining.at(-1)!;
  return { kind: "replace", position: target.position, questionId: candidates[0].id };
}

/**
 * Resultatet når alle spørsmålene er besvart: antall riktige, antallet som teller, og temaet som
 * overføres når siste spørsmål ble besvart feil. Bare aktive elementer teller, så et erstattet eller
 * tilbaketrukket element er med verken i `counted`, `correctCount` eller `carryThemeId`.
 */
export function quizOutcome(items: readonly QuizItemState[]): {
  correctCount: number;
  counted: number;
  carryThemeId: string | null;
} {
  const active = items.filter((i) => i.status === "aktiv").sort((a, b) => a.position - b.position);
  const last = active.at(-1);
  return {
    correctCount: active.filter((i) => i.correct === true).length,
    counted: active.length,
    carryThemeId: last && last.correct === false ? last.themeId : null,
  };
}

/** «8 av 10 riktige». */
export function quizResultText(correct: number, total: number): string {
  return `${correct} av ${total} riktige`;
}
