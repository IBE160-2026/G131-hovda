import { describe, expect, it } from "vitest";
import {
  chooseReplacement,
  QUIZ_LENGTH,
  quizOutcome,
  quizResultText,
  selectQuizQuestions,
  type BankQuestion,
  type QuizItemState,
} from "./quiz";

/** 20 spørsmål q1–q20 fordelt på temaene A–E, fire per tema (q1–q4 er A, q5–q8 er B osv.). */
const bank: BankQuestion[] = Array.from({ length: 20 }, (_, i) => ({
  id: `q${i + 1}`,
  themeId: "ABCDE"[Math.floor(i / 4)],
}));
const byId = new Map(bank.map((q) => [q.id, q]));

/** Beholder rekkefølgen ved stokking (j = i hver gang). */
const noShuffle = () => 0.999999;

const noHistory = { lastUsed: new Map<string, string>(), carryThemeId: null };

const usedAt = (entries: [string, string][]) => new Map(entries);

/** To spørsmål per tema: A B C D E A B C D E på posisjon 1–10. */
const mixed = ["q1", "q5", "q9", "q13", "q17", "q2", "q6", "q10", "q14", "q18"];

/** En quiz med spørsmålene på posisjon 1–10, der de første `answered` er besvart riktig. */
function quiz(answered: number, ids = mixed): QuizItemState[] {
  return ids.map((id, i) => ({
    position: i + 1,
    questionId: id,
    themeId: byId.get(id)!.themeId,
    status: "aktiv",
    answered: i < answered,
    correct: i < answered ? true : null,
  }));
}

function answerWrong(items: QuizItemState[], position: number): QuizItemState[] {
  return items.map((i) => (i.position === position && i.status === "aktiv" ? { ...i, answered: true, correct: false } : i));
}

/** Gjør det samme som datakilden: det gamle elementet blir `erstattet`, og et nytt får posisjonen. */
function replace(items: QuizItemState[], position: number, questionId: string): QuizItemState[] {
  return [
    ...items.map((i) => (i.position === position && i.status === "aktiv" ? { ...i, status: "erstattet" as const } : i)),
    { position, questionId, themeId: byId.get(questionId)!.themeId, status: "aktiv", answered: false, correct: null },
  ];
}

describe("selectQuizQuestions", () => {
  it("velger 10 ulike spørsmål", () => {
    const ids = selectQuizQuestions(bank, noHistory, Math.random)!;
    expect(ids).toHaveLength(QUIZ_LENGTH);
    expect(new Set(ids).size).toBe(QUIZ_LENGTH);
    expect(ids.every((id) => byId.has(id))).toBe(true);
  });

  it("gir null når banken har færre enn 10 ulike spørsmål", () => {
    expect(selectQuizQuestions(bank.slice(0, 9), noHistory, Math.random)).toBeNull();
    expect(selectQuizQuestions([...bank.slice(0, 9), bank[0]], noHistory, Math.random)).toBeNull();
    expect(selectQuizQuestions(bank.slice(0, 10), noHistory, Math.random)).toHaveLength(10);
  });

  it("velger spørsmål eieren aldri har fått, før de som er brukt", () => {
    const lastUsed = usedAt(bank.slice(0, 10).map((q) => [q.id, "2026-11-20T10:00:00Z"]));
    const ids = selectQuizQuestions(bank, { lastUsed, carryThemeId: null }, Math.random)!;
    expect([...ids].sort()).toEqual(bank.slice(10).map((q) => q.id).sort());
  });

  it("fyller opp med de som ble brukt for lengst siden", () => {
    const lastUsed = usedAt(
      bank.slice(0, 15).map((q, i) => [q.id, `2026-11-20T10:${String(15 - i).padStart(2, "0")}:00Z`]),
    );
    const ids = selectQuizQuestions(bank, { lastUsed, carryThemeId: null }, noShuffle)!;
    // q16–q20 er ubrukte. Så q15 (10:01), q14 (10:02) og videre.
    expect(ids).toEqual(["q16", "q17", "q18", "q19", "q20", "q15", "q14", "q13", "q12", "q11"]);
  });

  it("begynner med et spørsmål om temaet som ble overført", () => {
    const ids = selectQuizQuestions(bank, { lastUsed: new Map(), carryThemeId: "E" }, noShuffle)!;
    expect(ids[0]).toBe("q17");
    expect(ids.slice(1)).toEqual(["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"]);
  });

  it("velger det som ble brukt for lengst siden når alle om det overførte temaet er brukt", () => {
    const lastUsed = usedAt([
      ["q17", "2026-11-20T10:02:00Z"],
      ["q18", "2026-11-20T10:01:00Z"],
      ["q19", "2026-11-20T10:03:00Z"],
      ["q20", "2026-11-20T10:04:00Z"],
    ]);
    const ids = selectQuizQuestions(bank, { lastUsed, carryThemeId: "E" }, noShuffle)!;
    expect(ids[0]).toBe("q18");
    expect(ids).toHaveLength(10);
  });

  it("starter vanlig når det overførte temaet ikke lenger finnes i banken", () => {
    const ids = selectQuizQuestions(bank, { lastUsed: new Map(), carryThemeId: "X" }, noShuffle)!;
    expect(ids).toEqual(bank.slice(0, 10).map((q) => q.id));
  });

  it("stokker de ubrukte med `random`", () => {
    const ids = selectQuizQuestions(bank.slice(0, 10), noHistory, () => 0)!;
    expect(ids).not.toEqual(bank.slice(0, 10).map((q) => q.id));
    expect([...ids].sort()).toEqual(bank.slice(0, 10).map((q) => q.id).sort());
  });
});

describe("chooseReplacement", () => {
  it("bytter det siste gjenstående spørsmålet mot et ubrukt om samme tema ved feil midt i", () => {
    // Spørsmål 4 er q13 (tema D). q14 er alt i quizen, så q15 er første kandidat.
    const items = answerWrong(quiz(3), 4);
    expect(chooseReplacement(items, 4, bank, noHistory)).toEqual({ kind: "replace", position: 10, questionId: "q15" });
  });

  it("velger kandidaten eieren aldri har fått, så den som ble brukt for lengst siden", () => {
    const items = answerWrong(quiz(3), 4);
    const lastUsed = usedAt([
      ["q15", "2026-11-19T10:00:00Z"],
      ["q16", "2026-11-18T10:00:00Z"],
    ]);
    expect(chooseReplacement(items, 4, bank, { lastUsed })).toEqual({ kind: "replace", position: 10, questionId: "q16" });
    const onlyQ15 = usedAt([["q15", "2026-11-19T10:00:00Z"]]);
    expect(chooseReplacement(items, 4, bank, { lastUsed: onlyQ15 })).toEqual({
      kind: "replace",
      position: 10,
      questionId: "q16",
    });
  });

  it("bytter ikke et spørsmål som selv er en erstatning, så lenge det finnes andre", () => {
    let items = answerWrong(quiz(3), 4);
    items = replace(items, 10, "q15");
    items = answerWrong(items, 5); // q17, tema E: q19 og q20 er kandidater.
    expect(chooseReplacement(items, 5, bank, noHistory)).toEqual({ kind: "replace", position: 9, questionId: "q19" });
  });

  it("bytter en erstatning når den er den eneste som er igjen", () => {
    let items = answerWrong(quiz(8), 9); // q14, tema D: q15 og q16 er kandidater.
    items = replace(items, 10, "q15");
    // Erstatningen q15 på posisjon 10 er eneste gjenstående. Kandidaten er q16, ikke q13, q14 eller q15.
    expect(chooseReplacement(answerWrong(items, 9), 9, bank, noHistory)).toEqual({
      kind: "replace",
      position: 10,
      questionId: "q16",
    });
  });

  it("velger aldri et spørsmål som har vært i quizen, også når det er erstattet", () => {
    let items = answerWrong(quiz(3), 4);
    items = replace(items, 10, "q15");
    items = answerWrong(items, 9); // q14, tema D. q13, q14 og q15 har vært med, så q16 er igjen.
    expect(chooseReplacement(items, 9, bank, noHistory)).toEqual({ kind: "replace", position: 10, questionId: "q16" });
  });

  it("erstatter ingenting når temaet ikke har flere spørsmål utenfor quizen", () => {
    const small = bank.filter((q) => q.themeId !== "D" || q.id === "q13" || q.id === "q14");
    const items = answerWrong(quiz(3), 4);
    expect(chooseReplacement(items, 4, small, noHistory)).toBeNull();
  });

  it("overfører temaet ved feil på siste spørsmål", () => {
    const items = answerWrong(quiz(9), 10); // q18, tema E.
    expect(chooseReplacement(items, 10, bank, noHistory)).toEqual({ kind: "carry", themeId: "E" });
  });

  it("gir null for en posisjon som ikke finnes", () => {
    expect(chooseReplacement(quiz(3), 11, bank, noHistory)).toBeNull();
  });
});

describe("quizOutcome", () => {
  it("teller de riktige av de aktive elementene", () => {
    let items = answerWrong(quiz(3), 4);
    items = replace(items, 10, "q15");
    items = items.map((i) => (i.status === "aktiv" && !i.answered ? { ...i, answered: true, correct: true } : i));
    expect(quizOutcome(items)).toEqual({ correctCount: 9, carryThemeId: null });
  });

  it("overfører temaet når siste spørsmål er feil", () => {
    const items = answerWrong(quiz(9), 10);
    expect(quizOutcome(items)).toEqual({ correctCount: 9, carryThemeId: "E" });
  });
});

describe("quizResultText", () => {
  it("gir «8 av 10 riktige»", () => {
    expect(quizResultText(8, 10)).toBe("8 av 10 riktige");
  });
});
