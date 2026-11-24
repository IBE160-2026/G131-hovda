import { describe, expect, it } from "vitest";
import { getSubchapterSummary, listChapterOverview } from "@/application/chapterOverview";
import demoFile from "../../../demo-data/demo.json";
import { DemoDataSource } from "./dataSource";

const courseId = "demo-ibe430";

describe("DemoDataSource med demo-data/demo.json", () => {
  const data = new DemoDataSource(demoFile);

  it("gir IBE430 som eneste emne og som aktivt emne", async () => {
    const courses = await data.listCourses();
    expect(courses.status).toBe("ok");
    if (courses.status !== "ok") return;
    expect(courses.value.map((c) => c.code)).toEqual(["IBE430"]);
    expect(await data.getActiveCourse()).toEqual({ status: "ok", value: courses.value[0] });
    expect(await data.getCourse(courseId)).toEqual({ status: "ok", value: courses.value[0] });
    expect(await data.getCourse("x")).toEqual({ status: "ok", value: null });
  });

  it("gir kapittel 1 (1.1–1.6) og 2 (2.1), alle «klart» og ikke gjennomført", async () => {
    const overview = await listChapterOverview(data, courseId);
    expect(overview.status).toBe("ok");
    if (overview.status !== "ok") return;
    expect(overview.value.map((c) => [c.number, c.subchapters.map((s) => s.number)])).toEqual([
      [1, ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"]],
      [2, ["2.1"]],
    ]);
    const subs = overview.value.flatMap((c) => c.subchapters);
    expect(subs.every((s) => s.status === "klart" && s.summaryStatus === "klart" && !s.completed)).toBe(true);
  });

  it("gir ingen kapitler for et ukjent emne", async () => {
    expect(await listChapterOverview(data, "x")).toEqual({ status: "ok", value: [] });
  });

  it("gir sammendraget fra fila for 1.2, klart og ikke meldt", async () => {
    const result = await getSubchapterSummary(data, courseId, "1.2");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const expected = demoFile.chapters[0].subchapters.find((s) => s.number === "1.2")!;
    expect(result.subchapter.title).toBe(expected.title);
    expect(result.summary?.text).toBe(expected.summary);
    expect(result.summaryStatus).toBe("klart");
    expect(result.reported).toBe(false);
  });

  it("gir `notFound` for et ukjent delkapittel eller emne", async () => {
    expect(await getSubchapterSummary(data, courseId, "9.9")).toEqual({ status: "notFound" });
    expect(await getSubchapterSummary(data, "x", "1.2")).toEqual({ status: "notFound" });
  });

  it("gir de aktive spørsmålene i banken", async () => {
    const bank = await data.listQuizBank("demo-1.2");
    expect(bank.status === "ok" && bank.value.length).toBeGreaterThanOrEqual(20);
  });

  it("lagrer aldri noe", async () => {
    expect(await data.createCourse()).toEqual({ status: "unavailable" });
    expect(await data.setActiveCourse()).toEqual({ status: "unavailable" });
    expect(await data.reportSummaryVersion()).toEqual({ status: "unavailable" });
    expect(await data.createQuiz()).toEqual({ status: "unavailable" });
    expect(await data.listCourses()).toEqual({ status: "ok", value: [expect.objectContaining({ code: "IBE430" })] });
  });
});

describe("DemoDataSource med en ugyldig fil", () => {
  const data = new DemoDataSource({ ...demoFile, schemaVersion: 99 });

  it("gir `unavailable` på alle lesinger", async () => {
    const unavailable = { status: "unavailable" };
    expect(await data.listCourses()).toEqual(unavailable);
    expect(await data.getCourse(courseId)).toEqual(unavailable);
    expect(await data.getActiveCourse()).toEqual(unavailable);
    expect(await data.listChapters(courseId)).toEqual(unavailable);
    expect(await data.listSummaryVersions(["demo-1.2"])).toEqual(unavailable);
    expect(await data.listQuestionBanks(["demo-1.2"])).toEqual(unavailable);
    expect(await data.listQuizBank("demo-1.2")).toEqual(unavailable);
    expect(await listChapterOverview(data, courseId)).toEqual(unavailable);
    expect(await getSubchapterSummary(data, courseId, "1.2")).toEqual(unavailable);
  });

  it("gir `unavailable` for noe som ikke er en demofil", async () => {
    expect(await new DemoDataSource(null).listCourses()).toEqual({ status: "unavailable" });
  });
});
