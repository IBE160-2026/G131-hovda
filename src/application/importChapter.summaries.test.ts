// Sammendragene i importen (story 1.5a). Testene bruker en falsk AiProvider, aldri ekte KI.
import { describe, expect, it } from "vitest";
import type { AiProvider, SummaryInput, SummaryResult } from "./aiProvider";
import {
  anySummaryFailed,
  describeImport,
  importChapter,
  importExitCode,
  importMessages,
  reportImport,
} from "./importChapter";
import { MemoryDataSource } from "./testing/MemoryDataSource";

function notesFile(subchapters: [number: string, title: string, note: string][], keyConcepts = "") {
  const body = subchapters.map(([n, t, note]) => `### ${n} ${t}\n\n${note}\n`).join("\n");
  const concepts = keyConcepts ? `## Nøkkelbegreper\n\n${keyConcepts}\n\n` : "";
  return `---\nemne: IBE430\nkapittel: 1\ntittel: "Kapittel én"\n---\n\n## Læringsmål for kapittelet\n\n- mål\n\n${concepts}## Fordelt på delkapitler\n\n${body}\n## Råtekst\n\n### Innliming 1\n\nrå\n`;
}

const sixSubchapters = notesFile([
  ["1.1", "En", "Notat en"],
  ["1.2", "To", "Notat to"],
  ["1.3", "Tre", "Notat tre"],
  ["1.4", "Fire", "Notat fire"],
  ["1.5", "Fem", "Notat fem"],
  ["1.6", "Seks", "Notat seks"],
]);

const target = { courseCode: "ibe430", chapterNumber: 1 };

// Falsk KI: registrerer kallene og svarer med `reply`.
class FakeAi implements AiProvider {
  calls: SummaryInput[] = [];
  summaryPromptVersion = "summary.test1";
  reply: (input: SummaryInput) => SummaryResult = (input) => ({
    status: "ok",
    text: `Sammendrag av ${input.subchapterNumber}.`,
    modelId: "anthropic.test-modell",
    promptVersion: this.summaryPromptVersion,
  });

  async summarize(input: SummaryInput) {
    this.calls.push(input);
    return this.reply(input);
  }

  calledFor() {
    return this.calls.map((c) => c.subchapterNumber);
  }
}

async function setup() {
  const data = new MemoryDataSource();
  await data.createCourse({
    code: "IBE430",
    name: "Virksomhetssystemer",
    learningOutcomes: "Studenten kan ERP.",
    examForm: "",
  });
  return { data, ai: new FakeAi() };
}

function outcomes(result: Awaited<ReturnType<typeof importChapter>>) {
  if (result.status !== "ok") throw new Error(result.status);
  return result.summaries;
}

function lines(result: Awaited<ReturnType<typeof importChapter>>) {
  if (result.status !== "ok") throw new Error(result.status);
  return describeImport(result.chapter, result.report, result.summaries);
}

describe("importChapter med sammendrag", () => {
  it("lager én klar versjon per delkapittel med notater ved første import", async () => {
    const { data, ai } = await setup();
    const result = await importChapter(data, sixSubchapters, target, { ai });
    expect(outcomes(result)?.map((o) => o.status)).toEqual(Array(6).fill("created"));
    expect(ai.calledFor()).toEqual(["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"]);
    expect(data.summaryVersions).toHaveLength(6);
    const first = data.summaryVersions[0];
    expect(first).toMatchObject({
      subchapterId: data.chapters[0].subchapters[0].id,
      status: "klart",
      text: "Sammendrag av 1.1.",
      modelId: "anthropic.test-modell",
      promptVersion: "summary.test1",
      error: null,
    });
    expect(first.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(lines(result)[1]).toBe("  1.1 En: opprettet, sammendrag laget");
  });

  it("sender notatet og konteksten fra emnet og kapittelet til KI", async () => {
    const { data, ai } = await setup();
    await importChapter(data, notesFile([["1.2", "To", "Notat to"]], "- begrep"), target, { ai });
    expect(ai.calls).toEqual([
      {
        courseCode: "IBE430",
        courseName: "Virksomhetssystemer",
        learningOutcomes: "Studenten kan ERP.",
        chapterNumber: 1,
        chapterTitle: "Kapittel én",
        learningGoals: "- mål",
        keyConcepts: "- begrep",
        subchapterNumber: "1.2",
        subchapterTitle: "To",
        noteText: "Notat to",
      },
    ]);
  });

  it("gjør ingen KI-kall når notat og kontekst er uendret", async () => {
    const { data, ai } = await setup();
    await importChapter(data, sixSubchapters, target, { ai });
    ai.calls = [];
    const result = await importChapter(data, sixSubchapters, target, { ai });
    expect(ai.calls).toEqual([]);
    expect(data.summaryVersions).toHaveLength(6);
    expect(lines(result)).toEqual([
      "Kapittel 1 Kapittel én: uendret",
      "  1.1 En: uendret, sammendrag uendret",
      "  1.2 To: uendret, sammendrag uendret",
      "  1.3 Tre: uendret, sammendrag uendret",
      "  1.4 Fire: uendret, sammendrag uendret",
      "  1.5 Fem: uendret, sammendrag uendret",
      "  1.6 Seks: uendret, sammendrag uendret",
      importMessages.allUnchanged,
    ]);
  });

  it("lager ny versjon bare for delkapittelet med endret notat, og beholder den gamle", async () => {
    const { data, ai } = await setup();
    await importChapter(data, sixSubchapters, target, { ai });
    ai.calls = [];
    const result = await importChapter(data, sixSubchapters.replace("Notat to", "Notat to, utvidet"), target, { ai });
    expect(ai.calledFor()).toEqual(["1.2"]);
    expect(outcomes(result)?.[1]).toEqual({ number: "1.2", status: "created" });
    const id = data.chapters[0].subchapters[1].id;
    expect(data.summaryVersions.filter((v) => v.subchapterId === id).map((v) => v.status)).toEqual(["klart", "klart"]);
  });

  it("lager nye sammendrag for alle når læringsmål eller nøkkelbegreper endres", async () => {
    const { data, ai } = await setup();
    await importChapter(data, sixSubchapters, target, { ai });
    ai.calls = [];
    await importChapter(data, sixSubchapters.replace("- mål", "- nytt mål"), target, { ai });
    expect(ai.calls).toHaveLength(6);
    ai.calls = [];
    const withConcepts = sixSubchapters
      .replace("- mål", "- nytt mål")
      .replace("## Fordelt på delkapitler", "## Nøkkelbegreper\n\n- begrep\n\n## Fordelt på delkapitler");
    await importChapter(data, withConcepts, target, { ai });
    expect(ai.calls).toHaveLength(6);
  });

  it("lager nye sammendrag når promptversjonen endres", async () => {
    const { data, ai } = await setup();
    await importChapter(data, sixSubchapters, target, { ai });
    ai.calls = [];
    ai.summaryPromptVersion = "summary.test2";
    await importChapter(data, sixSubchapters, target, { ai });
    expect(ai.calls).toHaveLength(6);
  });

  it("lager bare det ene delkapittelet på nytt med force", async () => {
    const { data, ai } = await setup();
    await importChapter(data, sixSubchapters, target, { ai });
    ai.calls = [];
    const result = await importChapter(data, sixSubchapters, target, { ai, force: "1.2" });
    expect(ai.calledFor()).toEqual(["1.2"]);
    expect(outcomes(result)?.map((o) => o.status)).toEqual([
      "unchanged",
      "created",
      "unchanged",
      "unchanged",
      "unchanged",
      "unchanged",
    ]);
  });

  it("skriver ingenting når force gjelder et delkapittel som ikke er i filen", async () => {
    const { data, ai } = await setup();
    const result = await importChapter(data, sixSubchapters, target, { ai, force: "1.9" });
    expect(result).toEqual({
      status: "invalid",
      errors: ["--force 1.9: delkapittelet finnes ikke i notatfilen. Ingenting er skrevet."],
    });
    expect(data.chapterWrites).toBe(0);
    expect(ai.calls).toEqual([]);
  });

  it("gjør ingen KI-kall og lager ingen versjon for delkapitler uten notater", async () => {
    const { data, ai } = await setup();
    const file = notesFile([
      ["1.1", "En", "Notat en"],
      ["1.2", "To", "*Ingen notater ennå.*"],
    ]);
    const result = await importChapter(data, file, target, { ai });
    expect(ai.calledFor()).toEqual(["1.1"]);
    expect(data.summaryVersions).toHaveLength(1);
    expect(lines(result)).toEqual([
      "Kapittel 1 Kapittel én: opprettet",
      "  1.1 En: opprettet, sammendrag laget",
      "  1.2 To: opprettet, mangler notater",
    ]);
  });

  it("gjør aldri KI-kall for fjernede delkapitler", async () => {
    const { data, ai } = await setup();
    await importChapter(data, sixSubchapters, target, { ai });
    ai.calls = [];
    ai.summaryPromptVersion = "summary.test2";
    const withoutSix = sixSubchapters.replace("### 1.6 Seks\n\nNotat seks\n", "");
    const result = await importChapter(data, withoutSix, target, { ai });
    expect(ai.calledFor()).toEqual(["1.1", "1.2", "1.3", "1.4", "1.5"]);
    expect(lines(result).at(-1)).toBe("  1.6: fjernet");
  });

  it("lagrer en feilet versjon når KI feiler, beholder den klare og fortsetter med neste", async () => {
    const { data, ai } = await setup();
    await importChapter(data, sixSubchapters, target, { ai });
    const ready = [...data.summaryVersions];
    ai.calls = [];
    ai.summaryPromptVersion = "summary.test2";
    ai.reply = (input) =>
      input.subchapterNumber === "1.2"
        ? { status: "failed", reason: "Bedrock svarte ikke.", modelId: "anthropic.m", promptVersion: "summary.test2" }
        : { status: "ok", text: "Nytt.", modelId: "anthropic.m", promptVersion: "summary.test2" };
    const result = await importChapter(data, sixSubchapters, target, { ai });
    expect(ai.calls).toHaveLength(6);
    expect(outcomes(result)?.[1]).toEqual({ number: "1.2", status: "failed", reason: "Bedrock svarte ikke." });
    expect(outcomes(result)?.[2]).toEqual({ number: "1.3", status: "created" });
    expect(anySummaryFailed(outcomes(result))).toBe(true);
    expect(data.summaryVersions.slice(0, 6)).toEqual(ready);

    const listed = await data.listSummaryVersions([data.chapters[0].subchapters[1].id]);
    if (listed.status !== "ok") throw new Error("unavailable");
    expect(listed.value[0].latest).toMatchObject({ status: "feilet", text: null, error: "Bedrock svarte ikke." });
    expect(listed.value[0].latestReady).toEqual(ready[1]);
    expect(lines(result)[2]).toBe("  1.2 To: uendret, sammendrag feilet: Bedrock svarte ikke.");
  });

  it("lagrer en feilet versjon når svaret er tomt eller over 600 ord", async () => {
    const { data, ai } = await setup();
    ai.reply = (input) => ({
      status: "ok",
      text: input.subchapterNumber === "1.1" ? "  " : Array(601).fill("ord").join(" "),
      modelId: "anthropic.m",
      promptVersion: ai.summaryPromptVersion,
    });
    const file = notesFile([
      ["1.1", "En", "Notat en"],
      ["1.2", "To", "Notat to"],
    ]);
    const result = await importChapter(data, file, target, { ai });
    expect(outcomes(result)).toEqual([
      { number: "1.1", status: "failed", reason: "Sammendraget er tomt." },
      { number: "1.2", status: "failed", reason: "Sammendraget har 601 ord, mer enn 600." },
    ]);
    expect(data.summaryVersions.map((v) => v.status)).toEqual(["feilet", "feilet"]);
  });

  it("gjør nytt KI-kall når siste versjon er feilet med samme hash", async () => {
    const { data, ai } = await setup();
    const file = notesFile([["1.1", "En", "Notat en"]]);
    ai.reply = () => ({ status: "failed", reason: "Nede.", modelId: "anthropic.m", promptVersion: ai.summaryPromptVersion });
    await importChapter(data, file, target, { ai });
    ai.reply = () => ({ status: "ok", text: "Nå gikk det.", modelId: "anthropic.m", promptVersion: ai.summaryPromptVersion });
    const result = await importChapter(data, file, target, { ai });
    expect(ai.calls).toHaveLength(2);
    expect(outcomes(result)).toEqual([{ number: "1.1", status: "created" }]);
    expect(data.summaryVersions[1].inputHash).toBe(data.summaryVersions[0].inputHash);
  });

  it("gjør et kast fra KI om til en feilet versjon", async () => {
    const { data, ai } = await setup();
    ai.reply = () => {
      throw new Error("boom");
    };
    const result = await importChapter(data, notesFile([["1.1", "En", "Notat en"]]), target, { ai });
    expect(outcomes(result)).toEqual([{ number: "1.1", status: "failed", reason: importMessages.summaryUnexpected }]);
    expect(data.summaryVersions[0]).toMatchObject({ status: "feilet", error: importMessages.summaryUnexpected });
  });

  it("sier fra og fortsetter når en versjon ikke kan lagres", async () => {
    const { data, ai } = await setup();
    data.summaryWritesDown = true;
    const file = notesFile([
      ["1.1", "En", "Notat en"],
      ["1.2", "To", "Notat to"],
    ]);
    const result = await importChapter(data, file, target, { ai });
    expect(ai.calls).toHaveLength(2);
    expect(outcomes(result)).toEqual([
      { number: "1.1", status: "failed", reason: importMessages.summaryNotSaved },
      { number: "1.2", status: "failed", reason: importMessages.summaryNotSaved },
    ]);
  });

  it("lager ingen sammendrag uten KI, men lagrer kapitlene", async () => {
    const { data } = await setup();
    const result = await importChapter(data, sixSubchapters, target);
    expect(outcomes(result)).toBeNull();
    expect(data.summaryVersions).toEqual([]);
    expect(data.chapters[0].subchapters).toHaveLength(6);
    expect(lines(result)[1]).toBe("  1.1 En: opprettet");
    expect(importExitCode(false, outcomes(result))).toBe(1);
  });

  it("avslutter med kode 1 bare når AWS mangler eller et sammendrag feilet", () => {
    expect(importExitCode(true, [{ number: "1.1", status: "created" }, { number: "1.2", status: "noNotes" }])).toBe(0);
    expect(importExitCode(true, [{ number: "1.1", status: "failed", reason: "Nede." }])).toBe(1);
    expect(importExitCode(false, null)).toBe(1);
  });

  it("skriver ingenting når force gjelder et delkapittel uten notater", async () => {
    const { data, ai } = await setup();
    const file = notesFile([
      ["1.1", "En", "Notat en"],
      ["1.2", "To", "*Ingen notater ennå.*"],
    ]);
    const result = await importChapter(data, file, target, { ai, force: "1.2" });
    expect(result).toEqual({
      status: "invalid",
      errors: ["--force 1.2: delkapittelet har ingen notater. Ingenting er skrevet."],
    });
    expect(data.chapterWrites).toBe(0);
    expect(ai.calls).toEqual([]);
  });

  it("gir feilet for delkapitler med notater når versjonene ikke kan leses", async () => {
    const { data, ai } = await setup();
    data.summaryReadsDown = true;
    const file = notesFile([
      ["1.1", "En", "Notat en"],
      ["1.2", "To", "*Ingen notater ennå.*"],
    ]);
    const result = await importChapter(data, file, target, { ai });
    expect(outcomes(result)).toEqual([
      { number: "1.1", status: "failed", reason: importMessages.unavailable },
      { number: "1.2", status: "noNotes" },
    ]);
    expect(ai.calls).toEqual([]);
    expect(importExitCode(true, outcomes(result))).toBe(1);
  });
});

describe("reportImport", () => {
  const file = notesFile([
    ["1.1", "En", "Notat en"],
    ["1.2", "To", "Notat to"],
  ]);

  async function okResult(ai: FakeAi | null) {
    const { data } = await setup();
    const result = await importChapter(data, file, target, { ai });
    if (result.status !== "ok") throw new Error(result.status);
    return result;
  }

  it("sier fra om manglende AWS-nøkler og gir kode 1", async () => {
    const missing = "Mangler AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY i .env.dev.local. Sammendrag er ikke laget.";
    expect(reportImport(await okResult(null), missing)).toEqual({
      stdout: ["Kapittel 1 Kapittel én: opprettet", "  1.1 En: opprettet", "  1.2 To: opprettet"],
      stderr: [missing],
      code: 1,
    });
  });

  it("sier fra når et sammendrag feilet og gir kode 1", async () => {
    const ai = new FakeAi();
    ai.reply = (input) =>
      input.subchapterNumber === "1.2"
        ? { status: "failed", reason: "Nede.", modelId: "anthropic.m", promptVersion: ai.summaryPromptVersion }
        : { status: "ok", text: "Kort.", modelId: "anthropic.m", promptVersion: ai.summaryPromptVersion };
    expect(reportImport(await okResult(ai), null)).toEqual({
      stdout: [
        "Kapittel 1 Kapittel én: opprettet",
        "  1.1 En: opprettet, sammendrag laget",
        "  1.2 To: opprettet, sammendrag feilet: Nede.",
      ],
      stderr: [importMessages.summariesFailed],
      code: 1,
    });
  });

  it("gir kode 0 og ingen feilmeldinger når alt gikk bra", async () => {
    expect(reportImport(await okResult(new FakeAi()), null)).toEqual({
      stdout: [
        "Kapittel 1 Kapittel én: opprettet",
        "  1.1 En: opprettet, sammendrag laget",
        "  1.2 To: opprettet, sammendrag laget",
      ],
      stderr: [],
      code: 0,
    });
  });
});
