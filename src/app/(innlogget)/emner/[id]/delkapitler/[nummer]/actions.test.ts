/// <reference types="vite/client" />
import { beforeEach, describe, expect, it, vi } from "vitest";
import innhold1 from "../../../../../../../G131-hovda/notater/IBE430/kapittel-1.innhold.md?raw";
import kapittel1 from "../../../../../../../G131-hovda/notater/IBE430/kapittel-1.md?raw";
import { importChapter } from "@/application/importChapter";
import { MemoryDataSource } from "@/application/testing/MemoryDataSource";

const getDataSource = vi.fn();
vi.mock("@/composition/server", () => ({ getDataSource }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { reportSummaryAction } = await import("./actions");
const { commentTooLongMessage, initialReportFormState, unavailableMessage } = await import("../../../formState");

async function imported() {
  const data = new MemoryDataSource();
  const created = await data.createCourse({ code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "", examForm: "" });
  if (created.status !== "ok") throw new Error("emnet ble ikke opprettet");
  const result = await importChapter(data, kapittel1, { courseCode: "IBE430", chapterNumber: 1 }, { content: innhold1 });
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  getDataSource.mockResolvedValue(data);
  return { data, courseId: created.value.id, versionId: data.summaryVersions[0].id };
}

function comment(text: string) {
  const form = new FormData();
  form.set("kommentar", text);
  return form;
}

/** Kjører en handling og gir adressen den sender til. */
async function redirectOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    const match = /^redirect:(.*)$/.exec((error as Error).message);
    if (match) return match[1];
    throw error;
  }
  throw new Error("ingen redirect");
}

const path = (courseId: string) => `/emner/${courseId}/delkapitler/1.1`;

describe("reportSummaryAction", () => {
  beforeEach(() => getDataSource.mockReset());

  it("melder sammendraget og sender tilbake til lesesiden", async () => {
    const { data, courseId, versionId } = await imported();
    const report = () => reportSummaryAction(courseId, "1.1", versionId, initialReportFormState, comment(" Feil definisjon "));
    expect(await redirectOf(report)).toBe(path(courseId));
    expect(data.summaryReports).toEqual([expect.objectContaining({ summaryVersionId: versionId, comment: "Feil definisjon" })]);
    // Å melde på nytt gir ingen ny rad.
    expect(await redirectOf(report)).toBe(path(courseId));
    expect(data.summaryReports).toHaveLength(1);
  });

  it("lagrer ingenting fra en gammel side, og laster lesesiden på nytt", async () => {
    const { data, courseId, versionId } = await imported();
    const old = data.summaryVersions[0];
    await data.addSummaryVersion({
      subchapterId: old.subchapterId,
      status: "klart",
      text: "Rettet.",
      modelId: old.modelId,
      promptVersion: old.promptVersion,
      inputHash: old.inputHash,
    });
    expect(
      await redirectOf(() => reportSummaryAction(courseId, "1.1", versionId, initialReportFormState, comment("Feil"))),
    ).toBe(path(courseId));
    expect(data.summaryReports).toEqual([]);
  });

  it("beholder teksten og viser feilen ved feltet når kommentaren er for lang", async () => {
    const { data, courseId, versionId } = await imported();
    const long = "x".repeat(501);
    const state = await reportSummaryAction(courseId, "1.1", versionId, initialReportFormState, comment(long));
    expect(state).toEqual({ comment: long, commentError: commentTooLongMessage, formError: null, attempt: 1 });
    expect(data.summaryReports).toEqual([]);
  });

  it("viser feilmeldingen i skjemaet når rapporten ikke kan lagres", async () => {
    const { data, courseId, versionId } = await imported();
    data.summaryReportWritesDown = true;
    const state = await reportSummaryAction(courseId, "1.1", versionId, initialReportFormState, comment("Feil"));
    expect(state).toEqual({ comment: "Feil", commentError: null, formError: unavailableMessage, attempt: 1 });
    expect(data.summaryReports).toEqual([]);
  });

  it("sender uinnloggede til forsiden uten å melde noe", async () => {
    getDataSource.mockResolvedValue(null);
    expect(
      await redirectOf(() => reportSummaryAction("c1", "1.1", "s1", initialReportFormState, comment("x"))),
    ).toBe("/");
  });
});
