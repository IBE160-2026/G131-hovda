/// <reference types="vite/client" />
import { beforeEach, describe, expect, it, vi } from "vitest";
import innhold1 from "../../../../../../../../G131-hovda/notater/IBE430/kapittel-1.innhold.md?raw";
import kapittel1 from "../../../../../../../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import { importChapter } from "@/application/importChapter";
import { MemoryDataSource } from "@/application/testing/MemoryDataSource";

const getDataSource = vi.fn();
vi.mock("@/composition/server", () => ({ getDataSource }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { answerQuizAction, startQuizAction } = await import("./actions");

async function imported(content: string | null = innhold1) {
  const data = new MemoryDataSource();
  const created = await data.createCourse({ code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "", examForm: "" });
  if (created.status !== "ok") throw new Error("emnet ble ikke opprettet");
  const result = await importChapter(data, kapittel1, { courseCode: "IBE430", chapterNumber: 1 }, { content });
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  getDataSource.mockResolvedValue(data);
  return { data, courseId: created.value.id };
}

function choice(value: string | null) {
  const form = new FormData();
  if (value !== null) form.set("svar", value);
  return form;
}

/** Kjører en handling og gir adressen den sender til. */
async function redirectOf(run: () => Promise<void>): Promise<string> {
  try {
    await run();
  } catch (error) {
    const match = /^redirect:(.*)$/.exec((error as Error).message);
    if (match) return match[1];
    throw error;
  }
  throw new Error("ingen redirect");
}

const path = (courseId: string) => `/emner/${courseId}/delkapitler/1.1/quiz`;

function currentItem(data: MemoryDataSource) {
  const item = data.quizItems
    .filter((i) => i.status === "aktiv" && i.answeredAt === null)
    .sort((a, b) => a.position - b.position)[0];
  return { item, correct: data.quizQuestions.find((q) => q.id === item.questionId)!.correctIndex };
}

describe("quizhandlingene", () => {
  beforeEach(() => getDataSource.mockReset());

  it("sender uinnloggede til forsiden uten å skrive noe", async () => {
    getDataSource.mockResolvedValue(null);
    expect(await redirectOf(() => startQuizAction("c1", "1.1"))).toBe("/");
    expect(await redirectOf(() => answerQuizAction("c1", "1.1", "z1", 1, choice("0")))).toBe("/");
  });

  it("starter quizen og sender til quizsiden", async () => {
    const { data, courseId } = await imported();
    expect(await redirectOf(() => startQuizAction(courseId, "1.1"))).toBe(path(courseId));
    expect(data.quizzes).toHaveLength(1);
    expect(data.quizItems).toHaveLength(10);
  });

  it("sender til tilbakemeldingen etter et svar, og til resultatet etter siste", async () => {
    const { data, courseId } = await imported();
    await redirectOf(() => startQuizAction(courseId, "1.1"));
    const quizId = data.quizzes[0].id;
    for (let position = 1; position <= 9; position++) {
      const { item, correct } = currentItem(data);
      expect(await redirectOf(() => answerQuizAction(courseId, "1.1", quizId, item.position, choice(String(correct))))).toBe(
        `${path(courseId)}?svar=${position}`,
      );
    }
    const { item, correct } = currentItem(data);
    expect(await redirectOf(() => answerQuizAction(courseId, "1.1", quizId, item.position, choice(String(correct))))).toBe(
      `${path(courseId)}?resultat=${quizId}`,
    );
    expect(data.quizzes[0]).toMatchObject({ status: "ferdig", correctCount: 10 });
  });

  it("ber om et svar når ingen alternativ er valgt", async () => {
    const { data, courseId } = await imported();
    await redirectOf(() => startQuizAction(courseId, "1.1"));
    expect(await redirectOf(() => answerQuizAction(courseId, "1.1", data.quizzes[0].id, 1, choice(null)))).toBe(
      `${path(courseId)}?feil=valg`,
    );
    expect(await redirectOf(() => answerQuizAction(courseId, "1.1", data.quizzes[0].id, 1, choice("x")))).toBe(
      `${path(courseId)}?feil=valg`,
    );
  });

  it("sender til quizsiden med feilmelding når databasen ikke svarer", async () => {
    const { data, courseId } = await imported();
    data.quizWritesDown = true;
    expect(await redirectOf(() => startQuizAction(courseId, "1.1"))).toBe(`${path(courseId)}?feil=1`);
  });

  it("sender til feilmeldingen når svaret ikke kan lagres etter starten", async () => {
    const { data, courseId } = await imported();
    await redirectOf(() => startQuizAction(courseId, "1.1"));
    data.quizWritesDown = true;
    const { item, correct } = currentItem(data);
    expect(
      await redirectOf(() => answerQuizAction(courseId, "1.1", data.quizzes[0].id, item.position, choice(String(correct)))),
    ).toBe(`${path(courseId)}?feil=1`);
    expect(data.quizItems.every((i) => i.answeredAt === null)).toBe(true);
  });

  it("sender til resultatet når start avslutter en quiz der resultatet ikke ble lagret", async () => {
    const { data, courseId } = await imported();
    await redirectOf(() => startQuizAction(courseId, "1.1"));
    const quizId = data.quizzes[0].id;
    data.resultWritesDown = true;
    for (let i = 0; i < 10; i++) {
      const { item, correct } = currentItem(data);
      await redirectOf(() => answerQuizAction(courseId, "1.1", quizId, item.position, choice(String(correct))));
    }
    expect(data.quizzes[0].status).toBe("pågår");
    data.resultWritesDown = false;
    expect(await redirectOf(() => startQuizAction(courseId, "1.1"))).toBe(`${path(courseId)}?resultat=${quizId}`);
    expect(data.quizzes[0]).toMatchObject({ status: "ferdig", correctCount: 10 });
  });

  it("sender til quizsiden, som sier fra, når delkapittelet ikke har quiz", async () => {
    const { data, courseId } = await imported(null);
    expect(await redirectOf(() => startQuizAction(courseId, "1.1"))).toBe(path(courseId));
    expect(data.quizzes).toHaveLength(0);
  });
});
