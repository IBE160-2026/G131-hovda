import { describe, expect, it } from "vitest";
import { getSubchapterSummary, listChapterOverview } from "@/application/chapterOverview";
import demoFile from "../../../demo-data/demo.json";
import { answerQuiz, getQuiz, startQuiz } from "@/application/quiz";
import { DEMO_STATE_KEY, DemoDataSource } from "./dataSource";

const courseId = "demo-ibe430";

describe("DemoDataSource med demo-data/demo.json", () => {
  const data = new DemoDataSource(demoFile);

  it("gir IBE430 som eneste emne og som aktivt emne", async () => {
    const courses = await data.listCourses();
    expect(courses.status).toBe("ok");
    if (courses.status !== "ok") return;
    expect(courses.value.map((c) => c.code)).toEqual(["IBE430"]);
    expect(await data.getActiveCourse()).toEqual({ status: "ok", value: courses.value[0] });
    expect(await data.getCourse(courseId)).toEqual({ status: "ok", value: courses.value[0] });
    expect(await data.getCourse("x")).toEqual({ status: "ok", value: null });
  });

  it("gir kapittel 1 (1.1–1.6) og 2 (2.1), alle «klart» og ikke gjennomført", async () => {
    const overview = await listChapterOverview(data, courseId);
    expect(overview.status).toBe("ok");
    if (overview.status !== "ok") return;
    expect(overview.value.map((c) => [c.number, c.subchapters.map((s) => s.number)])).toEqual([
      [1, ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"]],
      [2, ["2.1"]],
    ]);
    const subs = overview.value.flatMap((c) => c.subchapters);
    expect(subs.every((s) => s.status === "klart" && s.summaryStatus === "klart" && !s.completed)).toBe(true);
  });

  it("gir ingen kapitler for et ukjent emne", async () => {
    expect(await listChapterOverview(data, "x")).toEqual({ status: "ok", value: [] });
  });

  it("gir sammendraget fra fila for 1.2, klart og ikke meldt", async () => {
    const result = await getSubchapterSummary(data, courseId, "1.2");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const expected = demoFile.chapters[0].subchapters.find((s) => s.number === "1.2")!;
    expect(result.subchapter.title).toBe(expected.title);
    expect(result.summary?.text).toBe(expected.summary);
    expect(result.summaryStatus).toBe("klart");
    expect(result.reported).toBe(false);
  });

  it("gir `notFound` for et ukjent delkapittel eller emne", async () => {
    expect(await getSubchapterSummary(data, courseId, "9.9")).toEqual({ status: "notFound" });
    expect(await getSubchapterSummary(data, "x", "1.2")).toEqual({ status: "notFound" });
  });

  it("gir de aktive spørsmålene i banken", async () => {
    const bank = await data.listQuizBank("demo-1.2");
    expect(bank.status === "ok" && bank.value.length).toBeGreaterThanOrEqual(20);
  });

  it("lagrer aldri emner, kapitler, sammendrag, banker, feilrapporter eller studieplaner", async () => {
    expect(await data.createCourse()).toEqual({ status: "unavailable" });
    expect(await data.setActiveCourse()).toEqual({ status: "unavailable" });
    expect(await data.saveChapter()).toEqual({ status: "unavailable" });
    expect(await data.addSummaryVersion()).toEqual({ status: "unavailable" });
    expect(await data.addQuestionBank()).toEqual({ status: "unavailable" });
    expect(await data.reportSummaryVersion()).toEqual({ status: "unavailable" });
    expect(await data.reportQuizItem()).toEqual({ status: "unavailable" });
    expect(await data.saveStudyPlan()).toEqual({ status: "unavailable" });
    expect(await data.listCourses()).toEqual({ status: "ok", value: [expect.objectContaining({ code: "IBE430" })] });
  });

  it("gir planen med de faste datoene: G₀ = 0, R₀ = alle delkapitlene og D = 8", async () => {
    const r0 = demoFile.chapters.flatMap((c) => c.subchapters).length;
    expect(await data.getStudyPlan(courseId)).toEqual({
      status: "ok",
      value: { courseId, examDate: "2026-12-10", planStart: "2026-11-30", g0: 0, r0, d: 8 },
    });
    expect(await data.getStudyPlan("x")).toEqual({ status: "ok", value: null });
    expect(data.today).toBe("2026-12-01");
  });

  it("tar demo-dagen fra fila, også for tidspunktene i besøket", async () => {
    const other = new DemoDataSource({ ...demoFile, plan: { ...demoFile.plan, today: "2026-12-03" } });
    expect(other.today).toBe("2026-12-03");
    const started = await startQuiz(other, courseId, "1.2");
    expect(started.status).toBe("ok");
    const quizzes = await other.listQuizzes("demo-1.2");
    expect(quizzes.status === "ok" && quizzes.value[0].createdAt).toBe("2026-12-03T00:00:00.000Z");
  });

  it("bruker den faste demo-dagen når fila er ugyldig", () => {
    expect(new DemoDataSource(null).today).toBe("2026-12-01");
  });
});

/** Et lager i minnet, som `sessionStorage` i én fane. */
class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

/** Et fast, stokkende `random`, så testene er deterministiske. */
function seeded(seed = 7) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

/** Starter en quiz på `nummer` og svarer på alle spørsmålene, riktig der `answers` er sann. */
async function takeQuiz(data: DemoDataSource, nummer: string, answers: boolean[], random = seeded()) {
  const started = await startQuiz(data, courseId, nummer, random);
  if (started.status !== "ok") throw new Error(started.status);
  for (const right of answers) await answerCurrent(data, nummer, started.quizId, right);
  return started.quizId;
}

async function answerCurrent(data: DemoDataSource, nummer: string, quizId: string, right: boolean) {
  const view = await getQuiz(data, courseId, nummer);
  if (view.status !== "ok" || view.stage !== "question") throw new Error("ingen spørsmål");
  const { position, correctIndex } = view.item;
  return answerQuiz(data, courseId, nummer, quizId, position, right ? correctIndex : (correctIndex + 1) % 4);
}

const progressOf = async (data: DemoDataSource) => {
  const overview = await listChapterOverview(data, courseId);
  if (overview.status !== "ok") throw new Error(overview.status);
  return overview.value.flatMap((c) => c.subchapters).filter((s) => s.completed).length;
};

describe("quizen i demoen", () => {
  it("går gjennom de uendrede brukstilfellene, og 8 av 10 krysser av delkapittelet", async () => {
    const data = new DemoDataSource(demoFile, new MemoryStorage());
    const quizId = await takeQuiz(data, "1.2", [true, true, false, true, true, true, true, true, false, true]);
    const view = await getQuiz(data, courseId, "1.2", { resultQuizId: quizId });
    expect(view.status === "ok" && view.stage === "result" && [view.resultText, view.completedBy]).toEqual([
      "8 av 10 riktige",
      "this",
    ]);
    expect(await progressOf(data)).toBe(1);
  });

  it("bytter et gjenstående spørsmål mot et om samme tema ved feil svar", async () => {
    const data = new DemoDataSource(demoFile);
    const started = await startQuiz(data, courseId, "1.2", seeded());
    if (started.status !== "ok") throw new Error(started.status);
    await answerCurrent(data, "1.2", started.quizId, true);
    await answerCurrent(data, "1.2", started.quizId, true);
    await answerCurrent(data, "1.2", started.quizId, false);
    const quizzes = await data.listQuizzes("demo-1.2");
    if (quizzes.status !== "ok") throw new Error(quizzes.status);
    const items = quizzes.value[0].items;
    const replaced = items.find((i) => i.status === "erstattet")!;
    const wrong = items.find((i) => i.position === 3)!;
    const replacement = items.find((i) => i.status === "aktiv" && i.position === replaced.position)!;
    expect(replaced.position).toBeGreaterThan(3);
    expect(replacement.question.themeId).toBe(wrong.question.themeId);
    expect(items.filter((i) => i.status === "aktiv")).toHaveLength(10);
  });

  it("gir ingen avkrysning ved 7 av 10", async () => {
    const data = new DemoDataSource(demoFile);
    const quizId = await takeQuiz(data, "1.2", [...Array(7).fill(true), false, false, false]);
    const view = await getQuiz(data, courseId, "1.2", { resultQuizId: quizId });
    expect(view.status === "ok" && view.stage === "result" && [view.resultText, view.passed, view.completedBy]).toEqual([
      "7 av 10 riktige",
      false,
      null,
    ]);
    expect(await data.listCompletions(["demo-1.2"])).toEqual({ status: "ok", value: [] });
  });

  it("følger reglene i `MemoryDataSource`: `duplicate`, `false` og samme tidspunkt for elementene", async () => {
    const data = new DemoDataSource(demoFile);
    const ids = demoFile.chapters[0].subchapters[1].questions.slice(0, 10).map((q) => q.id);
    const created = await data.createQuiz({ subchapterId: "demo-1.2", questionIds: ids });
    if (created.status !== "ok") throw new Error(created.status);
    expect(new Set(created.value.items.map((i) => i.createdAt)).size).toBe(1);
    expect(created.value.items.map((i) => i.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(await data.createQuiz({ subchapterId: "demo-1.2", questionIds: ids })).toEqual({ status: "duplicate" });

    const [item] = created.value.items;
    expect(await data.answerQuizItem(item.id, 0, true)).toEqual({ status: "ok", value: true });
    expect(await data.answerQuizItem(item.id, 1, false)).toEqual({ status: "ok", value: false });
    expect(await data.replaceQuizItem(item.id, ids[0])).toEqual({ status: "ok", value: false });
    expect(await data.answerQuizItem("x", 0, true)).toEqual({ status: "ok", value: false });

    const result = { correctCount: 9, carryThemeId: null, completes: true };
    expect(await data.saveQuizResult(created.value.id, result)).toEqual({ status: "ok", value: true });
    expect(await data.saveQuizResult(created.value.id, result)).toEqual({ status: "ok", value: false });
    const first = await data.listCompletions(["demo-1.2", "demo-1.1"]);

    // En ny bestått quiz endrer ikke den første avkrysningen.
    const again = await data.createQuiz({ subchapterId: "demo-1.2", questionIds: ids });
    if (again.status !== "ok") throw new Error(again.status);
    await data.saveQuizResult(again.value.id, result);
    expect(await data.listCompletions(["demo-1.2"])).toEqual(first);
    expect(first.status === "ok" && first.value.map((c) => c.quizId)).toEqual([created.value.id]);

    const quizzes = await data.listQuizzes("demo-1.2");
    expect(quizzes.status === "ok" && quizzes.value.map((q) => q.id)).toEqual([again.value.id, created.value.id]);
    expect(quizzes.status === "ok" && quizzes.value[1].total).toBe(10);
  });

  it("gir `unavailable` for spørsmål eller delkapitler som ikke finnes i fila", async () => {
    const data = new DemoDataSource(demoFile);
    expect(await data.createQuiz({ subchapterId: "x", questionIds: [] })).toEqual({ status: "unavailable" });
    expect(await data.createQuiz({ subchapterId: "demo-1.2", questionIds: ["demo-1.1-q01"] })).toEqual({
      status: "unavailable",
    });
  });

  it("fortsetter på samme spørsmål med de samme spørsmålene og svarene etter omlasting", async () => {
    const storage = new MemoryStorage();
    const before = new DemoDataSource(demoFile, storage);
    const started = await startQuiz(before, courseId, "1.3", seeded());
    if (started.status !== "ok") throw new Error(started.status);
    for (const right of [true, false, true, true]) await answerCurrent(before, "1.3", started.quizId, right);
    expect(storage.values.has(DEMO_STATE_KEY)).toBe(true);

    const after = new DemoDataSource(demoFile, storage);
    expect(await after.listQuizzes("demo-1.3")).toEqual(await before.listQuizzes("demo-1.3"));
    const view = await getQuiz(after, courseId, "1.3");
    expect(view.status === "ok" && view.stage === "question" && view.item.number).toBe(5);
    // Skrivinger etter omlasting kommer etter de gamle.
    await answerCurrent(after, "1.3", started.quizId, true);
    const quizzes = await after.listQuizzes("demo-1.3");
    if (quizzes.status !== "ok") throw new Error(quizzes.status);
    const answeredAt = quizzes.value[0].items.flatMap((i) => (i.answeredAt ? [i.answeredAt] : [])).sort();
    expect(answeredAt).toHaveLength(5);
    expect(new Set(answeredAt).size).toBe(5);
  });

  it("starter tomt i en ny fane: ingen quizer og ingen avkrysning", async () => {
    const data = new DemoDataSource(demoFile, new MemoryStorage());
    expect(await data.listQuizzes("demo-1.2")).toEqual({ status: "ok", value: [] });
    expect(await data.listCompletions(["demo-1.2"])).toEqual({ status: "ok", value: [] });
    expect(await progressOf(data)).toBe(0);
  });

  it.each([
    ["ugyldig JSON", "{ikke json"],
    ["en annen versjon", JSON.stringify({ version: 2, tick: 0, nextId: 1, quizzes: [], items: [], completions: [] })],
    ["feil form", JSON.stringify({ version: 1, tick: 0, nextId: 1, quizzes: {}, items: [], completions: [] })],
    ["null", "null"],
  ])("gir en ny, tom tilstand for %s i lageret", async (_name, raw) => {
    const storage = new MemoryStorage();
    storage.setItem(DEMO_STATE_KEY, raw);
    const data = new DemoDataSource(demoFile, storage);
    expect(await data.listQuizzes("demo-1.2")).toEqual({ status: "ok", value: [] });
    expect(await data.listCompletions(["demo-1.2"])).toEqual({ status: "ok", value: [] });
    // Demoen virker videre og skriver over den ødelagte tilstanden.
    await takeQuiz(data, "1.2", Array(10).fill(true));
    expect(await progressOf(new DemoDataSource(demoFile, storage))).toBe(1);
  });

  it("gir en ny, tom tilstand når lageret viser til ID-er som ikke finnes i demofila", async () => {
    const storage = new MemoryStorage();
    await takeQuiz(new DemoDataSource(demoFile, storage), "1.2", Array(10).fill(true));
    const saved = storage.getItem(DEMO_STATE_KEY)!;
    for (const raw of [
      saved.replaceAll("demo-1.2-q", "ukjent-q"),
      saved.replaceAll('"demo-1.2"', '"demo-9.9"'),
      saved.replace(/"quizId":"[^"]+"/, '"quizId":"ukjent"'),
    ]) {
      storage.setItem(DEMO_STATE_KEY, raw);
      const data = new DemoDataSource(demoFile, storage);
      expect(await data.listQuizzes("demo-1.2")).toEqual({ status: "ok", value: [] });
      expect(await progressOf(data)).toBe(0);
    }
  });

  it("virker i minnet når lageret kaster", async () => {
    const throwing = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const data = new DemoDataSource(demoFile, throwing);
    const quizId = await takeQuiz(data, "1.2", Array(10).fill(true));
    const view = await getQuiz(data, courseId, "1.2", { resultQuizId: quizId });
    expect(view.status === "ok" && view.stage === "result" && view.resultText).toBe("10 av 10 riktige");
    expect(await progressOf(data)).toBe(1);
  });

  it("gir spørsmålene igjen i en annen rekkefølge når banken på 20 er brukt opp", async () => {
    const data = new DemoDataSource(demoFile);
    const random = seeded(11);
    const order = async () => {
      const quizId = await takeQuiz(data, "1.4", Array(10).fill(true), random);
      const quizzes = await data.listQuizzes("demo-1.4");
      if (quizzes.status !== "ok") throw new Error(quizzes.status);
      return quizzes.value.find((q) => q.id === quizId)!.items.map((i) => i.question.id);
    };
    const first = await order();
    const second = await order();
    expect(new Set([...first, ...second]).size).toBe(20);
    const third = await order();
    expect([...third].sort()).toEqual([...first].sort());
    expect(third).not.toEqual(first);
  });

  it("gir `unavailable` på quizen når fila er ugyldig", async () => {
    const data = new DemoDataSource({ ...demoFile, schemaVersion: 99 }, new MemoryStorage());
    expect(await data.listQuizzes("demo-1.2")).toEqual({ status: "unavailable" });
    expect(await data.listCompletions(["demo-1.2"])).toEqual({ status: "unavailable" });
    expect(await data.createQuiz({ subchapterId: "demo-1.2", questionIds: [] })).toEqual({ status: "unavailable" });
  });
});

describe("DemoDataSource med en ugyldig fil", () => {
  const data = new DemoDataSource({ ...demoFile, schemaVersion: 99 });

  it("gir `unavailable` på alle lesinger", async () => {
    const unavailable = { status: "unavailable" };
    expect(await data.listCourses()).toEqual(unavailable);
    expect(await data.getCourse(courseId)).toEqual(unavailable);
    expect(await data.getActiveCourse()).toEqual(unavailable);
    expect(await data.listChapters(courseId)).toEqual(unavailable);
    expect(await data.listSummaryVersions(["demo-1.2"])).toEqual(unavailable);
    expect(await data.listQuestionBanks(["demo-1.2"])).toEqual(unavailable);
    expect(await data.listQuizBank("demo-1.2")).toEqual(unavailable);
    expect(await data.getStudyPlan(courseId)).toEqual(unavailable);
    expect(await listChapterOverview(data, courseId)).toEqual(unavailable);
    expect(await getSubchapterSummary(data, courseId, "1.2")).toEqual(unavailable);
  });

  it("gir `unavailable` for noe som ikke er en demofil", async () => {
    expect(await new DemoDataSource(null).listCourses()).toEqual({ status: "unavailable" });
  });
});
