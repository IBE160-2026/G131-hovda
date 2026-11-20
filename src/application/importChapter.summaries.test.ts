/// <reference types="vite/client" />
// Sammendragene i importen (story 1.5a v2). Sammendragene kommer fra innholdsfilen, aldri fra KI.
import { describe, expect, it } from "vitest";
import innhold1 from "../../G131-hovda/notater/IBE430/kapittel-1.innhold.md?raw";
import kapittel1 from "../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import {
  describeImport,
  importChapter,
  importExitCode,
  importMessages,
  reportImport,
  type ImportOptions,
} from "./importChapter";
import { contentHashes, subchapterInputHash } from "./summaryHash";
import { MemoryDataSource } from "./testing/MemoryDataSource";

type Sub = [number: string, title: string, note: string];

function notesFile(subchapters: Sub[], goals = "- mål") {
  const body = subchapters.map(([n, t, note]) => `### ${n} ${t}\n\n${note}\n`).join("\n");
  return `---\nemne: IBE430\nkapittel: 1\ntittel: "Kapittel én"\n---\n\n## Læringsmål for kapittelet\n\n${goals}\n\n## Fordelt på delkapitler\n\n${body}\n## Råtekst\n\n### Innliming 1\n\nrå\n`;
}

const six: Sub[] = [
  ["1.1", "En", "Notat en"],
  ["1.2", "To", "Notat to"],
  ["1.3", "Tre", "Notat tre"],
  ["1.4", "Fire", "Notat fire"],
  ["1.5", "Fem", "Notat fem"],
  ["1.6", "Seks", "Notat seks"],
];
const sixSubchapters = notesFile(six);

const target = { courseCode: "ibe430", chapterNumber: 1 };

const hashOf = (note: string, goals = "- mål") => subchapterInputHash({ learningGoals: goals, keyConcepts: "" }, note);

type Entry = { number: string; text: string; hash: string };

function contentFile(entries: Entry[], front = "instruksjon: innhold.v2\nmodell: claude-code/test-modell") {
  const body = entries.map((e) => `### ${e.number} Tittel\n<!-- inputHash: ${e.hash} -->\n${e.text}\n`).join("\n");
  return `---\nemne: IBE430\nkapittel: 1\n${front}\n---\n\n## Sammendrag\n\n${body}`;
}

/** Innholdsfil med riktig hash for alle delkapitlene. */
async function contentFor(subs: Sub[], text = (n: string) => `Sammendrag av ${n}.`) {
  return contentFile(await Promise.all(subs.map(async ([n, , note]) => ({ number: n, text: text(n), hash: await hashOf(note) }))));
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

const statuses = (result: Awaited<ReturnType<typeof run>>) => result.summaries.map((s) => s.status);
const lines = (result: Awaited<ReturnType<typeof run>>) => describeImport(result.chapter, result.report, result.summaries);

describe("importChapter med innholdsfil", () => {
  it("legger inn én klar versjon per delkapittel ved første import", async () => {
    const data = await setup();
    const result = await run(data, sixSubchapters, { content: await contentFor(six) });
    expect(statuses(result)).toEqual(Array(6).fill("created"));
    expect(data.summaryVersions).toHaveLength(6);
    expect(data.summaryVersions[0]).toMatchObject({
      subchapterId: data.chapters[0].subchapters[0].id,
      status: "klart",
      text: "Sammendrag av 1.1.",
      modelId: "claude-code/test-modell",
      promptVersion: "innhold.v2",
      inputHash: await hashOf("Notat en"),
      error: null,
    });
    expect(lines(result)[1]).toBe("  1.1 En: opprettet, sammendrag lagt inn");
    expect(reportImport(result)).toMatchObject({ stderr: [], code: 0 });
  });

  it("lager ingen ny versjon når tekst og hash er uendret", async () => {
    const data = await setup();
    const content = await contentFor(six);
    await run(data, sixSubchapters, { content });
    const result = await run(data, sixSubchapters, { content });
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
    expect(reportImport(result).code).toBe(0);
  });

  it("lager ny klar versjon når teksten er rettet med samme hash, og beholder den gamle", async () => {
    const data = await setup();
    await run(data, sixSubchapters, { content: await contentFor(six) });
    const fixed = await contentFor(six, (n) => (n === "1.2" ? "Rettet sammendrag." : `Sammendrag av ${n}.`));
    const result = await run(data, sixSubchapters, { content: fixed });
    expect(statuses(result)).toEqual(["unchanged", "created", "unchanged", "unchanged", "unchanged", "unchanged"]);
    const id = data.chapters[0].subchapters[1].id;
    expect(data.summaryVersions.filter((v) => v.subchapterId === id).map((v) => v.text)).toEqual([
      "Sammendrag av 1.2.",
      "Rettet sammendrag.",
    ]);
  });

  it("sier «sammendrag utdatert», lagrer ingenting og gir kode 1 når notatet er endret", async () => {
    const data = await setup();
    const content = await contentFor(six);
    await run(data, sixSubchapters, { content });
    const changed = sixSubchapters.replace("Notat to", "Notat to, utvidet");
    const result = await run(data, changed, { content });
    expect(statuses(result)).toEqual(["unchanged", "outdated", "unchanged", "unchanged", "unchanged", "unchanged"]);
    expect(data.summaryVersions).toHaveLength(6);
    expect(lines(result)[2]).toBe("  1.2 To: oppdatert, sammendrag utdatert");
    expect(reportImport(result)).toMatchObject({ stderr: [importMessages.summariesOutdated], code: 1 });
  });

  it("lager ny versjon med ny hash når notatet er endret og teksten er den samme", async () => {
    const data = await setup();
    await run(data, sixSubchapters, { content: await contentFor(six) });
    const changedSix = six.map(([n, t, note]): Sub => [n, t, n === "1.2" ? "Notat to, utvidet" : note]);
    const result = await run(data, notesFile(changedSix), { content: await contentFor(changedSix) });
    expect(statuses(result)).toEqual(["unchanged", "created", "unchanged", "unchanged", "unchanged", "unchanged"]);
    const id = data.chapters[0].subchapters[1].id;
    const newest = data.summaryVersions.filter((v) => v.subchapterId === id).at(-1);
    expect(newest).toMatchObject({ text: "Sammendrag av 1.2.", inputHash: await hashOf("Notat to, utvidet") });
  });

  it("gjør alt utdatert når nøkkelbegrepene endres", async () => {
    const data = await setup();
    const content = await contentFor(six);
    await run(data, sixSubchapters, { content });
    const withConcepts = sixSubchapters.replace(
      "## Fordelt på delkapitler",
      "## Nøkkelbegreper\n\n- begrep\n\n## Fordelt på delkapitler",
    );
    const result = await run(data, withConcepts, { content });
    expect(statuses(result)).toEqual(Array(6).fill("outdated"));
    expect(data.summaryVersions).toHaveLength(6);
  });

  it("gjør alt utdatert når læringsmålene endres", async () => {
    const data = await setup();
    const result = await run(data, notesFile(six, "- nytt mål"), { content: await contentFor(six) });
    expect(statuses(result)).toEqual(Array(6).fill("outdated"));
    expect(data.summaryVersions).toEqual([]);
  });

  it("gjør alt utdatert når instruksjonen i filen er en annen enn importen kjenner", async () => {
    const data = await setup();
    const entries = await Promise.all(six.map(async ([n, , note]) => ({ number: n, text: "Tekst.", hash: await hashOf(note) })));
    const content = contentFile(entries, "instruksjon: innhold.v3\nmodell: claude-code/test-modell");
    const result = await run(data, sixSubchapters, { content });
    expect(statuses(result)).toEqual(Array(6).fill("outdated"));
    expect(data.summaryVersions).toEqual([]);
  });

  it("sier «mangler innhold» med kode 0 for delkapitler som ikke er i filen", async () => {
    const data = await setup();
    const result = await run(data, sixSubchapters, { content: await contentFor(six.slice(0, 2)) });
    expect(statuses(result)).toEqual(["created", "created", "missing", "missing", "missing", "missing"]);
    expect(lines(result)[3]).toBe("  1.3 Tre: opprettet, mangler innhold");
    expect(reportImport(result)).toMatchObject({ stderr: [], code: 0 });
  });

  it("sier «mangler innhold» med kode 0 når innholdsfilen ikke finnes", async () => {
    const data = await setup();
    const result = await run(data, sixSubchapters, { content: null });
    expect(statuses(result)).toEqual(Array(6).fill("missing"));
    expect(data.summaryVersions).toEqual([]);
    expect(data.chapters[0].subchapters).toHaveLength(6);
    expect(reportImport(result).code).toBe(0);
    const again = await run(data, sixSubchapters, {});
    expect(lines(again).at(-1)).toBe(importMessages.allUnchanged);
  });

  it("legger inn det ene delkapittelet på nytt med force", async () => {
    const data = await setup();
    const content = await contentFor(six);
    await run(data, sixSubchapters, { content });
    const result = await run(data, sixSubchapters, { content, force: "1.2" });
    expect(statuses(result)).toEqual(["unchanged", "created", "unchanged", "unchanged", "unchanged", "unchanged"]);
    expect(data.summaryVersions).toHaveLength(7);
  });

  it("skriver ingenting når force gjelder et delkapittel som mangler i innholdsfilen", async () => {
    const data = await setup();
    for (const content of [await contentFor(six.slice(0, 1)), null]) {
      expect(await importChapter(data, sixSubchapters, target, { content, force: "1.2" })).toEqual({
        status: "invalid",
        file: "content",
        errors: [importMessages.forceNoContent("1.2")],
      });
    }
    expect(data.chapterWrites).toBe(0);
  });

  it("skriver ingenting når force gjelder et delkapittel som ikke er i notatfilen eller uten notater", async () => {
    const data = await setup();
    const file = notesFile([
      ["1.1", "En", "Notat en"],
      ["1.2", "To", "*Ingen notater ennå.*"],
    ]);
    expect(await importChapter(data, file, target, { force: "1.9" })).toEqual({
      status: "invalid",
      file: "notes",
      errors: [importMessages.forceNotFound("1.9")],
    });
    expect(await importChapter(data, file, target, { force: "1.2" })).toEqual({
      status: "invalid",
      file: "notes",
      errors: [importMessages.forceNoNotes("1.2")],
    });
    expect(data.chapterWrites).toBe(0);
  });

  it("skriver verken kapitler eller sammendrag når innholdsfilen er ugyldig", async () => {
    const data = await setup();
    const content = (await contentFor(six)).replace("Sammendrag av 1.3.", Array(601).fill("ord").join(" "));
    const result = await importChapter(data, sixSubchapters, target, { content });
    expect(result.status === "invalid" && result.file).toBe("content");
    expect(result.status === "invalid" && result.errors).toEqual([
      expect.stringMatching(/^Linje \d+: delkapittel 1\.3: Sammendraget har 601 ord, mer enn 600\.$/),
    ]);
    expect(data.chapterWrites).toBe(0);
    expect(data.summaryVersions).toEqual([]);
  });

  it("gir «mangler notater» for delkapitler uten notater", async () => {
    const data = await setup();
    const subs: Sub[] = [
      ["1.1", "En", "Notat en"],
      ["1.2", "To", "*Ingen notater ennå.*"],
    ];
    const result = await run(data, notesFile(subs), { content: await contentFor(subs.slice(0, 1)) });
    expect(lines(result)).toEqual([
      "Kapittel 1 Kapittel én: opprettet",
      "  1.1 En: opprettet, sammendrag lagt inn",
      "  1.2 To: opprettet, mangler notater",
    ]);
  });

  it("legger aldri inn sammendrag for fjernede delkapitler", async () => {
    const data = await setup();
    await run(data, sixSubchapters, { content: await contentFor(six) });
    const withoutSix = sixSubchapters.replace("### 1.6 Seks\n\nNotat seks\n", "");
    const result = await run(data, withoutSix, { content: await contentFor(six.slice(0, 5)) });
    expect(lines(result).at(-1)).toBe("  1.6: fjernet");
    expect(result.summaries.map((s) => s.number)).not.toContain("1.6");
  });

  it("sier fra og gir kode 1 når en versjon ikke kan lagres", async () => {
    const data = await setup();
    data.summaryWritesDown = true;
    const subs = six.slice(0, 2);
    const result = await run(data, notesFile(subs), { content: await contentFor(subs) });
    expect(result.summaries).toEqual([
      { number: "1.1", status: "failed", reason: importMessages.summaryNotSaved },
      { number: "1.2", status: "failed", reason: importMessages.summaryNotSaved },
    ]);
    expect(reportImport(result)).toMatchObject({ stderr: [importMessages.summariesFailed], code: 1 });
  });

  it("gir feilet for delkapitler med notater når versjonene ikke kan leses", async () => {
    const data = await setup();
    data.summaryReadsDown = true;
    const subs: Sub[] = [
      ["1.1", "En", "Notat en"],
      ["1.2", "To", "*Ingen notater ennå.*"],
    ];
    const result = await run(data, notesFile(subs), { content: await contentFor(subs.slice(0, 1)) });
    expect(result.summaries).toEqual([
      { number: "1.1", status: "failed", reason: importMessages.unavailable },
      { number: "1.2", status: "noNotes" },
    ]);
    expect(importExitCode(result.summaries)).toBe(1);
  });
});

describe("importExitCode", () => {
  it("gir 1 bare når et sammendrag er utdatert eller feilet", () => {
    expect(
      importExitCode([
        { number: "1.1", status: "created" },
        { number: "1.2", status: "unchanged" },
        { number: "1.3", status: "missing" },
        { number: "1.4", status: "noNotes" },
      ]),
    ).toBe(0);
    expect(importExitCode([{ number: "1.1", status: "outdated" }])).toBe(1);
    expect(importExitCode([{ number: "1.1", status: "failed", reason: "Nede." }])).toBe(1);
  });
});

describe("contentHashes", () => {
  it("gir hashen per delkapittel med notater, lik den importen regner", async () => {
    const file = notesFile([
      ["1.1", "En", "Notat en"],
      ["1.2", "To", "*Ingen notater ennå.*"],
    ]);
    expect(await contentHashes(file, target)).toEqual({
      ok: true,
      hashes: [{ number: "1.1", inputHash: await hashOf("Notat en") }],
    });
  });

  it("gir feilene når notatfilen er ugyldig eller gjelder et annet kapittel", async () => {
    expect(await contentHashes(sixSubchapters, { courseCode: "IBE430", chapterNumber: 2 })).toEqual({
      ok: false,
      errors: ["Linje 3: kapittel er 1 i frontmatter, men filen er kapittel-2.md."],
    });
  });
});

describe("de ekte filene for IBE430 kapittel 1", () => {
  it("legger inn seks sammendrag, og andre kjøring gir «sammendrag uendret» for alle", async () => {
    const data = await setup();
    const first = await run(data, kapittel1, { content: innhold1 });
    expect(statuses(first)).toEqual(Array(6).fill("created"));
    expect(reportImport(first).code).toBe(0);
    const second = await run(data, kapittel1, { content: innhold1 });
    expect(statuses(second)).toEqual(Array(6).fill("unchanged"));
    expect(lines(second).at(-1)).toBe(importMessages.allUnchanged);
  });
});
