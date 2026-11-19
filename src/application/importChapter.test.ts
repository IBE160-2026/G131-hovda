import { describe, expect, it } from "vitest";
import { describeImport, importChapter, importMessages } from "./importChapter";
import { MemoryDataSource } from "./testing/MemoryDataSource";

function notesFile(subchapters: [number: string, title: string, note: string][], front = "emne: IBE430\nkapittel: 1") {
  const body = subchapters.map(([n, t, note]) => `### ${n} ${t}\n\n${note}\n`).join("\n");
  return `---\n${front}\ntittel: "Kapittel én"\n---\n\n## Læringsmål for kapittelet\n\n- mål\n\n## Fordelt på delkapitler\n\n${body}\n## Råtekst\n\n### Innliming 1\n\nrå\n`;
}

const sixSubchapters = notesFile([
  ["1.1", "En", "Notat en"],
  ["1.2", "To", "Notat to"],
  ["1.3", "Tre", "Notat tre"],
  ["1.4", "Fire", "Notat fire"],
  ["1.5", "Fem", "Notat fem"],
  ["1.6", "Seks", "Notat seks"],
]);

async function withCourse() {
  const data = new MemoryDataSource();
  await data.createCourse({ code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "", examForm: "" });
  return data;
}

const target = { courseCode: "ibe430", chapterNumber: 1 };

async function chapters(data: MemoryDataSource) {
  const listed = await data.listChapters(data.courses[0].id);
  if (listed.status !== "ok") throw new Error("unavailable");
  return listed.value;
}

describe("importChapter", () => {
  it("oppretter kapittel og delkapitler ved første import", async () => {
    const data = await withCourse();
    const result = await importChapter(data, sixSubchapters, target);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.report.chapter).toBe("created");
    expect(result.report.subchapters.every((s) => s.change === "created")).toBe(true);
    const [chapter] = await chapters(data);
    expect(chapter).toMatchObject({ number: 1, title: "Kapittel én", learningGoals: "- mål", keyConcepts: "" });
    expect(chapter.subchapters.map((s) => s.number)).toEqual(["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"]);
  });

  it("endrer ingenting når samme fil importeres på nytt", async () => {
    const data = await withCourse();
    await importChapter(data, sixSubchapters, target);
    const writes = data.chapterWrites;
    const result = await importChapter(data, sixSubchapters, target);
    expect(data.chapterWrites).toBe(writes);
    expect(result.status === "ok" && describeImport(result.chapter, result.report).at(-1)).toBe(
      importMessages.allUnchanged,
    );
  });

  it("oppdaterer bare det som er endret", async () => {
    const data = await withCourse();
    await importChapter(data, sixSubchapters, target);
    const writes = data.chapterWrites;
    const changed = sixSubchapters.replace("### 1.2 To", "### 1.2 To (ny)");
    const result = await importChapter(data, changed, target);
    expect(data.chapterWrites).toBe(writes + 1);
    expect(result.status === "ok" && result.report.subchapters.map((s) => s.change)).toEqual([
      "unchanged",
      "updated",
      "unchanged",
      "unchanged",
      "unchanged",
      "unchanged",
    ]);
  });

  it("merker et delkapittel som er borte, som fjernet, og gjenoppretter det når det kommer tilbake", async () => {
    const data = await withCourse();
    await importChapter(data, sixSubchapters, target);
    const withoutSix = sixSubchapters.replace("### 1.6 Seks\n\nNotat seks\n", "");

    const removed = await importChapter(data, withoutSix, target);
    expect(removed.status === "ok" && removed.report.subchapters.at(-1)).toEqual({ number: "1.6", change: "removed" });
    expect((await chapters(data))[0].subchapters.map((s) => s.number)).not.toContain("1.6");
    const id = data.chapters[0].subchapters.find((s) => s.number === "1.6")!.id;

    const back = sixSubchapters.replace("### 1.6 Seks\n\nNotat seks", "### 1.6 Seks igjen\n\nNy tekst");
    const restored = await importChapter(data, back, target);
    expect(restored.status === "ok" && restored.report.subchapters.at(-1)).toEqual({
      number: "1.6",
      change: "restored",
    });
    const six = (await chapters(data))[0].subchapters.find((s) => s.number === "1.6");
    expect(six).toEqual({ id, number: "1.6", title: "Seks igjen", noteText: "Ny tekst" });
  });

  it("skriver ingenting når filen har feil, og gir meldingen med linjenummer", async () => {
    const data = await withCourse();
    const wrong = sixSubchapters.replace("### 1.3 Tre", "### 2.3 Tre");
    const result = await importChapter(data, wrong, target);
    expect(result.status).toBe("invalid");
    expect(result.status === "invalid" && result.errors[0]).toMatch(
      /^Linje \d+: delkapittel 2\.3 hører ikke til kapittel 1\.$/,
    );
    expect(data.chapterWrites).toBe(0);
  });

  it("skriver ingenting når kapittel i frontmatter er ulikt filnavnet", async () => {
    const data = await withCourse();
    const result = await importChapter(data, sixSubchapters, { courseCode: "IBE430", chapterNumber: 2 });
    expect(result).toEqual({
      status: "invalid",
      file: "notes",
      errors: ["Linje 3: kapittel er 1 i frontmatter, men filen er kapittel-2.md."],
    });
    expect(data.chapterWrites).toBe(0);
  });

  it("skriver ingenting når emnet mangler", async () => {
    const data = new MemoryDataSource();
    const result = await importChapter(data, sixSubchapters, target);
    expect(result).toEqual({ status: "courseNotFound", courseCode: "IBE430" });
    expect(importMessages.courseNotFound("IBE430")).toBe("Fant ikke emnet IBE430. Opprett det i appen først.");
    expect(data.chapterWrites).toBe(0);
  });

  it("gir unavailable når databasen er nede", async () => {
    const data = await withCourse();
    data.down = true;
    expect(await importChapter(data, sixSubchapters, target)).toEqual({ status: "unavailable" });
  });
});

describe("describeImport", () => {
  it("skriver én norsk linje per kapittel og delkapittel", () => {
    const chapter = {
      number: 1,
      title: "Kapittel én",
      learningGoals: "",
      keyConcepts: "",
      subchapters: [{ number: "1.1", title: "En", noteText: "" }],
    };
    expect(
      describeImport(chapter, {
        chapter: "updated",
        subchapters: [
          { number: "1.1", change: "created" },
          { number: "1.6", change: "removed" },
        ],
      }),
    ).toEqual(["Kapittel 1 Kapittel én: oppdatert", "  1.1 En: opprettet", "  1.6: fjernet"]);
  });
});
