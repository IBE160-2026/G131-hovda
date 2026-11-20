/// <reference types="vite/client" />
// Spørsmålsbankene i importen (story 1.6a). Bankene kommer fra `## Quizspørsmål` i innholdsfilen.
import { describe, expect, it } from "vitest";
import innhold1 from "../../G131-hovda/notater/IBE430/kapittel-1.innhold.md?raw";
import kapittel1 from "../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import { importChapter, importMessages, reportImport, type ImportOptions } from "./importChapter";
import { subchapterInputHash } from "./summaryHash";
import { MemoryDataSource } from "./testing/MemoryDataSource";

const target = { courseCode: "IBE430", chapterNumber: 1 };

/** Notatfil med 1.1 og 1.2 med notater, 1.3 uten, og to egne spørsmål til 1.1, der nr. 2 skal avklares. */
function notesFile(note11 = "Notat en") {
  return `---\nemne: IBE430\nkapittel: 1\ntittel: "Kapittel én"\n---\n\n## Læringsmål for kapittelet\n\n- mål\n\n## Fordelt på delkapitler\n\n### 1.1 En\n\n${note11}\n\n### 1.2 To\n\nNotat to\n\n### 1.3 Tre\n\n*Ingen notater ennå.*\n\n## Spørsmålsbank\n\n| # | Delkapittel | Spørsmål | Fasit |\n|---|---|---|---|\n| 1 | 1.1 | Er en prosess flere trinn? | Ja. |\n| 2 | 1.1 | Uklart? | Kanskje. |\n\n**Må avklares før bruk:**\n- **Spørsmål 2:** uklart.\n`;
}

const hashOf = (note: string) => subchapterInputHash({ learningGoals: "- mål", keyConcepts: "" }, note);

function question(i: number, extra = ""): string {
  const theme = i % 2 === 0 ? "Alfa" : "Beta";
  return `#### Spørsmål ${i}?\n- [ ] A\n- [x] B\n- [ ] C\n- [ ] D\nForklaring: Fordi ${i}.\nTema: ${theme}\n${extra}`;
}

/** Bank med 20 spørsmål. 1.1 får det omskrevne Ja/Nei-spørsmålet som nr. 1. */
function bank(number: string, hash: string, first = "Spørsmål 0") {
  const own =
    number === "1.1"
      ? `#### Hva stemmer om en prosess?\n- [x] En prosess består av flere trinn\n- [ ] Ett trinn\n- [ ] Ingen trinn\n- [ ] Bare avdelinger\nForklaring: Notatet sier det.\nTema: Alfa\nKilde: spørsmålsbank 1\nOriginal: Er en prosess flere trinn?\n`
      : question(0).replace("Spørsmål 0", first);
  const rest = Array.from({ length: 19 }, (_, i) => question(i + 1)).join("\n");
  return `### ${number} Tittel\n<!-- inputHash: ${hash} -->\nTemaer:\n- Alfa\n- Beta\n\n${own}\n${rest}`;
}

async function contentFile(options: { note11?: string; hash11?: string; first12?: string; only?: string[] } = {}) {
  const hash11 = options.hash11 ?? (await hashOf(options.note11 ?? "Notat en"));
  const hash12 = await hashOf("Notat to");
  const banks = [bank("1.1", hash11), bank("1.2", hash12, options.first12)].filter((_, i) =>
    (options.only ?? ["1.1", "1.2"]).includes(["1.1", "1.2"][i]),
  );
  return `---\nemne: IBE430\nkapittel: 1\ninstruksjon: innhold.v2\nmodell: claude-code/test-modell\n---\n\n## Quizspørsmål\n\n${banks.join("\n")}`;
}

async function setup() {
  const data = new MemoryDataSource();
  await data.createCourse({ code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "", examForm: "" });
  return data;
}

async function run(data: MemoryDataSource, notes: string, options: ImportOptions) {
  const result = await importChapter(data, notes, target, options);
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  return result;
}

const statuses = (result: Awaited<ReturnType<typeof run>>) => result.questionBanks.map((s) => s.status);

describe("importChapter med spørsmålsbank", () => {
  it("legger inn temaer, 20 spørsmål og en klar versjon per delkapittel ved første import", async () => {
    const data = await setup();
    const result = await run(data, notesFile(), { content: await contentFile() });
    expect(statuses(result)).toEqual(["created", "created", "noNotes"]);
    expect(data.questionBankVersions).toHaveLength(2);
    expect(data.questionBankVersions[0]).toMatchObject({
      subchapterId: data.chapters[0].subchapters[0].id,
      status: "klart",
      modelId: "claude-code/test-modell",
      promptVersion: "innhold.v2",
      inputHash: await hashOf("Notat en"),
    });
    expect(data.themes.map((t) => t.name)).toEqual(["Alfa", "Beta", "Alfa", "Beta"]);
    expect(data.quizQuestions).toHaveLength(40);
    expect(data.quizQuestions.every((q) => q.status === "aktiv")).toBe(true);
    const report = reportImport(result);
    expect(report.stdout[1]).toBe("  1.1 En: opprettet, mangler sammendrag, spørsmålsbank lagt inn");
    expect(report.code).toBe(0);
  });

  it("lagrer Ja/Nei-spørsmålet som omskrevet med originalteksten, og skriver ut hoppede spørsmål", async () => {
    const data = await setup();
    const result = await run(data, notesFile(), { content: await contentFile() });
    expect(data.quizQuestions[0]).toMatchObject({
      question: "Hva stemmer om en prosess?",
      sourceNumber: 1,
      originalText: "Er en prosess flere trinn?",
      correctIndex: 0,
    });
    expect(data.quizQuestions.filter((q) => q.sourceNumber !== null)).toHaveLength(1);
    expect(result.skippedQuestions).toEqual([2]);
    expect(reportImport(result).stdout).toContain(importMessages.skippedQuestions([2]));
    expect(importMessages.skippedQuestions([2, 4, 6, 7, 8])).toBe(
      "Hopper over spørsmål 2, 4, 6, 7 og 8 fra «## Spørsmålsbank» (må avklares før bruk).",
    );
  });

  it("gir «uendret» og skriver ingenting andre gang", async () => {
    const data = await setup();
    const content = await contentFile();
    await run(data, notesFile(), { content });
    const result = await run(data, notesFile(), { content });
    expect(statuses(result)).toEqual(["unchanged", "unchanged", "noNotes"]);
    expect(data.questionBankVersions).toHaveLength(2);
    expect(data.quizQuestions).toHaveLength(40);
    expect(reportImport(result).code).toBe(0);
  });

  it("gir «endret», skriver ingenting og kode 1 når en klar bank finnes og fila har en annen", async () => {
    const data = await setup();
    await run(data, notesFile(), { content: await contentFile() });
    const result = await run(data, notesFile(), { content: await contentFile({ first12: "Et nytt spørsmål" }) });
    expect(statuses(result)).toEqual(["unchanged", "changed", "noNotes"]);
    expect(data.questionBankVersions).toHaveLength(2);
    const report = reportImport(result);
    expect(report.stderr).toContain(importMessages.banksChanged);
    expect(report.stdout[2]).toBe("  1.2 To: uendret, mangler sammendrag, spørsmålsbank endret, ikke lagt inn");
    expect(report.stdout).not.toContain(importMessages.allUnchanged);
    expect(report.code).toBe(1);
  });

  it("gir «utdatert» for bankene og kode 1 når instruksjonen i fila er en annen enn importen kjenner", async () => {
    const data = await setup();
    const content = (await contentFile()).replace("instruksjon: innhold.v2", "instruksjon: innhold.v3");
    const result = await run(data, notesFile(), { content });
    expect(statuses(result)).toEqual(["outdated", "outdated", "noNotes"]);
    expect(data.questionBankVersions).toEqual([]);
    expect(reportImport(result).code).toBe(1);
  });

  it("gir «endret» når notatet er endret og fila har banken med ny hash", async () => {
    const data = await setup();
    await run(data, notesFile(), { content: await contentFile() });
    const result = await run(data, notesFile("Notat en, endret"), {
      content: await contentFile({ note11: "Notat en, endret" }),
    });
    expect(statuses(result)[0]).toBe("changed");
    expect(data.questionBankVersions).toHaveLength(2);
  });

  it("gir «utdatert», skriver ingenting og kode 1 når hashen i fila ikke er notatets hash nå", async () => {
    const data = await setup();
    const result = await run(data, notesFile("Notat en, endret"), { content: await contentFile() });
    expect(statuses(result)).toEqual(["outdated", "created", "noNotes"]);
    expect(data.questionBankVersions).toHaveLength(1);
    const report = reportImport(result);
    expect(report.stderr).toContain(importMessages.banksOutdated);
    expect(report.code).toBe(1);
  });

  it("gir «mangler innhold» med kode 0 når verken sammendrag eller bank finnes", async () => {
    const data = await setup();
    const result = await run(data, notesFile(), { content: await contentFile({ only: ["1.2"] }) });
    expect(statuses(result)).toEqual(["missing", "created", "noNotes"]);
    const report = reportImport(result);
    expect(report.stdout[1]).toBe("  1.1 En: opprettet, mangler innhold");
    expect(report.code).toBe(0);
  });

  it("skriver ingenting og beholder en klar bank når innholdsfila er ugyldig", async () => {
    const data = await setup();
    await run(data, notesFile(), { content: await contentFile() });
    const invalid = (await contentFile()).replace("- [x] B\n- [ ] C", "- [x] B\n- [x] C");
    const result = await importChapter(data, notesFile(), target, { content: invalid });
    expect(result.status).toBe("invalid");
    expect(result.status === "invalid" && result.file).toBe("content");
    expect(data.questionBankVersions.map((v) => v.status)).toEqual(["klart", "klart"]);
    expect(data.quizQuestions).toHaveLength(40);
  });

  it("avviser en fil der det egne spørsmålet mangler", async () => {
    const data = await setup();
    const content = (await contentFile()).replace("Kilde: spørsmålsbank 1\n", "");
    const result = await importChapter(data, notesFile(), target, { content });
    expect(result.status === "invalid" && result.errors.some((e) => e.includes("spørsmål 1 fra «## Spørsmålsbank» mangler i 1.1"))).toBe(
      true,
    );
    expect(data.chapters).toEqual([]);
  });

  it("setter versjonen til «feilet», beholder tidligere klare og gir kode 1 når lagringen feiler underveis", async () => {
    const data = await setup();
    await run(data, notesFile(), { content: await contentFile({ only: ["1.2"] }) });
    data.bankQuestionWritesDown = true;
    const result = await run(data, notesFile(), { content: await contentFile() });
    expect(result.questionBanks[0]).toEqual({ number: "1.1", status: "failed", reason: importMessages.bankNotSaved });
    expect(result.questionBanks[1].status).toBe("unchanged");
    expect(data.questionBankVersions.map((v) => v.status)).toEqual(["klart", "feilet"]);
    const report = reportImport(result);
    expect(report.stderr).toContain(importMessages.banksFailed);
    expect(report.code).toBe(1);

    data.bankQuestionWritesDown = false;
    const retry = await run(data, notesFile(), { content: await contentFile() });
    expect(retry.questionBanks[0].status).toBe("created");
    expect(reportImport(retry).stdout).not.toContain(importMessages.allUnchanged);
    expect(data.themes.filter((t) => t.subchapterId === data.chapters[0].subchapters[0].id)).toHaveLength(2);
  });

  it("gir «feilet» for alle når bankene ikke kan leses", async () => {
    const data = await setup();
    data.bankReadsDown = true;
    const result = await run(data, notesFile(), { content: await contentFile() });
    expect(statuses(result)).toEqual(["failed", "failed", "noNotes"]);
  });
});

describe("importen av IBE430 kapittel 1 med den ekte innholdsfila", () => {
  it("legger inn seks sammendrag og seks banker, og andre kjøring er uendret", async () => {
    const data = await setup();
    const first = await run(data, kapittel1, { content: innhold1 });
    expect(first.summaries.map((s) => s.status)).toEqual(Array(6).fill("created"));
    expect(statuses(first)).toEqual(Array(6).fill("created"));
    expect(first.skippedQuestions).toEqual([2, 4, 6, 7, 8]);
    expect(data.quizQuestions).toHaveLength(120);
    expect(data.quizQuestions.filter((q) => q.sourceNumber !== null).map((q) => q.sourceNumber)).toEqual([1, 5, 3]);
    expect(reportImport(first).code).toBe(0);

    const second = await run(data, kapittel1, { content: innhold1 });
    expect(second.summaries.map((s) => s.status)).toEqual(Array(6).fill("unchanged"));
    expect(statuses(second)).toEqual(Array(6).fill("unchanged"));
    const report = reportImport(second);
    expect(report.stdout).toContain(importMessages.allUnchanged);
    expect(report.code).toBe(0);
  });
});
