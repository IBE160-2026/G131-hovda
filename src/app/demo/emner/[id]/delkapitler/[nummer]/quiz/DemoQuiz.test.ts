// Handlingene i demoquizen gir de samme adressene som `quiz/actions.ts` i appen.
import { describe, expect, it } from "vitest";
import type { DataSource } from "@/application/dataSource";
import { getQuiz } from "@/application/quiz";
import { createDemo } from "@/composition/demo";
import demoFile from "../../../../../../../../demo-data/demo.json";
import { answerDemoQuiz, startDemoQuiz } from "./DemoQuiz";

const id = "demo-ibe430";
const path = "/demo/emner/demo-ibe430/delkapitler/1.2/quiz";

function choice(value: string | null) {
  const form = new FormData();
  if (value !== null) form.set("svar", value);
  return form;
}

/** Det nåværende spørsmålet og riktig og feil svar på det. */
async function current(data: DataSource) {
  const view = await getQuiz(data, id, "1.2");
  if (view.status !== "ok" || view.stage !== "question") throw new Error("ingen spørsmål");
  const { position, correctIndex, options } = view.item;
  return { quizId: view.quizId, position, right: String(correctIndex), wrong: String((correctIndex + 1) % options.length) };
}

describe("handlingene i demoquizen", () => {
  it("går til quizen når den startes, og til samme quiz når den alt er i gang", async () => {
    const data = createDemo(demoFile).data;
    expect(await startDemoQuiz(data, id, "1.2")).toBe(path);
    expect(await startDemoQuiz(data, id, "1.2")).toBe(path);
  });

  it("viser tilbakemeldingen med `?svar=<posisjon>` etter et feil svar", async () => {
    const data = createDemo(demoFile).data;
    await startDemoQuiz(data, id, "1.2");
    const { quizId, position, wrong } = await current(data);
    expect(await answerDemoQuiz(data, id, "1.2", quizId, position, choice(wrong))).toBe(`${path}?svar=${position}`);
  });

  it("viser resultatet med `?resultat=<id>` etter siste svar", async () => {
    const data = createDemo(demoFile).data;
    await startDemoQuiz(data, id, "1.2");
    let url = "";
    for (let i = 0; i < 10; i++) {
      const { quizId, position, right } = await current(data);
      url = await answerDemoQuiz(data, id, "1.2", quizId, position, choice(right));
      if (i < 9) expect(url).toBe(`${path}?svar=${position}`);
      else expect(url).toBe(`${path}?resultat=${encodeURIComponent(quizId)}`);
    }
  });

  it("ber om et svar med `?feil=valg` når `svar` er tomt eller mangler", async () => {
    const data = createDemo(demoFile).data;
    await startDemoQuiz(data, id, "1.2");
    const { quizId, position } = await current(data);
    for (const value of [null, "", " "]) {
      expect(await answerDemoQuiz(data, id, "1.2", quizId, position, choice(value))).toBe(`${path}?feil=valg`);
    }
  });

  it("gir `?feil=1` når demofila er ugyldig", async () => {
    const broken = createDemo({ ...demoFile, schemaVersion: 99 }).data;
    expect(await startDemoQuiz(broken, id, "1.2")).toBe(`${path}?feil=1`);
    expect(await answerDemoQuiz(broken, id, "1.2", "demo-z1", 1, choice("0"))).toBe(`${path}?feil=1`);
  });
});
