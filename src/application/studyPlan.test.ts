import { describe, expect, it } from "vitest";
import { studyPlanMessages } from "@/domain/studyPlan";
import type { Clock } from "./clock";
import { startPlan } from "./studyPlan";
import { MemoryDataSource } from "./testing/MemoryDataSource";

const clockAt = (today: string): Clock => ({ today: () => today });
const thursday = clockAt("2026-11-26");

/** Et emne med ett kapittel og `count` aktive delkapitler, og et fjernet delkapittel. */
async function setup(count = 9) {
  const data = new MemoryDataSource();
  const created = await data.createCourse({ code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "", examForm: "" });
  if (created.status !== "ok") throw new Error("emnet ble ikke opprettet");
  const courseId = created.value.id;
  const subchapters = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ number: `1.${i + 1}`, title: `Del ${i + 1}`, noteText: "Notat" }));
  await data.saveChapter(courseId, { number: 1, title: "En", learningGoals: "", keyConcepts: "", subchapters: subchapters(count + 1) });
  // Det siste delkapittelet fjernes, så det ikke er aktivt.
  await data.saveChapter(courseId, { number: 1, title: "En", learningGoals: "", keyConcepts: "", subchapters: subchapters(count) });
  const ids = data.chapters[0].subchapters.map((s) => s.id);
  const removedId = ids[count];
  return { data, courseId, ids: ids.slice(0, count), removedId };
}

function complete(data: MemoryDataSource, subchapterId: string, completedAt: string) {
  data.completions.push({ subchapterId, quizId: `z-${subchapterId}`, completedAt });
}

describe("startPlan", () => {
  it("lager første plan med planstart i dag og G₀, R₀ og D fra øyeblikksbildet", async () => {
    const { data, courseId, ids, removedId } = await setup();
    for (const id of ids.slice(0, 7)) complete(data, id, "2026-11-20T10:00:00Z");
    complete(data, removedId, "2026-11-20T10:00:00Z");

    const result = await startPlan(data, thursday, courseId, { examDate: "2026-12-10", planStart: "" });
    const plan = { courseId, examDate: "2026-12-10", planStart: "2026-11-26", g0: 7, r0: 2, d: 10 };
    expect(result).toEqual({ status: "ok", plan });
    expect(data.studyPlans).toEqual([plan]);
  });

  it("godtar en planstart i fortiden", async () => {
    const { data, courseId, ids } = await setup();
    complete(data, ids[0], "2026-11-20T10:00:00Z");
    const result = await startPlan(data, thursday, courseId, { examDate: "2026-12-10", planStart: "2026-10-01" });
    expect(result).toEqual({
      status: "ok",
      plan: { courseId, examDate: "2026-12-10", planStart: "2026-10-01", g0: 0, r0: 9, d: 50 },
    });
  });

  it("teller ikke et delkapittel gjennomført natt til planstart", async () => {
    const { data, courseId, ids } = await setup();
    complete(data, ids[0], "2026-11-25T23:30:00Z");
    const result = await startPlan(data, thursday, courseId, { examDate: "2026-12-10", planStart: "" });
    expect(result).toMatchObject({ status: "ok", plan: { g0: 0, r0: 9 } });
  });

  it("erstatter planen med planstart i dag når eksamensdatoen endres", async () => {
    const { data, courseId, ids } = await setup();
    await startPlan(data, clockAt("2026-11-20"), courseId, { examDate: "2026-12-10", planStart: "" });
    for (const id of ids.slice(0, 3)) complete(data, id, "2026-11-23T10:00:00Z");

    // Skjemaet er forhåndsutfylt med planstart 20.11, men en ny eksamensdato starter planen i dag.
    const result = await startPlan(data, thursday, courseId, { examDate: "2026-12-11", planStart: "2026-11-20" });
    const plan = { courseId, examDate: "2026-12-11", planStart: "2026-11-26", g0: 3, r0: 6, d: 11 };
    expect(result).toEqual({ status: "ok", plan });
    expect(data.studyPlans).toEqual([plan]);
  });

  it("bruker en ny planstart eieren har valgt sammen med ny eksamensdato", async () => {
    const { data, courseId } = await setup();
    await startPlan(data, thursday, courseId, { examDate: "2026-12-10", planStart: "" });
    const result = await startPlan(data, thursday, courseId, { examDate: "2026-12-11", planStart: "2026-11-23" });
    expect(result).toMatchObject({ status: "ok", plan: { examDate: "2026-12-11", planStart: "2026-11-23", d: 14 } });
  });

  it("lager et nytt øyeblikksbilde når bare planstart endres", async () => {
    const { data, courseId } = await setup();
    await startPlan(data, thursday, courseId, { examDate: "2026-12-10", planStart: "" });
    const result = await startPlan(data, thursday, courseId, { examDate: "2026-12-10", planStart: "2026-11-23" });
    expect(result).toMatchObject({ status: "ok", plan: { planStart: "2026-11-23", d: 13 } });
    expect(data.studyPlans).toHaveLength(1);
  });

  it("lagrer ingenting når eksamensdato og planstart er uendret", async () => {
    const { data, courseId } = await setup();
    const first = await startPlan(data, thursday, courseId, { examDate: "2026-12-10", planStart: "" });
    if (first.status !== "ok") throw new Error(first.status);
    const writes = data.planWrites;

    const later = clockAt("2026-11-30");
    expect(await startPlan(data, later, courseId, { examDate: "2026-12-10", planStart: "2026-11-26" })).toEqual({
      status: "unchanged",
      plan: first.plan,
    });
    expect(data.planWrites).toBe(writes);
  });

  it("lagrer ingenting når eksamen ikke er etter planstart", async () => {
    const { data, courseId } = await setup();
    expect(await startPlan(data, thursday, courseId, { examDate: "2026-11-20", planStart: "" })).toEqual({
      status: "invalid",
      errors: { examDate: studyPlanMessages.examNotAfterStart },
    });
    expect(data.planWrites).toBe(0);
  });

  it("lagrer ingenting uten studiedager før eksamen", async () => {
    const { data, courseId } = await setup();
    expect(await startPlan(data, thursday, courseId, { examDate: "2026-11-30", planStart: "2026-11-28" })).toEqual({
      status: "invalid",
      errors: { examDate: studyPlanMessages.noStudyDays },
    });
    expect(data.planWrites).toBe(0);
  });

  it("gir notFound for et emne som ikke finnes", async () => {
    const { data } = await setup();
    expect(await startPlan(data, thursday, "c99", { examDate: "2026-12-10", planStart: "" })).toEqual({
      status: "notFound",
    });
    expect(data.planWrites).toBe(0);
  });

  it("gir unavailable og lagrer ingenting når databasen ikke svarer", async () => {
    const { data, courseId } = await setup();
    data.planWritesDown = true;
    expect(await startPlan(data, thursday, courseId, { examDate: "2026-12-10", planStart: "" })).toEqual({
      status: "unavailable",
    });
    expect(data.studyPlans).toEqual([]);

    data.planWritesDown = false;
    data.completionReadsDown = true;
    expect(await startPlan(data, thursday, courseId, { examDate: "2026-12-10", planStart: "" })).toEqual({
      status: "unavailable",
    });
    expect(data.studyPlans).toEqual([]);

    data.down = true;
    expect(await startPlan(data, thursday, courseId, { examDate: "2026-12-10", planStart: "" })).toEqual({
      status: "unavailable",
    });
  });
});
