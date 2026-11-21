/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import innhold1 from "../../G131-hovda/notater/IBE430/kapittel-1.innhold.md?raw";
import kapittel1 from "../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import { importChapter } from "./importChapter";
import { listChapterOverview } from "./chapterOverview";
import { answerQuiz, getQuiz, startQuiz } from "./quiz";
import { MemoryDataSource } from "./testing/MemoryDataSource";

/** Stokker likt hver gang (mulberry32), så testene er deterministiske. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** IBE430 med kapittel 1 importert fra de ekte filene: seks klare delkapitler med 20 spørsmål hver. */
async function imported(content: string | null = innhold1) {
  const data = new MemoryDataSource();
  const created = await data.createCourse({ code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "", examForm: "" });
  if (created.status !== "ok") throw new Error("emnet ble ikke opprettet");
  const result = await importChapter(data, kapittel1, { courseCode: "IBE430", chapterNumber: 1 }, { content });
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  const subchapterId = data.chapters[0].subchapters[0].id;
  return { data, courseId: created.value.id, subchapterId };
}

type Setup = Awaited<ReturnType<typeof imported>>;

async function start({ data, courseId }: Setup) {
  const result = await startQuiz(data, courseId, "1.1", seeded(7));
  if (result.status !== "ok") throw new Error(result.status);
  return result.quizId;
}

async function current({ data, courseId }: Setup) {
  const view = await getQuiz(data, courseId, "1.1");
  if (view.status !== "ok" || view.stage !== "question") throw new Error(`ikke et spørsmål: ${JSON.stringify(view)}`);
  return view;
}

/** Svarer på det nåværende spørsmålet, riktig eller feil. */
async function answer(setup: Setup, right: boolean) {
  const { quizId, item } = await current(setup);
  const chosen = right ? item.correctIndex : (item.correctIndex + 1) % 4;
  const result = await answerQuiz(setup.data, setup.courseId, "1.1", quizId, item.position, chosen);
  if (result.status !== "ok") throw new Error(result.status);
  return result;
}

const activeItems = (data: MemoryDataSource, quizId: string) =>
  data.quizItems.filter((i) => i.quizId === quizId && i.status === "aktiv").sort((a, b) => a.position - b.position);

const themeOf = (data: MemoryDataSource, questionId: string) => data.quizQuestions.find((q) => q.id === questionId)!.themeId;

/** Første posisjon før den siste der temaet har aktive spørsmål utenfor quizen. */
function positionWithCandidate(data: MemoryDataSource, quizId: string): number {
  const items = activeItems(data, quizId);
  const inQuiz = new Set(items.map((i) => i.questionId));
  const item = items.slice(0, -1).find((i) =>
    data.quizQuestions.some((q) => q.status === "aktiv" && q.themeId === themeOf(data, i.questionId) && !inQuiz.has(q.id)),
  );
  if (!item) throw new Error("ingen posisjon med kandidat");
  return item.position;
}

describe("startQuiz", () => {
  it("lager en økt og en quiz med 10 ulike spørsmål, og viser spørsmål 1 av 10", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    expect(setup.data.sessions).toHaveLength(1);
    expect(setup.data.quizzes).toMatchObject([{ id: quizId, status: "pågår", sessionId: setup.data.sessions[0].id }]);
    const items = activeItems(setup.data, quizId);
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(items.map((i) => i.questionId)).size).toBe(10);
    const view = await current(setup);
    expect(view.item.position).toBe(1);
    expect(view.item.options).toHaveLength(4);
    expect(view.total).toBe(10);
  });

  it("fortsetter quizen som er i gang, med samme spørsmål og svarene så langt", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    const before = activeItems(setup.data, quizId).map((i) => i.questionId);
    for (let i = 0; i < 3; i++) await answer(setup, true);
    expect(await startQuiz(setup.data, setup.courseId, "1.1")).toEqual({ status: "ok", quizId, finished: false });
    expect(setup.data.quizzes).toHaveLength(1);
    const view = await current(setup);
    expect(view.item.position).toBe(4);
    expect(activeItems(setup.data, quizId).map((i) => i.questionId)).toEqual(before);
    expect(activeItems(setup.data, quizId).filter((i) => i.answeredAt !== null)).toHaveLength(3);
  });

  it("tar ingen spørsmål fra forrige quiz så lenge banken har nok som aldri er brukt", async () => {
    const setup = await imported();
    const first = await start(setup);
    for (let i = 0; i < 10; i++) await answer(setup, true);
    const second = await start(setup);
    const firstIds = activeItems(setup.data, first).map((i) => i.questionId);
    const secondIds = activeItems(setup.data, second).map((i) => i.questionId);
    expect(secondIds.filter((id) => firstIds.includes(id))).toEqual([]);
    for (let i = 0; i < 10; i++) await answer(setup, true);
    // Alle 20 er brukt. Den tredje tar de som ble brukt for lengst siden, altså den første quizens.
    const third = await start(setup);
    expect(activeItems(setup.data, third).map((i) => i.questionId).sort()).toEqual([...firstIds].sort());
  });

  it("sier fra når banken har færre enn 10 aktive spørsmål", async () => {
    const setup = await imported();
    const own = setup.data.quizQuestions.filter((q) => q.subchapterId === setup.subchapterId);
    for (const q of own.slice(9)) q.status = "trukket";
    expect(await startQuiz(setup.data, setup.courseId, "1.1")).toEqual({ status: "tooFew" });
    const view = await getQuiz(setup.data, setup.courseId, "1.1");
    expect(view).toMatchObject({ status: "ok", stage: "start", tooFew: true });
    expect(setup.data.quizzes).toHaveLength(0);
  });

  it("starter ingen quiz uten klar spørsmålsbank", async () => {
    const setup = await imported(null);
    expect(await startQuiz(setup.data, setup.courseId, "1.1")).toEqual({ status: "notReady" });
    expect(await getQuiz(setup.data, setup.courseId, "1.1")).toEqual({ status: "notReady" });
    expect(setup.data.sessions).toHaveLength(0);
  });

  it("gir `notFound` for ukjent emne eller delkapittel", async () => {
    const setup = await imported();
    expect(await startQuiz(setup.data, "ukjent", "1.1")).toEqual({ status: "notFound" });
    expect(await getQuiz(setup.data, setup.courseId, "9.9")).toEqual({ status: "notFound" });
  });

  it("gir `unavailable` når databasen ikke svarer, og lager ingenting", async () => {
    const setup = await imported();
    setup.data.quizReadsDown = true;
    expect(await startQuiz(setup.data, setup.courseId, "1.1")).toEqual({ status: "unavailable" });
    expect(await getQuiz(setup.data, setup.courseId, "1.1")).toEqual({ status: "unavailable" });
    setup.data.quizReadsDown = false;
    setup.data.quizWritesDown = true;
    expect(await startQuiz(setup.data, setup.courseId, "1.1")).toEqual({ status: "unavailable" });
    expect(setup.data.quizzes).toHaveLength(0);
  });
});

describe("answerQuiz", () => {
  it("viser «riktig» og forklaringen etter et riktig svar", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    expect(await answer(setup, true)).toEqual({ status: "ok", quizId, finished: false, feedbackPosition: 1 });
    const view = await getQuiz(setup.data, setup.courseId, "1.1", { answered: 1 });
    if (view.status !== "ok" || view.stage !== "feedback") throw new Error(JSON.stringify(view));
    expect(view.item.correct).toBe(true);
    expect(view.item.explanation).not.toBe("");
    expect((await current(setup)).item.position).toBe(2);
  });

  it("bytter det siste gjenstående spørsmålet mot et om samme tema ved feil midt i", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    const position = positionWithCandidate(setup.data, quizId);
    for (let i = 1; i < position; i++) await answer(setup, true);
    const wrong = activeItems(setup.data, quizId)[position - 1];
    const before = activeItems(setup.data, quizId).map((i) => i.questionId);
    await answer(setup, false);

    const after = activeItems(setup.data, quizId);
    expect(after.map((i) => i.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const replaced = setup.data.quizItems.filter((i) => i.quizId === quizId && i.status === "erstattet");
    expect(replaced).toHaveLength(1);
    const target = replaced[0];
    expect(target.answeredAt).toBeNull();
    expect(target.position).toBe(10);
    expect(target.questionId).toBe(before[9]);
    const added = after.find((i) => i.position === target.position)!;
    expect(before).not.toContain(added.questionId);
    expect(themeOf(setup.data, added.questionId)).toBe(themeOf(setup.data, wrong.questionId));

    const view = await getQuiz(setup.data, setup.courseId, "1.1", { answered: position });
    if (view.status !== "ok" || view.stage !== "feedback") throw new Error(JSON.stringify(view));
    expect(view.item.correct).toBe(false);
    expect(view.item.chosenIndex).not.toBe(view.item.correctIndex);
  });

  it("erstatter ingenting når temaet ikke har flere spørsmål utenfor quizen", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    const first = activeItems(setup.data, quizId)[0];
    const inQuiz = new Set(activeItems(setup.data, quizId).map((i) => i.questionId));
    const theme = themeOf(setup.data, first.questionId);
    for (const q of setup.data.quizQuestions) {
      if (q.themeId === theme && !inQuiz.has(q.id)) q.status = "trukket";
    }
    await answer(setup, false);
    expect(setup.data.quizItems.filter((i) => i.quizId === quizId && i.status === "erstattet")).toEqual([]);
  });

  it("lagrer temaet ved feil på siste spørsmål, og neste quiz begynner med et om det", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    for (let i = 0; i < 9; i++) await answer(setup, true);
    const last = activeItems(setup.data, quizId)[9];
    expect(await answer(setup, false)).toEqual({ status: "ok", quizId, finished: true, feedbackPosition: 10 });
    const theme = themeOf(setup.data, last.questionId);
    expect(setup.data.quizzes[0]).toMatchObject({ status: "ferdig", correctCount: 9, total: 10, carryThemeId: theme });

    const next = await start(setup);
    expect(themeOf(setup.data, activeItems(setup.data, next)[0].questionId)).toBe(theme);
  });

  it("viser og fryser resultatet når spørsmål 10 er besvart", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    // To feil midt i, ellers riktig: 8 av 10.
    for (const right of [true, false, true, true, false, true, true, true, true, true]) await answer(setup, right);
    const view = await getQuiz(setup.data, setup.courseId, "1.1", { resultQuizId: quizId });
    expect(view).toMatchObject({ status: "ok", stage: "result", correctCount: 8, total: 10, resultText: "8 av 10 riktige" });
    if (view.status !== "ok" || view.stage !== "result") throw new Error();
    expect(view.item?.position).toBe(10);

    const frozen = { ...setup.data.quizzes[0] };
    const lastItem = activeItems(setup.data, quizId)[9];
    expect(await answerQuiz(setup.data, setup.courseId, "1.1", quizId, 10, 0)).toEqual({
      status: "ok",
      quizId,
      finished: true,
      feedbackPosition: null,
    });
    expect(await setup.data.saveQuizResult(quizId, { correctCount: 10, carryThemeId: null, completes: true })).toEqual({
      status: "ok",
      value: false,
    });
    expect(setup.data.quizzes[0]).toEqual(frozen);
    expect(activeItems(setup.data, quizId)[9]).toEqual(lastItem);
    // Uten quiz i gang vises startsiden.
    expect(await getQuiz(setup.data, setup.courseId, "1.1")).toMatchObject({ stage: "start", tooFew: false });
  });

  it("lar første svar gjelde når samme spørsmål sendes to ganger", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    const { item } = await current(setup);
    await answerQuiz(setup.data, setup.courseId, "1.1", quizId, 1, item.correctIndex);
    const snapshot = JSON.stringify(setup.data.quizItems);
    expect(await answerQuiz(setup.data, setup.courseId, "1.1", quizId, 1, (item.correctIndex + 1) % 4)).toEqual({
      status: "ok",
      quizId,
      finished: false,
      feedbackPosition: 1,
    });
    expect(JSON.stringify(setup.data.quizItems)).toBe(snapshot);
  });

  it("endrer ingenting for et svar på et senere spørsmål enn det nåværende", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    expect(await answerQuiz(setup.data, setup.courseId, "1.1", quizId, 5, 0)).toEqual({
      status: "ok",
      quizId,
      finished: false,
      feedbackPosition: null,
    });
    expect(setup.data.quizItems.every((i) => i.answeredAt === null)).toBe(true);
  });

  it("avviser et svar uten gyldig alternativ", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    for (const chosen of [null, -1, 4, 1.5]) {
      expect(await answerQuiz(setup.data, setup.courseId, "1.1", quizId, 1, chosen)).toEqual({ status: "invalid" });
    }
    expect(setup.data.quizItems.every((i) => i.answeredAt === null)).toBe(true);
  });

  it("gir `notFound` for en ukjent quiz eller posisjon", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    expect(await answerQuiz(setup.data, setup.courseId, "1.1", "ukjent", 1, 0)).toEqual({ status: "notFound" });
    expect(await answerQuiz(setup.data, setup.courseId, "1.1", quizId, 11, 0)).toEqual({ status: "notFound" });
    // En quiz på et annet delkapittel finnes ikke her.
    expect(await answerQuiz(setup.data, setup.courseId, "1.2", quizId, 1, 0)).toEqual({ status: "notFound" });
  });

  it("beholder svaret når erstatningen ikke kan lagres", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    const position = positionWithCandidate(setup.data, quizId);
    for (let i = 1; i < position; i++) await answer(setup, true);
    const { item } = await current(setup);
    setup.data.replaceWritesDown = true;
    expect(await answerQuiz(setup.data, setup.courseId, "1.1", quizId, position, (item.correctIndex + 1) % 4)).toEqual({
      status: "unavailable",
    });
    expect(activeItems(setup.data, quizId)[position - 1]).toMatchObject({ correct: false, answeredAt: expect.any(String) });
  });

  it("avslutter quizen ved neste start når resultatet ikke ble lagret", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    for (let i = 0; i < 9; i++) await answer(setup, true);
    setup.data.resultWritesDown = true;
    const { item } = await current(setup);
    expect(await answerQuiz(setup.data, setup.courseId, "1.1", quizId, 10, item.correctIndex)).toEqual({
      status: "unavailable",
    });
    expect(await getQuiz(setup.data, setup.courseId, "1.1")).toMatchObject({ stage: "unfinished", quizId });
    setup.data.resultWritesDown = false;
    expect(await startQuiz(setup.data, setup.courseId, "1.1")).toEqual({ status: "ok", quizId, finished: true });
    expect(setup.data.quizzes[0]).toMatchObject({ status: "ferdig", correctCount: 10, total: 10 });
  });
});

describe("samtidige forespørsler", () => {
  it("fortsetter quizen en annen forespørsel startet, når createQuiz gir `duplicate`", async () => {
    const setup = await imported();
    const original = setup.data.createQuiz.bind(setup.data);
    // Den andre forespørselen rekker å lage quizen først.
    setup.data.createQuiz = async (input) => {
      await original(input);
      return { status: "duplicate" };
    };
    const result = await startQuiz(setup.data, setup.courseId, "1.1", seeded(7));
    expect(setup.data.quizzes).toHaveLength(1);
    expect(result).toEqual({ status: "ok", quizId: setup.data.quizzes[0].id, finished: false });
  });

  it("lar det andre svaret gjelde og erstatter ingenting når answerQuizItem gir `false`", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    const position = positionWithCandidate(setup.data, quizId);
    for (let i = 1; i < position; i++) await answer(setup, true);
    const { item } = await current(setup);
    setup.data.answerQuizItem = async () => ({ status: "ok", value: false });
    expect(await answerQuiz(setup.data, setup.courseId, "1.1", quizId, position, (item.correctIndex + 1) % 4)).toEqual({
      status: "ok",
      quizId,
      finished: false,
      feedbackPosition: position,
    });
    expect(setup.data.quizItems.filter((i) => i.status === "erstattet")).toEqual([]);
  });
});

/** Tar en hel quiz på 1.1 med `correct` riktige først og resten feil, og gir quizens id. */
async function takeQuiz(setup: Setup, correct: number) {
  const quizId = await start(setup);
  for (let i = 0; i < 10; i++) await answer(setup, i < correct);
  return quizId;
}

async function resultOf(setup: Setup, quizId: string) {
  const view = await getQuiz(setup.data, setup.courseId, "1.1", { resultQuizId: quizId });
  if (view.status !== "ok" || view.stage !== "result") throw new Error(JSON.stringify(view));
  return view;
}

describe("avkrysning", () => {
  it("krysser av delkapittelet ved 8 av 10, med tidspunkt og quiz-ID", async () => {
    const setup = await imported();
    const quizId = await takeQuiz(setup, 8);
    expect(setup.data.completions).toEqual([{ subchapterId: setup.subchapterId, quizId, completedAt: expect.any(String) }]);
    expect(setup.data.completions[0].completedAt).toBe(setup.data.quizzes[0].finishedAt);
    expect(await resultOf(setup, quizId)).toMatchObject({ resultText: "8 av 10 riktige", passed: true, completedBy: "this" });
  });

  it("krysser ikke av ved 7 av 10, og resultatet sier at det er under 80 %", async () => {
    const setup = await imported();
    const quizId = await takeQuiz(setup, 7);
    expect(setup.data.completions).toEqual([]);
    expect(await resultOf(setup, quizId)).toMatchObject({ correctCount: 7, passed: false, completedBy: null });
  });

  it("lar den første avkrysningen stå når en ny quiz også har minst 80 %", async () => {
    const setup = await imported();
    const first = await takeQuiz(setup, 9);
    const before = [...setup.data.completions];
    const second = await takeQuiz(setup, 10);
    expect(setup.data.completions).toEqual(before);
    expect(setup.data.completions[0].quizId).toBe(first);
    expect(await resultOf(setup, second)).toMatchObject({ passed: true, completedBy: "earlier" });
    expect(await resultOf(setup, first)).toMatchObject({ completedBy: "this" });
  });

  it("lar avkrysningen stå når en ny quiz er under 80 %", async () => {
    const setup = await imported();
    await takeQuiz(setup, 8);
    const before = [...setup.data.completions];
    const second = await takeQuiz(setup, 3);
    expect(setup.data.completions).toEqual(before);
    expect(await resultOf(setup, second)).toMatchObject({ passed: false, completedBy: "earlier" });
  });

  it("krysser av når en avsluttet quiz fullføres med «Se resultatet»", async () => {
    const setup = await imported();
    const quizId = await start(setup);
    for (let i = 0; i < 9; i++) await answer(setup, true);
    setup.data.resultWritesDown = true;
    const { item } = await current(setup);
    await answerQuiz(setup.data, setup.courseId, "1.1", quizId, 10, (item.correctIndex + 1) % 4);
    // Feilet: verken frosset resultat eller avkrysning.
    expect(setup.data.quizzes[0].status).toBe("pågår");
    expect(setup.data.completions).toEqual([]);
    setup.data.resultWritesDown = false;
    expect(await startQuiz(setup.data, setup.courseId, "1.1")).toEqual({ status: "ok", quizId, finished: true });
    expect(setup.data.completions).toEqual([{ subchapterId: setup.subchapterId, quizId, completedAt: expect.any(String) }]);
    expect(await resultOf(setup, quizId)).toMatchObject({ correctCount: 9, completedBy: "this" });
  });

  it("gir `unavailable` når avkrysningene ikke kan leses", async () => {
    const setup = await imported();
    const quizId = await takeQuiz(setup, 8);
    setup.data.completionReadsDown = true;
    expect(await getQuiz(setup.data, setup.courseId, "1.1", { resultQuizId: quizId })).toEqual({ status: "unavailable" });
  });
});

describe("avkrysning og ny import", () => {
  it("holder 1.1 gjennomført med samme tidspunkt etter ny import med endret notat og en quiz med 3 riktige", async () => {
    const setup = await imported();
    const first = await takeQuiz(setup, 8);
    const before = structuredClone(setup.data.completions);

    const changed = kapittel1.replace(
      /^### 1\.1 .*$/m,
      (heading) => `${heading}\n\nEn ny setning i notatet.\n`,
    );
    const again = await importChapter(setup.data, changed, { courseCode: "IBE430", chapterNumber: 1 }, { content: innhold1 });
    expect(again.status).toBe("ok");
    await takeQuiz(setup, 3);

    expect(setup.data.completions).toEqual(before);
    expect(setup.data.completions[0].quizId).toBe(first);
    const overview = await listChapterOverview(setup.data, setup.courseId);
    if (overview.status !== "ok") throw new Error("utilgjengelig");
    const sub = overview.value[0].subchapters[0];
    expect([sub.number, sub.status, sub.completed]).toEqual(["1.1", "utdatert", true]);
    expect(overview.value[0].subchapters.filter((s) => s.completed)).toHaveLength(1);
  });
});
