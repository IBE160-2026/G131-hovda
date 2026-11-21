/// <reference types="vite/client" />
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import innhold1 from "../../../../../../../../G131-hovda/notater/IBE430/kapittel-1.innhold.md?raw";
import kapittel1 from "../../../../../../../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import { importChapter } from "@/application/importChapter";
import { answerQuiz, startQuiz } from "@/application/quiz";
import { MemoryDataSource } from "@/application/testing/MemoryDataSource";

const getDataSourceForRender = vi.fn();
vi.mock("@/composition/server", () => ({ getDataSourceForRender, getDataSource: vi.fn() }));

const { QuizContent } = await import("./page");
const {
  alreadyCompletedMessage,
  belowThresholdMessage,
  chooseAnswerMessage,
  completedMessage,
  correctAnswerMessage,
  newQuizLabel,
  quizNotReadyMessage,
  subchapterNotFoundMessage,
  tooFewQuestionsMessage,
  unavailableMessage,
  wrongAnswerMessage,
} = await import("../../../../formState");

async function render(data: MemoryDataSource, id: string, nummer: string, query: Record<string, string> = {}) {
  getDataSourceForRender.mockResolvedValue(data);
  return renderToStaticMarkup(
    await QuizContent({ params: Promise.resolve({ id, nummer }), searchParams: Promise.resolve(query) }),
  );
}

async function imported(content: string | null = innhold1) {
  const data = new MemoryDataSource();
  const created = await data.createCourse({ code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "", examForm: "" });
  if (created.status !== "ok") throw new Error("emnet ble ikke opprettet");
  const result = await importChapter(data, kapittel1, { courseCode: "IBE430", chapterNumber: 1 }, { content });
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  return { data, courseId: created.value.id };
}

/** Starter en quiz på 1.1 og svarer på de første spørsmålene, riktig eller feil. */
async function quizWith(answers: boolean[]) {
  const { data, courseId } = await imported();
  const started = await startQuiz(data, courseId, "1.1");
  if (started.status !== "ok") throw new Error(started.status);
  for (const right of answers) {
    const quiz = data.quizzes[0];
    const item = data.quizItems
      .filter((i) => i.quizId === quiz.id && i.status === "aktiv" && i.answeredAt === null)
      .sort((a, b) => a.position - b.position)[0];
    const correct = data.quizQuestions.find((q) => q.id === item.questionId)!.correctIndex;
    await answerQuiz(data, courseId, "1.1", quiz.id, item.position, right ? correct : (correct + 1) % 4);
  }
  return { data, courseId, quizId: started.quizId };
}

describe("quizsiden", () => {
  beforeEach(() => getDataSourceForRender.mockReset());

  it("viser startknappen når ingen quiz er i gang", async () => {
    const { data, courseId } = await imported();
    const html = await render(data, courseId, "1.1");
    expect(html).toContain("Start quizen");
    expect(html).toContain("<h1");
    expect(html).toContain("Det moderne globale forretningsmiljøet");
  });

  it("viser spørsmål 1 av 10 som en gruppe med fire radioknapper", async () => {
    const { data, courseId } = await quizWith([]);
    const html = await render(data, courseId, "1.1");
    expect(html).toContain("<fieldset");
    expect(html).toContain("<legend");
    expect(html).toContain("Spørsmål 1 av 10");
    expect(html.match(/type="radio"/g)).toHaveLength(4);
    expect(html.match(/name="svar"/g)).toHaveLength(4);
    expect(html).toContain("Svar</button>");
    // Riktig svar og forklaring står ikke på siden før eieren har svart.
    const question = data.quizQuestions.find((q) => q.id === data.quizItems[0].questionId)!;
    expect(html).not.toContain(question.explanation);
  });

  it("fortsetter på neste ubesvarte spørsmål når siden lastes på nytt", async () => {
    const { data, courseId } = await quizWith([true, true, true]);
    expect(await render(data, courseId, "1.1")).toContain("Spørsmål 4 av 10");
  });

  it("viser «Riktig!» og forklaringen etter et riktig svar, og lenken til neste spørsmål", async () => {
    const { data, courseId } = await quizWith([true]);
    const html = await render(data, courseId, "1.1", { svar: "1" });
    const question = data.quizQuestions.find((q) => q.id === data.quizItems[0].questionId)!;
    expect(html).toContain(correctAnswerMessage);
    expect(html).toContain(question.explanation);
    expect(html).toContain("Neste spørsmål");
    expect(html).toContain(`href="/emner/${courseId}/delkapitler/1.1/quiz"`);
  });

  it("viser riktig svar og forklaringen etter et feil svar", async () => {
    const { data, courseId } = await quizWith([false]);
    const html = await render(data, courseId, "1.1", { svar: "1" });
    const question = data.quizQuestions.find((q) => q.id === data.quizItems[0].questionId)!;
    expect(html).toContain(wrongAnswerMessage);
    expect(html).toContain("Riktig svar: ");
    expect(html).toContain(question.options[question.correctIndex]);
    expect(html).toContain(question.explanation);
  });

  it("viser og beholder resultatet når quizen er ferdig", async () => {
    const answers = [true, false, true, true, false, true, true, true, true, true];
    const { data, courseId, quizId } = await quizWith(answers);
    const html = await render(data, courseId, "1.1", { resultat: quizId });
    expect(html).toContain("8 av 10 riktige");
    expect(html).toContain("Spørsmål 10 av 10");
    expect(html).toContain(correctAnswerMessage);
    expect(html).toContain("Tilbake til sammendraget");
    // Uten parameter vises startsiden for en ny quiz.
    expect(await render(data, courseId, "1.1")).toContain("Start quizen");
  });

  it("sier at delkapittelet er krysset av ved 8 av 10, uten tilbud om ny quiz", async () => {
    const { data, courseId, quizId } = await quizWith([...Array(8).fill(true), false, false]);
    const html = await render(data, courseId, "1.1", { resultat: quizId });
    expect(html).toContain("8 av 10 riktige");
    expect(html).toContain(completedMessage);
    expect(html).not.toContain(alreadyCompletedMessage);
    expect(html).not.toContain(belowThresholdMessage);
    expect(html).not.toContain(newQuizLabel);
  });

  it("tilbyr sammendraget og en ny quiz under 80 %, uten avkrysning", async () => {
    const { data, courseId, quizId } = await quizWith([...Array(7).fill(true), false, false, false]);
    const html = await render(data, courseId, "1.1", { resultat: quizId });
    expect(html).toContain("7 av 10 riktige");
    expect(html).toContain(belowThresholdMessage);
    expect(html).toContain(`${newQuizLabel}</button>`);
    expect(html).toContain(`href="/emner/${courseId}/delkapitler/1.1"`);
    expect(html).toContain("Les sammendraget igjen");
    expect(html).not.toContain(completedMessage);
    expect(html).not.toContain(alreadyCompletedMessage);
  });

  it("sier at delkapittelet alt er gjennomført, også med tilbudet under 80 %", async () => {
    const { data, courseId } = await quizWith(Array(10).fill(true));
    // En ny quiz på samme delkapittel med 3 riktige.
    const again = await startQuiz(data, courseId, "1.1");
    if (again.status !== "ok") throw new Error(again.status);
    for (let i = 0; i < 10; i++) {
      const item = data.quizItems
        .filter((x) => x.quizId === again.quizId && x.status === "aktiv" && x.answeredAt === null)
        .sort((a, b) => a.position - b.position)[0];
      const correct = data.quizQuestions.find((q) => q.id === item.questionId)!.correctIndex;
      await answerQuiz(data, courseId, "1.1", again.quizId, item.position, i < 3 ? correct : (correct + 1) % 4);
    }
    const html = await render(data, courseId, "1.1", { resultat: again.quizId });
    expect(html).toContain("3 av 10 riktige");
    expect(html).toContain(alreadyCompletedMessage);
    expect(html).toContain(belowThresholdMessage);
    expect(html).not.toContain(completedMessage);
  });

  it("viser feilmeldingen når avkrysningene ikke kan leses", async () => {
    const { data, courseId, quizId } = await quizWith(Array(10).fill(true));
    data.completionReadsDown = true;
    const html = await render(data, courseId, "1.1", { resultat: quizId });
    expect(html).toContain(unavailableMessage);
    expect(html).toContain('role="alert"');
  });

  it("viser «Se resultatet» når alle er besvart, men resultatet ikke ble lagret", async () => {
    const { data, courseId } = await imported();
    data.resultWritesDown = true;
    const started = await startQuiz(data, courseId, "1.1");
    if (started.status !== "ok") throw new Error(started.status);
    for (let i = 0; i < 10; i++) {
      const item = data.quizItems
        .filter((x) => x.status === "aktiv" && x.answeredAt === null)
        .sort((a, b) => a.position - b.position)[0];
      const correct = data.quizQuestions.find((q) => q.id === item.questionId)!.correctIndex;
      await answerQuiz(data, courseId, "1.1", started.quizId, item.position, correct);
    }
    const html = await render(data, courseId, "1.1");
    expect(html).toContain("Alle spørsmålene er besvart.");
    expect(html).toContain("Se resultatet");
    expect(html).not.toContain('type="radio"');
  });

  it("ber eieren velge et svar", async () => {
    const { data, courseId } = await quizWith([]);
    const html = await render(data, courseId, "1.1", { feil: "valg" });
    expect(html).toContain(chooseAnswerMessage);
    expect(html).toContain('role="alert"');
  });

  it("sier fra når banken har for få spørsmål", async () => {
    const { data, courseId } = await imported();
    const own = data.quizQuestions.filter((q) => q.subchapterId === data.chapters[0].subchapters[0].id);
    for (const q of own.slice(9)) q.status = "trukket";
    const html = await render(data, courseId, "1.1");
    expect(html).toContain(tooFewQuestionsMessage);
    expect(html).not.toContain("Start quizen");
  });

  it("sier fra når delkapittelet ikke har quiz ennå", async () => {
    const { data, courseId } = await imported(null);
    const html = await render(data, courseId, "1.1");
    expect(html).toContain(quizNotReadyMessage);
    expect(html).not.toContain("Start quizen");
  });

  it("viser «Fant ikke delkapittelet.» for ukjent emne eller nummer", async () => {
    const { data, courseId } = await imported();
    for (const [id, nummer] of [
      ["ukjent", "1.1"],
      [courseId, "9.9"],
    ]) {
      const html = await render(data, id, nummer);
      expect(html).toContain(subchapterNotFoundMessage);
      expect(html).toContain('href="/start"');
    }
  });

  it("viser feilmeldingen når databasen ikke svarer", async () => {
    const { data, courseId } = await quizWith([true]);
    data.quizReadsDown = true;
    const html = await render(data, courseId, "1.1");
    expect(html).toContain(unavailableMessage);
    expect(html).toContain('role="alert"');
    data.quizReadsDown = false;
    const failed = await render(data, courseId, "1.1", { feil: "1" });
    expect(failed).toContain(unavailableMessage);
    expect(failed).toContain("Spørsmål 2 av 10");
  });
});
