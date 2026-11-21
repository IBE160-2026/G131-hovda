/// <reference types="vite/client" />
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import innhold1 from "../../../../../../../G131-hovda/notater/IBE430/kapittel-1.innhold.md?raw";
import kapittel1 from "../../../../../../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import { importChapter } from "@/application/importChapter";
import { MemoryDataSource } from "@/application/testing/MemoryDataSource";

const getDataSourceForRender = vi.fn();
vi.mock("@/composition/server", () => ({ getDataSourceForRender, getDataSource: vi.fn() }));

const { SubchapterSummary } = await import("./page");
const { noSummaryMessage, outdatedMessage, subchapterNotFoundMessage, unavailableMessage } = await import(
  "../../../formState"
);

async function render(data: MemoryDataSource, id: string, nummer: string) {
  getDataSourceForRender.mockResolvedValue(data);
  return renderToStaticMarkup(await SubchapterSummary({ params: Promise.resolve({ id, nummer }) }));
}

/** IBE430 med kapittel 1 importert fra de ekte filene. */
async function imported(content: string | null = innhold1) {
  const data = new MemoryDataSource();
  const created = await data.createCourse({ code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "", examForm: "" });
  if (created.status !== "ok") throw new Error("emnet ble ikke opprettet");
  const result = await importChapter(data, kapittel1, { courseCode: "IBE430", chapterNumber: 1 }, { content });
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  return { data, courseId: created.value.id };
}

/** Teksten uten tagger, slik den står på skjermen. */
const visibleText = (html: string) => html.replace(/<[^>]+>/g, "\n");

describe("lesesiden for sammendraget", () => {
  beforeEach(() => getDataSourceForRender.mockReset());

  it("viser tittel, kapittel og sammendraget for 1.1 med fet tekst og punktlister", async () => {
    const { data, courseId } = await imported();
    const html = await render(data, courseId, "1.1");
    expect(html).toContain("Det moderne globale forretningsmiljøet");
    expect(html).toMatch(/Kapittel 1: /);
    expect(html).toContain("<h1");
    expect(html).toContain("<strong>forretningsprosess</strong>");
    expect(html).toContain("<ul");
    expect(html).toContain("<li><strong>Anskaffelse:</strong>");
    const text = visibleText(html);
    expect(text).not.toContain("**");
    expect(text).not.toMatch(/(^|\n)\s*- /);
    expect(html).not.toContain(outdatedMessage);
  });

  it("viser alle seks delkapitlene i kapittel 1 uten Markdown-tegn", async () => {
    const { data, courseId } = await imported();
    for (const nummer of ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"]) {
      const text = visibleText(await render(data, courseId, nummer));
      expect(text).not.toContain(noSummaryMessage);
      expect(text).not.toContain("**");
      expect(text).not.toMatch(/(^|\n)\s*- /);
    }
  });

  it("viser merknaden når notatet er endret etter importen", async () => {
    const { data, courseId } = await imported();
    data.chapters[0].subchapters[0].noteText += "\n\nNy linje.";
    const html = await render(data, courseId, "1.1");
    expect(html).toContain(outdatedMessage);
    expect(html).toContain("<strong>forretningsprosess</strong>");
  });

  it("viser merknaden når notatet er tømt etter importen", async () => {
    const { data, courseId } = await imported();
    data.chapters[0].subchapters[0].noteText = "*Ingen notater ennå.*";
    const html = await render(data, courseId, "1.1");
    expect(html).toContain(outdatedMessage);
    expect(html).toContain("<strong>forretningsprosess</strong>");
  });

  it("escaper HTML i sammendraget og setter linjeskift mellom linjene i et avsnitt", async () => {
    const { data, courseId } = await imported();
    const [sub] = data.chapters[0].subchapters;
    await data.addSummaryVersion({
      subchapterId: sub.id,
      status: "klart",
      text: "<b>fet</b> **ekte**\n\nLinje en\nlinje to",
      modelId: "claude-code/test",
      promptVersion: "innhold.v1",
      inputHash: data.summaryVersions[0].inputHash,
    });
    const html = await render(data, courseId, "1.1");
    expect(html).toContain("&lt;b&gt;fet&lt;/b&gt;");
    expect(html).not.toContain("<b>");
    expect(html).toContain("<strong>ekte</strong>");
    expect(html).toContain("<span>Linje en</span></span><span><br/><span>linje to</span>");
  });

  it("viser «Ta quizen» bare når både sammendraget og banken er klare", async () => {
    const ready = await imported();
    expect(await render(ready.data, ready.courseId, "1.1")).toContain("Ta quizen");
    const none = await imported(null);
    expect(await render(none.data, none.courseId, "1.1")).not.toContain("Ta quizen");
  });

  it("sier fra når delkapittelet ikke har noe sammendrag", async () => {
    const { data, courseId } = await imported(null);
    const html = await render(data, courseId, "1.1");
    expect(html).toContain(noSummaryMessage);
    expect(html).toContain("Det moderne globale forretningsmiljøet");
  });

  it("viser «Fant ikke delkapittelet.» og lenke til startsiden for ukjent emne eller nummer", async () => {
    const { data, courseId } = await imported();
    for (const [id, nummer] of [
      ["ukjent", "1.1"],
      [courseId, "9.9"],
    ]) {
      const html = await render(data, id, nummer);
      expect(html).toContain(subchapterNotFoundMessage);
      expect(html).toContain('href="/start"');
      expect(html).not.toContain("forretningsprosess");
    }
  });

  it("viser feilmeldingen når databasen ikke svarer", async () => {
    const { data, courseId } = await imported();
    data.summaryReadsDown = true;
    const html = await render(data, courseId, "1.1");
    expect(html).toContain(unavailableMessage);
    expect(html).toContain('role="alert"');
  });
});
