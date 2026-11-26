/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import innhold1 from "../../G131-hovda/notater/IBE430/kapittel-1.innhold.md?raw";
import kapittel1 from "../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import { getSubchapterSummary, listChapterOverview, reportSummary } from "./chapterOverview";
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

/** En klar spørsmålsbank med ett tema og to spørsmål. Antallet sjekkes av importen, ikke her. */
async function addBank(data: MemoryDataSource, subchapterId: string, inputHash: string) {
  const question = (n: number) => ({
    question: `Spørsmål ${n}?`,
    options: ["A", "B", "C", "D"],
    correctIndex: 0,
    explanation: "Fordi.",
    theme: "Tema",
    sourceNumber: null,
    originalText: null,
  });
  await data.addQuestionBank({
    subchapterId,
    modelId: "claude-code/test",
    promptVersion: "innhold.v2",
    inputHash,
    contentHash: "c".repeat(64),
    themes: ["Tema"],
    questions: [question(1), question(2)],
  });
}

/**
 * Importerer et lite kapittel med fire delkapitler: med sammendrag og bank, med bare sammendrag,
 * uten noe og uten notater.
 */
async function smallChapter() {
  const { data, courseId } = await setup();
  const notes = `---\nemne: IBE430\nkapittel: 1\ntittel: "Kapittel én"\n---\n\n## Læringsmål for kapittelet\n\n- mål\n\n## Fordelt på delkapitler\n\n### 1.1 En\n\nNotat en\n\n### 1.2 To\n\nNotat to\n\n### 1.3 Tre\n\n*Ingen notater ennå.*\n\n### 1.4 Fire\n\nNotat fire\n`;
  const result = await importChapter(data, notes, target);
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  const [sub1, , , sub4] = data.chapters[0].subchapters;
  for (const [sub, note] of [
    [sub1, "Notat en"],
    [sub4, "Notat fire"],
  ] as const) {
    await data.addSummaryVersion({
      subchapterId: sub.id,
      status: "klart",
      text: `Sammendrag av ${sub.number}.`,
      modelId: "claude-code/test",
      promptVersion: "innhold.v2",
      inputHash: await subchapterInputHash({ learningGoals: "- mål", keyConcepts: "" }, note),
    });
  }
  await addBank(data, sub1.id, await subchapterInputHash({ learningGoals: "- mål", keyConcepts: "" }, "Notat en"));
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

  it("gir «klart» bare med både sammendrag og bank, ellers «mangler innhold» eller «mangler notater»", async () => {
    const { data, courseId } = await smallChapter();
    const overview = await listChapterOverview(data, courseId);
    if (overview.status !== "ok") throw new Error("utilgjengelig");
    expect(statuses(overview.value)).toEqual([
      ["1.1", "klart"],
      ["1.2", "mangler innhold"],
      ["1.3", "mangler notater"],
      ["1.4", "mangler innhold"],
    ]);
    // Lenken til lesesiden følger bare sammendraget.
    expect(overview.value[0].subchapters.map((s) => s.summaryStatus)).toEqual([
      "klart",
      "mangler innhold",
      "mangler notater",
      "klart",
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

  it("gir «utdatert» når bare banken har gammel hash", async () => {
    const { data, courseId } = await smallChapter();
    data.questionBankVersions[0].inputHash = "0".repeat(64);
    const overview = await listChapterOverview(data, courseId);
    if (overview.status !== "ok") throw new Error("utilgjengelig");
    expect(overview.value[0].subchapters[0].status).toBe("utdatert");
  });

  it("henter alle sammendragsversjonene med ett kall og alle bankene med ett", async () => {
    const { data, courseId } = await smallChapter();
    let calls = 0;
    let bankCalls = 0;
    const original = data.listSummaryVersions.bind(data);
    const originalBanks = data.listQuestionBanks.bind(data);
    data.listSummaryVersions = async (ids) => {
      calls++;
      return original(ids);
    };
    data.listQuestionBanks = async (ids) => {
      bankCalls++;
      return originalBanks(ids);
    };
    await listChapterOverview(data, courseId);
    expect([calls, bankCalls]).toEqual([1, 1]);
  });

  it("merker delkapitler med avkrysning som gjennomført, også når notatet er endret etterpå", async () => {
    const { data, courseId } = await smallChapter();
    const [sub1, , , sub4] = data.chapters[0].subchapters;
    data.completions.push({ subchapterId: sub4.id, quizId: "z1", completedAt: "2026-11-21T10:00:00Z" });
    data.completions.push({ subchapterId: sub1.id, quizId: "z2", completedAt: "2026-11-21T11:00:00Z" });
    sub1.noteText = "Notat en, endret";
    const overview = await listChapterOverview(data, courseId);
    if (overview.status !== "ok") throw new Error("utilgjengelig");
    expect(overview.value[0].subchapters.map((s) => [s.number, s.status, s.completed, s.completedAt])).toEqual([
      ["1.1", "utdatert", true, "2026-11-21T11:00:00Z"],
      ["1.2", "mangler innhold", false, null],
      ["1.3", "mangler notater", false, null],
      ["1.4", "mangler innhold", true, "2026-11-21T10:00:00Z"],
    ]);
  });

  it("leser «gjennomført» fra avkrysningen, ikke fra quizresultatene, med ett kall", async () => {
    const { data, courseId } = await smallChapter();
    const sub1 = data.chapters[0].subchapters[0];
    // En ferdig quiz med 10 av 10 uten avkrysning gir ikke «gjennomført».
    data.quizzes.push({
      id: "z9",
      sessionId: "o9",
      subchapterId: sub1.id,
      status: "ferdig",
      correctCount: 10,
      total: 10,
      carryThemeId: null,
      createdAt: "2026-11-21T09:00:00Z",
      finishedAt: "2026-11-21T09:10:00Z",
    });
    let calls = 0;
    const original = data.listCompletions.bind(data);
    data.listCompletions = async (ids) => {
      calls++;
      expect(ids).toEqual(data.chapters[0].subchapters.map((s) => s.id));
      return original(ids);
    };
    const overview = await listChapterOverview(data, courseId);
    if (overview.status !== "ok") throw new Error("utilgjengelig");
    expect(overview.value[0].subchapters.every((s) => !s.completed)).toBe(true);
    expect(calls).toBe(1);
  });

  it("gir `unavailable` når avkrysningene ikke kan hentes", async () => {
    const { data, courseId } = await smallChapter();
    data.completionReadsDown = true;
    expect(await listChapterOverview(data, courseId)).toEqual({ status: "unavailable" });
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
    data.bankReadsDown = true;
    expect(await listChapterOverview(data, courseId)).toEqual({ status: "unavailable" });
    data.bankReadsDown = false;
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

  it("gir «klart» for sammendraget selv om spørsmålsbanken mangler", async () => {
    const { data, courseId } = await smallChapter();
    const result = await getSubchapterSummary(data, courseId, "1.4");
    if (result.status !== "ok") throw new Error(result.status);
    expect(result.summaryStatus).toBe("klart");
  });

  it("gir ingen versjon for et delkapittel uten sammendrag", async () => {
    const { data, courseId } = await smallChapter();
    const result = await getSubchapterSummary(data, courseId, "1.2");
    if (result.status !== "ok") throw new Error(result.status);
    expect(result.summaryStatus).toBe("mangler innhold");
    expect(result.summary).toBeNull();
  });

  it("gir `quizReady` bare når både sammendraget og banken har en klar versjon", async () => {
    const { data, courseId } = await smallChapter();
    const ready = async (number: string) => {
      const result = await getSubchapterSummary(data, courseId, number);
      if (result.status !== "ok") throw new Error(result.status);
      return result.quizReady;
    };
    expect(await Promise.all(["1.1", "1.2", "1.3", "1.4"].map(ready))).toEqual([true, false, false, false]);
    data.chapters[0].subchapters[0].noteText = "Notat en, endret";
    expect(await ready("1.1")).toBe(true);
  });

  it("gir `unavailable` når banken ikke kan leses", async () => {
    const { data, courseId } = await smallChapter();
    data.bankReadsDown = true;
    expect(await getSubchapterSummary(data, courseId, "1.1")).toEqual({ status: "unavailable" });
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

describe("reportSummary", () => {
  const readyId = (data: MemoryDataSource, number = "1.1") => {
    const sub = data.chapters[0].subchapters.find((s) => s.number === number)!;
    return [...data.summaryVersions].reverse().find((v) => v.subchapterId === sub.id && v.status === "klart")!.id;
  };
  const reported = async (data: MemoryDataSource, courseId: string, number = "1.1") => {
    const result = await getSubchapterSummary(data, courseId, number);
    if (result.status !== "ok") throw new Error(result.status);
    return result.reported;
  };

  it("melder siste klare versjon med kommentaren, og sammendraget vises som før", async () => {
    const { data, courseId } = await smallChapter();
    expect(await reported(data, courseId)).toBe(false);
    const versionId = readyId(data);
    expect(await reportSummary(data, courseId, "1.1", versionId, " Feil definisjon \r\n")).toEqual({ status: "ok" });
    expect(data.summaryReports).toEqual([expect.objectContaining({ summaryVersionId: versionId, comment: "Feil definisjon" })]);
    expect(await reported(data, courseId)).toBe(true);
    expect(await reported(data, courseId, "1.4")).toBe(false);
    const result = await getSubchapterSummary(data, courseId, "1.1");
    if (result.status !== "ok") throw new Error(result.status);
    expect(result.summary?.text).toBe("Sammendrag av 1.1.");
    expect(result.summaryStatus).toBe("klart");
  });

  it("lagrer ingen ny rad når versjonen er meldt fra før, og beholder den første kommentaren", async () => {
    const { data, courseId } = await smallChapter();
    const versionId = readyId(data);
    await reportSummary(data, courseId, "1.1", versionId, "Første");
    expect(await reportSummary(data, courseId, "1.1", versionId, "Andre")).toEqual({ status: "ok" });
    expect(data.summaryReports.map((r) => r.comment)).toEqual(["Første"]);
  });

  it("gjør tom kommentar om til null, og godtar 500 tegn", async () => {
    const { data, courseId } = await smallChapter();
    await reportSummary(data, courseId, "1.1", readyId(data), "   ");
    await reportSummary(data, courseId, "1.4", readyId(data, "1.4"), "æ".repeat(500));
    expect(data.summaryReports.map((r) => r.comment)).toEqual([null, "æ".repeat(500)]);
  });

  it("lagrer ingenting når kommentaren er på 501 tegn", async () => {
    const { data, courseId } = await smallChapter();
    expect(await reportSummary(data, courseId, "1.1", readyId(data), "x".repeat(501))).toEqual({ status: "invalid" });
    expect(data.summaryReports).toEqual([]);
  });

  it("lagrer ingenting fra en gammel side, og en ny versjon er ikke merket", async () => {
    const { data, courseId } = await smallChapter();
    const old = readyId(data);
    await reportSummary(data, courseId, "1.1", old, "Feil");
    const sub = data.chapters[0].subchapters[0];
    const { modelId, promptVersion, inputHash } = data.summaryVersions.find((v) => v.id === old)!;
    await data.addSummaryVersion({ subchapterId: sub.id, status: "klart", text: "Rettet.", modelId, promptVersion, inputHash });
    expect(await reported(data, courseId)).toBe(false);
    expect(await reportSummary(data, courseId, "1.1", old, "Igjen")).toEqual({ status: "notFound" });
    expect(data.summaryReports).toHaveLength(1);
  });

  it("gir notFound uten klar versjon, for ukjent nummer og for ukjent emne", async () => {
    const { data, courseId } = await smallChapter();
    expect(await reportSummary(data, courseId, "1.2", "s1", null)).toEqual({ status: "notFound" });
    expect(await reportSummary(data, courseId, "9.9", "s1", null)).toEqual({ status: "notFound" });
    expect(await reportSummary(data, "ukjent", "1.1", readyId(data), null)).toEqual({ status: "notFound" });
    expect(await reported(data, courseId, "1.2")).toBe(false);
    expect(data.summaryReports).toEqual([]);
  });

  it("gir unavailable og lagrer ingenting når rapporten feiler", async () => {
    const { data, courseId } = await smallChapter();
    data.summaryReportWritesDown = true;
    expect(await reportSummary(data, courseId, "1.1", readyId(data), "Feil")).toEqual({ status: "unavailable" });
    expect(data.summaryReports).toEqual([]);
  });

  it("gir unavailable på lesesiden når rapportene ikke kan leses", async () => {
    const { data, courseId } = await smallChapter();
    data.summaryReportReadsDown = true;
    expect(await getSubchapterSummary(data, courseId, "1.1")).toEqual({ status: "unavailable" });
  });
});
