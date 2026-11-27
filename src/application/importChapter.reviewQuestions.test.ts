/// <reference types="vite/client" />
// Gjennomgangsspørsmålene i importen (story 4.1). De kommer fra `## Gjennomgangsspørsmål` i notatfila.
import { describe, expect, it } from "vitest";
import kapittel1 from "../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import { importChapter, importMessages, reportImport } from "./importChapter";
import { MemoryDataSource } from "./testing/MemoryDataSource";

const target = { courseCode: "IBE430", chapterNumber: 1 };

/** Notatfil med ett delkapittel og `review` som innholdet i `## Gjennomgangsspørsmål`, eller uten seksjonen. */
function notesFile(review: string | null) {
  const section = review === null ? "" : `\n## Gjennomgangsspørsmål\n\nInnledning.\n\n${review}\n`;
  return `---\nemne: IBE430\nkapittel: 1\ntittel: "Kapittel én"\n---\n\n## Fordelt på delkapitler\n\n### 1.1 En\n\nNotat en\n${section}`;
}

async function setup() {
  const data = new MemoryDataSource();
  await data.createCourse({ code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "", examForm: "" });
  return data;
}

async function run(data: MemoryDataSource, notes: string) {
  const result = await importChapter(data, notes, target);
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  return result;
}

async function active(data: MemoryDataSource) {
  const listed = await data.listReviewQuestions(data.chapters[0].id);
  if (listed.status !== "ok") throw new Error("utilgjengelig");
  return listed.value.filter((q) => q.status === "aktiv");
}

describe("importChapter med gjennomgangsspørsmål", () => {
  it("lagrer 29 aktive spørsmål i rekkefølge for kapittel 1 ved første import", async () => {
    const data = await setup();
    const result = await run(data, kapittel1);
    expect(result.reviewQuestions).toEqual({ status: "synced", active: 29, added: 29, retired: 0 });
    const questions = await active(data);
    expect(questions.map((q) => q.position)).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
    expect(questions[0]).toMatchObject({ chapterId: data.chapters[0].id, text: "Hva er årsaken til økt global konkurranse?" });
    expect(reportImport(result).stdout).toContain("Gjennomgangsspørsmål: 29 (29 nye)");
  });

  it("gir ingen nye rader og samme ID-er ved ny kjøring med samme fil", async () => {
    const data = await setup();
    await run(data, kapittel1);
    const before = await active(data);
    const again = await run(data, kapittel1);
    expect(again.reviewQuestions).toEqual({ status: "synced", active: 29, added: 0, retired: 0 });
    expect(data.reviewQuestions).toHaveLength(29);
    expect(await active(data)).toEqual(before);
    const { stdout } = reportImport(again);
    expect(stdout).toContain("Gjennomgangsspørsmål: 29 (uendret)");
    expect(stdout).toContain(importMessages.allUnchanged);
  });

  it("lager et nytt spørsmål og trekker tilbake det gamle når teksten er endret", async () => {
    const data = await setup();
    await run(data, notesFile("1. En?\n2. To?\n3. Tre?\n4. Fire?"));
    const [, , , four] = await active(data);
    const result = await run(data, notesFile("1. En?\n2. To?\n3. Tre?\n4. Fire, omformulert?"));
    expect(result.reviewQuestions).toEqual({ status: "synced", active: 4, added: 1, retired: 1 });
    const now = await active(data);
    expect(now.map((q) => q.text)).toEqual(["En?", "To?", "Tre?", "Fire, omformulert?"]);
    expect(now[3].id).not.toBe(four.id);
    expect(data.reviewQuestions.find((q) => q.id === four.id)).toMatchObject({ status: "trukket", retiredAt: expect.any(String) });
    const { stdout } = reportImport(result);
    expect(stdout).toContain("Gjennomgangsspørsmål: 4 (1 nytt, 1 trukket tilbake)");
    expect(stdout).not.toContain(importMessages.allUnchanged);
  });

  it("gjenkjenner spørsmålet når bare store/små bokstaver eller mellomrom er endret, og flytter det", async () => {
    const data = await setup();
    await run(data, notesFile("1. Forklar de ulike flytene.\n2. Hva er en kontoplan?"));
    const [flows, chart] = await active(data);
    const result = await run(data, notesFile("1. Hva er en kontoplan?\n2. forklar  de ulike flytene."));
    expect(result.reviewQuestions).toEqual({ status: "synced", active: 2, added: 0, retired: 0 });
    const now = await active(data);
    expect(now.map((q) => [q.id, q.position, q.text])).toEqual([
      [chart.id, 1, "Hva er en kontoplan?"],
      [flows.id, 2, "forklar  de ulike flytene."],
    ]);
    expect(data.reviewQuestions).toHaveLength(2);
  });

  it("gjør et tilbaketrukket spørsmål aktivt igjen med samme ID når det kommer tilbake", async () => {
    const data = await setup();
    await run(data, notesFile("1. En?\n2. To?"));
    const [, two] = await active(data);
    await run(data, notesFile("1. En?"));
    const result = await run(data, notesFile("1. En?\n2. To?"));
    expect(result.reviewQuestions).toEqual({ status: "synced", active: 2, added: 1, retired: 0 });
    expect((await active(data))[1]).toEqual(two);
    expect(data.reviewQuestions).toHaveLength(2);
    expect(data.reviewQuestions.every((q) => q.retiredAt === null)).toBe(true);
  });

  it("lar lagrede spørsmål være urørt når seksjonen mangler", async () => {
    const data = await setup();
    await run(data, notesFile("1. En?\n2. To?"));
    const before = structuredClone(data.reviewQuestions);
    const result = await run(data, notesFile(null));
    expect(result.reviewQuestions).toEqual({ status: "noSection" });
    expect(data.reviewSyncs).toBe(1);
    expect(data.reviewQuestions).toEqual(before);
    expect(reportImport(result).stdout).toContain(importMessages.reviewQuestionsNoSection);
  });

  it("trekker tilbake alle når seksjonen finnes, men er uten spørsmål", async () => {
    const data = await setup();
    await run(data, notesFile("1. En?\n2. To?"));
    const result = await run(data, notesFile(""));
    expect(result.reviewQuestions).toEqual({ status: "synced", active: 0, added: 0, retired: 2 });
    expect(await active(data)).toEqual([]);
  });

  it("skriver ingenting når samme spørsmål står to ganger", async () => {
    const data = await setup();
    const result = await importChapter(data, notesFile("1. En?\n2. To?\n3. en?"), target);
    expect(result).toEqual({
      status: "invalid",
      file: "notes",
      errors: ["Linje 19: spørsmålet står to ganger (første gang på linje 17)."],
    });
    expect(data.chapters).toEqual([]);
    expect(data.reviewQuestions).toEqual([]);
  });

  it("stopper med «unavailable» når spørsmålene ikke kan lagres, og legger ikke inn mer", async () => {
    const data = await setup();
    data.reviewWritesDown = true;
    expect(await importChapter(data, kapittel1, target)).toEqual({ status: "unavailable" });
    expect(data.reviewQuestions).toEqual([]);
    expect(data.summaryVersions).toEqual([]);
  });

  it("stopper med «unavailable» når kapittelet ikke kan leses etter lagringen", async () => {
    const data = await setup();
    data.listChapters = async () => ({ status: "unavailable" });
    expect(await importChapter(data, kapittel1, target)).toEqual({ status: "unavailable" });
    expect(data.reviewQuestions).toEqual([]);
  });

  it("skriver én linje for gjennomgangsspørsmålene i kapittelet", async () => {
    const data = await setup();
    const result = await run(data, kapittel1);
    expect(reportImport(result).stdout.filter((l) => l.startsWith("Gjennomgangsspørsmål"))).toHaveLength(1);
  });
});
