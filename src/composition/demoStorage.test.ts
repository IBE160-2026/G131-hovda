// `getDemo()` speiler quiztilstanden til `window.sessionStorage`, og virker i minnet når den ikke kan nås.
import { afterEach, describe, expect, it, vi } from "vitest";
import { startQuiz } from "@/application/quiz";

const STATE_KEY = "studievenn-demo";

/** En ny `getDemo` med `window` slik testen har satt den. */
async function freshGetDemo() {
  vi.resetModules();
  return (await import("./demo")).getDemo;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("getDemo i nettleseren", () => {
  it("lagrer tilstanden i `sessionStorage`", async () => {
    const values = new Map<string, string>();
    const sessionStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
    vi.stubGlobal("window", { sessionStorage });
    const getDemo = await freshGetDemo();
    const started = await startQuiz(getDemo().data, "demo-ibe430", "1.2");
    expect(started.status).toBe("ok");
    expect(values.has(STATE_KEY)).toBe(true);
  });

  it("virker i minnet når `sessionStorage` kaster", async () => {
    vi.stubGlobal("window", {
      get sessionStorage(): Storage {
        throw new Error("SecurityError");
      },
    });
    const getDemo = await freshGetDemo();
    const data = getDemo().data;
    const started = await startQuiz(data, "demo-ibe430", "1.2");
    expect(started.status).toBe("ok");
    const quizzes = await data.listQuizzes("demo-1.2");
    expect(quizzes.status === "ok" && quizzes.value).toHaveLength(1);
  });
});
