// Quizen på et delkapittel (FR-10, FR-14, FR-16, AD-6, AD-13, AD-16, AD-18). Valgreglene ligger i
// src/domain/quiz.ts. Hver quiz hører til en ny økt. Hvert svar lagres med en gang, og resultatet
// fryses når quizen er ferdig. Et spørsmål som er meldt som feil mens quizen pågår, teller ikke.
import {
  chooseReplacement,
  isCompleted,
  QUIZ_LENGTH,
  quizOutcome,
  quizResultText,
  selectQuizQuestions,
  type QuizHistory,
  type QuizItemState,
} from "@/domain/quiz";
import { getSubchapterSummary } from "./chapterOverview";
import type { Chapter, DataSource, Quiz, QuizItem, Subchapter, Unavailable, WriteResult } from "./dataSource";

type Located = { status: "ok"; chapter: Chapter; subchapter: Subchapter; quizReady: boolean };

/** Delkapittelet slås opp som på lesesiden, så «klart» betyr det samme begge steder. */
async function locate(
  data: DataSource,
  courseId: string,
  number: string,
): Promise<Located | { status: "notFound" } | Unavailable> {
  const result = await getSubchapterSummary(data, courseId, number);
  if (result.status !== "ok") return result;
  return { status: "ok", chapter: result.chapter, subchapter: result.subchapter, quizReady: result.quizReady };
}

function itemStates(quiz: Quiz): QuizItemState[] {
  return quiz.items.map((item) => ({
    position: item.position,
    questionId: item.question.id,
    themeId: item.question.themeId,
    status: item.status,
    answered: item.answeredAt !== null,
    correct: item.correct,
  }));
}

/** Når hvert spørsmål sist ble valgt, og temaet den siste ferdige quizen overførte. `quizzes` er nyeste først. */
function historyOf(quizzes: Quiz[]): QuizHistory {
  const lastUsed = new Map<string, string>();
  for (const item of quizzes.flatMap((q) => q.items)) {
    const previous = lastUsed.get(item.question.id);
    if (!previous || item.createdAt > previous) lastUsed.set(item.question.id, item.createdAt);
  }
  const lastFinished = quizzes.find((q) => q.status === "ferdig");
  return { lastUsed, carryThemeId: lastFinished?.carryThemeId ?? null };
}

const activeItems = (quiz: Quiz) => quiz.items.filter((i) => i.status === "aktiv");

/** Det første ubesvarte spørsmålet, eller `undefined` når alle er besvart. */
const currentItem = (quiz: Quiz) => activeItems(quiz).find((i) => i.answeredAt === null);

const inProgress = (quizzes: Quiz[]) => quizzes.find((q) => q.status === "pågår");

/**
 * Avslutter quizen: resultatet (antall riktige av dem som teller, og temaet som overføres) lagres og
 * endres aldri. Et spørsmål som er meldt som feil, teller ikke, så 8 av 9 kan krysse av. Ved minst
 * 80 % riktige krysses delkapittelet av i samme transaksjon (AD-13). Er det alt krysset av, står den
 * første avkrysningen. Er quizen alt avsluttet, er ingenting endret. Dette er
 * det eneste stedet avkrysningen skrives.
 */
export async function finishQuiz(
  data: DataSource,
  quiz: Quiz,
): Promise<WriteResult<{ correctCount: number; counted: number; completes: boolean }>> {
  const { correctCount, counted, carryThemeId } = quizOutcome(itemStates(quiz));
  const completes = isCompleted(correctCount, counted);
  const saved = await data.saveQuizResult(quiz.id, { correctCount, carryThemeId, completes });
  if (saved.status !== "ok") return saved;
  return { status: "ok", value: { correctCount, counted, completes } };
}

/** Lengste kommentar i en feilrapport, i tegn. */
export const REPORT_COMMENT_MAX = 500;

/**
 * Kommentaren til en feilrapport: trimmet, og `null` når den er tom. `invalid` når den er lengre
 * enn 500 tegn (regnet som i Postgres, så et emoji er ett tegn).
 */
export function reportComment(raw: string | null): { ok: true; value: string | null } | { ok: false } {
  // Et tekstfelt sender linjeskift som CRLF, mens nettleserens maxLength teller dem som ett tegn.
  const trimmed = (raw ?? "").replace(/\r\n/g, "\n").trim();
  if ([...trimmed].length > REPORT_COMMENT_MAX) return { ok: false };
  return { ok: true, value: trimmed === "" ? null : trimmed };
}

export type ReportQuizQuestionResult =
  | {
      status: "ok";
      quizId: string;
      /**
       * `quiz`: spørsmålet er tatt ut av quizen som pågår og av banken. `bank`: quizen var ferdig,
       * så bare banken er endret, og resultatet står.
       */
      removedFrom: "quiz" | "bank";
      /** Om quizen er ferdig nå, fordi den var det fra før eller fordi ingen ubesvarte sto igjen. */
      finished: boolean;
      /** Rapporten er lagret, men quizen kunne ikke avsluttes. Siden viser «Se resultatet». */
      finishFailed: boolean;
    }
  | { status: "invalid" }
  | { status: "notFound" }
  | Unavailable;

/**
 * Melder spørsmålet på `position` som feil (FR-16, AD-18), med en valgfri kommentar. Spørsmålet
 * trekkes tilbake fra banken med en gang. I en quiz som pågår, kan et hvilket som helst aktivt
 * element meldes (det som vises nå, eller et besvart i tilbakemeldingen). Det tas ut av quizen, og
 * står ingen ubesvarte igjen, avsluttes quizen. I en ferdig quiz kan bare det siste spørsmålet, det
 * resultatsiden viser, meldes, og resultatet endres ikke.
 */
export async function reportQuizQuestion(
  data: DataSource,
  courseId: string,
  number: string,
  quizId: string,
  position: number,
  rawComment: string | null,
): Promise<ReportQuizQuestionResult> {
  const comment = reportComment(rawComment);
  if (!comment.ok) return { status: "invalid" };
  const located = await locate(data, courseId, number);
  if (located.status !== "ok") return located;
  const quizzes = await data.listQuizzes(located.subchapter.id);
  if (quizzes.status !== "ok") return quizzes;
  const quiz = quizzes.value.find((q) => q.id === quizId);
  if (!quiz) return { status: "notFound" };

  const running = quiz.status === "pågår";
  const item = running ? activeItems(quiz).find((i) => i.position === position) : activeItems(quiz).at(-1);
  if (!item || item.position !== position) return { status: "notFound" };

  const reported = await data.reportQuizItem(item.id, comment.value);
  if (reported.status !== "ok") return { status: "unavailable" };
  if (!reported.value) return { status: "notFound" };
  if (!running) return { status: "ok", quizId, removedFrom: "bank", finished: true, finishFailed: false };

  const updated = { ...quiz, items: quiz.items.map((i) => (i.id === item.id ? { ...i, status: "trukket" as const } : i)) };
  if (currentItem(updated)) return { status: "ok", quizId, removedFrom: "quiz", finished: false, finishFailed: false };
  const finished = await finishQuiz(data, updated);
  const ok = finished.status === "ok";
  return { status: "ok", quizId, removedFrom: "quiz", finished: ok, finishFailed: !ok };
}

export type StartQuizResult =
  | { status: "ok"; quizId: string; finished: boolean }
  | { status: "notReady" }
  | { status: "tooFew" }
  | { status: "notFound" }
  | Unavailable;

/**
 * Starter en quiz på delkapittelet, eller fortsetter den som er i gang. Er alle spørsmålene i den
 * besvart uten at resultatet ble lagret, avsluttes den. `random` injiseres i testene.
 */
export async function startQuiz(
  data: DataSource,
  courseId: string,
  number: string,
  random: () => number = Math.random,
): Promise<StartQuizResult> {
  const located = await locate(data, courseId, number);
  if (located.status !== "ok") return located;
  const quizzes = await data.listQuizzes(located.subchapter.id);
  if (quizzes.status !== "ok") return quizzes;

  const running = inProgress(quizzes.value);
  if (running) {
    if (currentItem(running)) return { status: "ok", quizId: running.id, finished: false };
    const finished = await finishQuiz(data, running);
    if (finished.status !== "ok") return { status: "unavailable" };
    return { status: "ok", quizId: running.id, finished: true };
  }

  if (!located.quizReady) return { status: "notReady" };
  const bank = await data.listQuizBank(located.subchapter.id);
  if (bank.status !== "ok") return bank;
  const questionIds = selectQuizQuestions(bank.value, historyOf(quizzes.value), random);
  if (!questionIds) return { status: "tooFew" };

  const created = await data.createQuiz({ subchapterId: located.subchapter.id, questionIds });
  if (created.status === "ok") return { status: "ok", quizId: created.value.id, finished: false };
  if (created.status === "duplicate") {
    // En annen forespørsel startet en quiz samtidig. Den fortsettes.
    const again = await data.listQuizzes(located.subchapter.id);
    if (again.status !== "ok") return again;
    const other = inProgress(again.value);
    return other ? { status: "ok", quizId: other.id, finished: false } : { status: "unavailable" };
  }
  return created;
}

export type AnswerQuizResult =
  | {
      status: "ok";
      quizId: string;
      finished: boolean;
      /** Posisjonen med tilbakemelding å vise, eller `null` når svaret ikke gjaldt det nåværende spørsmålet. */
      feedbackPosition: number | null;
    }
  | { status: "invalid" }
  | { status: "notFound" }
  | Unavailable;

/**
 * Lagrer svaret på det nåværende spørsmålet. Ved feil svar byttes et av de gjenstående ut med et om
 * samme tema (`chooseReplacement`). Når siste spørsmål er besvart, avsluttes quizen. Et spørsmål som
 * alt er besvart, endres ikke: første svar gjelder.
 */
export async function answerQuiz(
  data: DataSource,
  courseId: string,
  number: string,
  quizId: string,
  position: number,
  chosenIndex: number | null,
): Promise<AnswerQuizResult> {
  const located = await locate(data, courseId, number);
  if (located.status !== "ok") return located;
  const quizzes = await data.listQuizzes(located.subchapter.id);
  if (quizzes.status !== "ok") return quizzes;
  const quiz = quizzes.value.find((q) => q.id === quizId);
  if (!quiz) return { status: "notFound" };
  if (quiz.status === "ferdig") return { status: "ok", quizId, finished: true, feedbackPosition: null };

  const item = activeItems(quiz).find((i) => i.position === position);
  if (!item) return { status: "notFound" };
  if (item.answeredAt !== null) return { status: "ok", quizId, finished: false, feedbackPosition: position };
  if (currentItem(quiz) !== item) return { status: "ok", quizId, finished: false, feedbackPosition: null };
  if (chosenIndex === null || !Number.isInteger(chosenIndex) || chosenIndex < 0 || chosenIndex >= item.question.options.length) {
    return { status: "invalid" };
  }

  const correct = chosenIndex === item.question.correctIndex;
  const answered = await data.answerQuizItem(item.id, chosenIndex, correct);
  if (answered.status !== "ok") return { status: "unavailable" };
  // Et annet svar kom først. Det gjelder, og den forespørselen tar seg av resten.
  if (!answered.value) return { status: "ok", quizId, finished: false, feedbackPosition: position };

  let items: QuizItem[] = quiz.items.map((i) =>
    i.id === item.id ? { ...i, chosenIndex, correct, answeredAt: new Date(0).toISOString() } : i,
  );

  if (!correct) {
    const bank = await data.listQuizBank(located.subchapter.id);
    if (bank.status !== "ok") return bank;
    const replacement = chooseReplacement(
      itemStates({ ...quiz, items }),
      position,
      bank.value,
      historyOf(quizzes.value),
    );
    if (replacement?.kind === "replace") {
      const target = items.find((i) => i.status === "aktiv" && i.position === replacement.position)!;
      const replaced = await data.replaceQuizItem(target.id, replacement.questionId);
      if (replaced.status !== "ok") return { status: "unavailable" };
      // `false`: ingenting ble endret i databasen, så heller ikke her.
      if (replaced.value) {
        const question = bank.value.find((q) => q.id === replacement.questionId)!;
        items = items.map((i) => (i.id === target.id ? { ...i, status: "erstattet" as const } : i));
        items.push({ ...target, id: `${target.id}-ny`, status: "aktiv", question });
      }
    }
  }

  const updated = { ...quiz, items };
  if (currentItem(updated)) return { status: "ok", quizId, finished: false, feedbackPosition: position };
  const finished = await finishQuiz(data, updated);
  if (finished.status !== "ok") return { status: "unavailable" };
  return { status: "ok", quizId, finished: true, feedbackPosition: position };
}

/** Et spørsmål i quizen slik siden viser det. */
export type QuizItemView = {
  position: number;
  /** Nummeret blant spørsmålene som teller, så et uttatt spørsmål ikke gir hull («Spørsmål 4 av 9»). */
  number: number;
  question: string;
  options: string[];
  /** `null` når spørsmålet ikke er besvart. */
  chosenIndex: number | null;
  correct: boolean | null;
  correctIndex: number;
  explanation: string;
  /** Spørsmålet er meldt som feil og trukket tilbake fra banken. */
  reported: boolean;
};

function toView(quiz: Quiz, item: QuizItem): QuizItemView {
  return {
    position: item.position,
    number: activeItems(quiz).indexOf(item) + 1,
    question: item.question.question,
    options: item.question.options,
    chosenIndex: item.chosenIndex,
    correct: item.correct,
    correctIndex: item.question.correctIndex,
    explanation: item.question.explanation,
    reported: item.status === "trukket" || item.questionRetired,
  };
}

export type QuizStage =
  /** Ingen quiz i gang. `tooFew` når banken har færre enn 10 aktive spørsmål. */
  | { stage: "start"; tooFew: boolean }
  /** Det nåværende spørsmålet. */
  | { stage: "question"; quizId: string; item: QuizItemView }
  /** Tilbakemeldingen på et besvart spørsmål i quizen som er i gang. */
  | { stage: "feedback"; quizId: string; item: QuizItemView }
  /** Alle spørsmålene er besvart, men resultatet er ikke lagret. */
  | { stage: "unfinished"; quizId: string }
  /**
   * Tilbakemeldingen på siste spørsmål som teller, og det frosne resultatet. `passed`: minst 80 %
   * riktige. `total` er 0 når alle spørsmålene ble meldt som feil.
   * `completedBy`: om delkapittelet ble krysset av av denne quizen, av en tidligere, eller ikke er det.
   */
  | {
      stage: "result";
      quizId: string;
      item: QuizItemView | null;
      correctCount: number;
      total: number;
      resultText: string;
      passed: boolean;
      completedBy: "this" | "earlier" | null;
    };

export type GetQuizResult =
  /** `total`: spørsmålene som teller i quizen som vises, eller 10 for en ny quiz. */
  | ({ status: "ok"; chapter: Chapter; subchapter: Subchapter; total: number } & QuizStage)
  | { status: "notReady" }
  | { status: "notFound" }
  | Unavailable;

/**
 * Visningen av quizen på delkapittelet. `answered` er posisjonen eieren nettopp svarte på, og
 * `resultQuizId` er quizen som nettopp ble ferdig. Uten dem vises det nåværende spørsmålet i quizen
 * som er i gang, eller startsiden.
 */
export async function getQuiz(
  data: DataSource,
  courseId: string,
  number: string,
  options: { answered?: number; resultQuizId?: string } = {},
): Promise<GetQuizResult> {
  const located = await locate(data, courseId, number);
  if (located.status !== "ok") return located;
  const quizzes = await data.listQuizzes(located.subchapter.id);
  if (quizzes.status !== "ok") return quizzes;
  const base = { status: "ok" as const, chapter: located.chapter, subchapter: located.subchapter, total: QUIZ_LENGTH };

  const finished = options.resultQuizId
    ? quizzes.value.find((q) => q.id === options.resultQuizId && q.status === "ferdig")
    : undefined;
  if (finished) {
    // «Gjennomført» leses fra avkrysningen, aldri fra quizresultatet (AD-13).
    const completions = await data.listCompletions([located.subchapter.id]);
    if (completions.status !== "ok") return completions;
    const completion = completions.value.find((c) => c.subchapterId === located.subchapter.id);
    const last = activeItems(finished).at(-1);
    const correctCount = finished.correctCount ?? 0;
    const total = finished.total ?? QUIZ_LENGTH;
    return {
      ...base,
      stage: "result",
      quizId: finished.id,
      item: last ? toView(finished, last) : null,
      correctCount,
      total,
      resultText: quizResultText(correctCount, total),
      passed: isCompleted(correctCount, total),
      completedBy: !completion ? null : completion.quizId === finished.id ? "this" : "earlier",
    };
  }

  const running = inProgress(quizzes.value);
  if (running) {
    const counted = { ...base, total: activeItems(running).length };
    const answered = activeItems(running).find((i) => i.position === options.answered && i.answeredAt !== null);
    if (answered) return { ...counted, stage: "feedback", quizId: running.id, item: toView(running, answered) };
    const current = currentItem(running);
    if (current) return { ...counted, stage: "question", quizId: running.id, item: toView(running, current) };
    return { ...counted, stage: "unfinished", quizId: running.id };
  }

  if (!located.quizReady) return { status: "notReady" };
  const bank = await data.listQuizBank(located.subchapter.id);
  if (bank.status !== "ok") return bank;
  return { ...base, stage: "start", tooFew: new Set(bank.value.map((q) => q.id)).size < QUIZ_LENGTH };
}
