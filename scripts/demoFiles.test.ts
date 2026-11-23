// CI-testen for demofila i repoet (FR-26, NFR-6, NFR-8): fila følger skjemaet, har nok spørsmål per
// delkapittel og tema, og har ingen e-post eller UUID-er. Ligger i scripts/, fordi src/application
// ikke kan lese filer (AD-1). Fila lages bare med `npm run export-demo`.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEMO_CHAPTERS,
  DEMO_MIN_PER_THEME,
  DEMO_MIN_QUESTIONS,
  validateDemoData,
  type DemoData,
} from "../src/application/demoData";

const raw = readFileSync("demo-data/demo.json", "utf8");

/** Alle tekstverdiene i fila, også nøklene. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, v]) => [key, ...strings(v)]);
  }
  return [];
}

describe("demo-data/demo.json", () => {
  const parsed: unknown = JSON.parse(raw);

  it("følger skjemaet", () => {
    const validation = validateDemoData(parsed);
    expect(validation.ok ? [] : validation.errors).toEqual([]);
  });

  it(`har minst ${DEMO_MIN_QUESTIONS} spørsmål per delkapittel og minst ${DEMO_MIN_PER_THEME} per tema`, () => {
    const demo = parsed as DemoData;
    for (const chapter of demo.chapters) {
      expect(DEMO_CHAPTERS).toContain(chapter.number);
      for (const sub of chapter.subchapters) {
        expect(sub.questions.length, sub.number).toBeGreaterThanOrEqual(DEMO_MIN_QUESTIONS);
        for (const theme of sub.themes) {
          const count = sub.questions.filter((q) => q.themeId === theme.id).length;
          expect(count, `${sub.number} ${theme.id}`).toBeGreaterThanOrEqual(DEMO_MIN_PER_THEME);
        }
      }
    }
  });

  it("har ingen tekst som ligner en e-post eller UUID", () => {
    const email = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const all = strings(parsed);
    expect(all.filter((s) => email.test(s))).toEqual([]);
    expect(all.filter((s) => uuid.test(s))).toEqual([]);
  });

  it("er skrevet med to mellomrom og linjeskift til slutt", () => {
    const text = raw.replace(/\r\n/g, "\n");
    expect(text).toBe(`${JSON.stringify(parsed, null, 2)}\n`);
  });
});
