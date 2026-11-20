/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import innhold1 from "../../G131-hovda/notater/IBE430/kapittel-1.innhold.md?raw";
import kapittel1 from "../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import { getSubchapterSummary, listChapterOverview } from "./chapterOverview";
import { importChapter } from "./importChapter";
import { subchapterInputHash } from "./summaryHash";
import { MemoryDataSource } from "./testing/MemoryDataSource";

const target = { courseCode: "IBE430", chapterNumber: 1 };

async function setup() {
  const data = new MemoryDataSource();
  const created = await data.createCourse({ code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "", examForm: "" });
  if (created.status !== "ok") throw new Error("emnet ble ikke opprettet");
  return { data, courseId: created.value.id };
}

/** Importerer et lite kapittel med tre delkapitler: med sammendrag, uten sammendrag og uten notater. */
async function smallChapter() {
  const { data, courseId } = await setup();
  const notes = `---\nemne: IBE430\nkapittel: 1\ntittel: "Kapittel én"\n---\n\n## Læringsmål for kapittelet\n\n- mål\n\n## Fordelt på delkapitler\n\n### 1.1 En\n\nNotat en\n\n### 1.2 To\n\nNotat to\n\n### 1.3 Tre\n\n*Ingen notater ennå.*\n`;
  const result = await importChapter(data, notes, target);
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  const [sub1] = data.chapters[0].subchapters;
  await data.addSummaryVersion({
    subchapterId: sub1.id,
    status: "klart",
    text: "Sammendrag av 1.1.",
    modelId: "claude-code/test",
    promptVersion: "innhold.v1",
    inputHash: await subchapterInputHash({ learningGoals: "- mål", keyConcepts: "" }, "Notat en"),
  });
  return { data, courseId };
}

const statuses = (chapters: { subchapters: { number: string; status: string }[] }[]) =>
  chapters.flatMap((c) => c.subchapters.map((s) => [s.number, s.status]));

describe("listChapterOverview", () => {
  it("gir «klart» for 1.1–1.6 etter import av IBE430 kapittel 1 med innholdsfilen", async () => {
    const { data, courseId } = await setup();
    const result = await importChapter(data, kapittel1, target, { content: innhold1 });
    expect(result.status).toBe("ok");
    const overview = await listChapterOverview(data, courseId);
    if (overview.status !== "ok") throw new Error("utilgjengelig");
    expect(statuses(overview.value)).toEqual(["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"].map((n) => [n, "klart"]));
  });

  it("gir «klart», «mangler innhold» og «mangler notater»", async () => {
    const { data, courseId } = await smallChapter();
    const overview = await listChapterOverview(data, courseId);
    if (overview.status !== "ok") throw new Error("utilgjengelig");
    expect(statuses(overview.value)).toEqual([
      ["1.1", "klart"],
      ["1.2", "mangler innhold"],
      ["1.3", "mangler notater"],
    ]);
    expect(overview.value[0].title).toBe("Kapittel én");
  });

  it("gir «utdatert» når notatet er endret etter importen", async () => {
    const { data, courseId } = await smallChapter();
    data.chapters[0].subchapters[0].noteText = "Notat en, endret";
    const overview = await listChapterOverview(data, courseId);
    if (overview.status !== "ok") throw new Error("utilgjengelig");
    expect(overview.value[0].subchapters[0].status).toBe("utdatert");
  });

  it("henter alle versjonene med ett kall", async () => {
    const { data, courseId } = await smallChapter();
    let calls = 0;
    const original = data.listSummaryVersions.bind(data);
    data.listSummaryVersions = async (ids) => {
      calls++;
      return original(ids);
    };
    await listChapterOverview(data, courseId);
    expect(calls).toBe(1);
  });

  it("gir tom liste for et ukjent emne", async () => {
    const { data } = await smallChapter();
    expect(await listChapterOverview(data, "ukjent")).toEqual({ status: "ok", value: [] });
  });

  it("gir `unavailable` når kapitlene eller versjonene ikke kan hentes", async () => {
    const { data, courseId } = await smallChapter();
    data.summaryReadsDown = true;
    expect(await listChapterOverview(data, courseId)).toEqual({ status: "unavailable" });
    data.summaryReadsDown = false;
    data.down = true;
    expect(await listChapterOverview(data, courseId)).toEqual({ status: "unavailable" });
  });
});

describe("getSubchapterSummary", () => {
  it("gir delkapittelet, kapittelet og siste klare versjon", async () => {
    const { data, courseId } = await smallChapter();
    const result = await getSubchapterSummary(data, courseId, "1.1");
    if (result.status !== "ok") throw new Error(result.status);
    expect(result.subchapter).toMatchObject({ number: "1.1", title: "En" });
    expect(result.chapter).toMatchObject({ number: 1, title: "Kapittel én" });
    expect(result.summaryStatus).toBe("klart");
    expect(result.summary?.text).toBe("Sammendrag av 1.1.");
  });

  it("gir siste klare versjon med status «utdatert» når notatet er endret", async () => {
    const { data, courseId } = await smallChapter();
    data.chapters[0].subchapters[0].noteText = "Notat en, endret";
    const result = await getSubchapterSummary(data, courseId, "1.1");
    if (result.status !== "ok") throw new Error(result.status);
    expect(result.summaryStatus).toBe("utdatert");
    expect(result.summary?.text).toBe("Sammendrag av 1.1.");
  });

  it("gir ingen versjon for et delkapittel uten sammendrag", async () => {
    const { data, courseId } = await smallChapter();
    const result = await getSubchapterSummary(data, courseId, "1.2");
    if (result.status !== "ok") throw new Error(result.status);
    expect(result.summaryStatus).toBe("mangler innhold");
    expect(result.summary).toBeNull();
  });

  it("gir `notFound` for ukjent emne eller nummer", async () => {
    const { data, courseId } = await smallChapter();
    expect(await getSubchapterSummary(data, "ukjent", "1.1")).toEqual({ status: "notFound" });
    expect(await getSubchapterSummary(data, courseId, "9.9")).toEqual({ status: "notFound" });
  });

  it("gir `unavailable` når databasen ikke svarer", async () => {
    const { data, courseId } = await smallChapter();
    data.summaryReadsDown = true;
    expect(await getSubchapterSummary(data, courseId, "1.1")).toEqual({ status: "unavailable" });
    data.summaryReadsDown = false;
    data.down = true;
    expect(await getSubchapterSummary(data, courseId, "1.1")).toEqual({ status: "unavailable" });
  });
});
