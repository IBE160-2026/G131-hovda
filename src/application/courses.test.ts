import { describe, expect, it } from "vitest";
import type { CourseInput } from "@/domain/course";
import { chooseCourse, removeCourse, saveCourse } from "./courses";
import { MemoryDataSource } from "./testing/MemoryDataSource";

function input(code: string, name = `Emne ${code}`): CourseInput {
  return { code, name, learningOutcomes: "LU", examForm: "Skriftlig" };
}

describe("saveCourse", () => {
  it("lagrer et nytt emne med normalisert kode", async () => {
    const data = new MemoryDataSource();
    const result = await saveCourse(data, input("ibe430 "));
    expect(result).toMatchObject({ status: "ok", course: { code: "IBE430" } });
    expect(data.courses.map((c) => c.code)).toEqual(["IBE430"]);
  });

  it("gjør det første emnet aktivt", async () => {
    const data = new MemoryDataSource();
    const result = await saveCourse(data, input("IBE430"));
    expect(result.status === "ok" && data.activeId).toBe(result.status === "ok" && result.course.id);
  });

  it("lar det aktive emnet være når eieren legger til flere", async () => {
    const data = new MemoryDataSource();
    await saveCourse(data, input("IBE430"));
    const first = data.activeId;
    await saveCourse(data, input("IBE160"));
    await saveCourse(data, input("IBE151"));
    expect(data.activeId).toBe(first);
    expect(data.courses).toHaveLength(3);
  });

  it("gir duplicate med normalisert kode når eieren har koden fra før", async () => {
    const data = new MemoryDataSource();
    await saveCourse(data, input("IBE430"));
    expect(await saveCourse(data, input("ibe430"))).toEqual({ status: "duplicate", code: "IBE430" });
    expect(data.courses).toHaveLength(1);
  });

  it("gir invalid uten å skrive noe", async () => {
    const data = new MemoryDataSource();
    const result = await saveCourse(data, input("IBE 430", "  "));
    expect(result.status).toBe("invalid");
    expect(data.courses).toHaveLength(0);
  });

  it("endrer et emne", async () => {
    const data = new MemoryDataSource();
    const created = await saveCourse(data, input("IBE430"));
    const id = created.status === "ok" ? created.course.id : "";
    const result = await saveCourse(data, input("ibe431", "Nytt navn"), id);
    expect(result).toMatchObject({ status: "ok", course: { id, code: "IBE431", name: "Nytt navn" } });
  });

  it("gir duplicate når en endring tar koden til et annet emne", async () => {
    const data = new MemoryDataSource();
    await saveCourse(data, input("IBE430"));
    const second = await saveCourse(data, input("IBE160"));
    const id = second.status === "ok" ? second.course.id : "";
    expect(await saveCourse(data, input("IBE430"), id)).toEqual({ status: "duplicate", code: "IBE430" });
  });

  it("gir notFound når emnet som skal endres, ikke finnes", async () => {
    const data = new MemoryDataSource();
    expect(await saveCourse(data, input("IBE430"), "finnes-ikke")).toEqual({ status: "notFound" });
  });

  it("gir unavailable når databasen er nede", async () => {
    const data = new MemoryDataSource();
    data.down = true;
    expect(await saveCourse(data, input("IBE430"))).toEqual({ status: "unavailable" });
  });
});

describe("removeCourse", () => {
  async function threeCourses() {
    const data = new MemoryDataSource();
    for (const code of ["IBE430", "IBE160", "IBE151"]) await saveCourse(data, input(code));
    return data;
  }

  it("sletter et emne som ikke er aktivt, og lar det aktive være", async () => {
    const data = await threeCourses();
    const active = data.activeId;
    const other = data.courses.find((c) => c.id !== active)!;
    expect(await removeCourse(data, other.id)).toEqual({ status: "ok" });
    expect(data.courses).toHaveLength(2);
    expect(data.activeId).toBe(active);
  });

  it("gjør et annet emne aktivt når det aktive slettes", async () => {
    const data = await threeCourses();
    const active = data.activeId!;
    await removeCourse(data, active);
    expect(data.activeId).not.toBeNull();
    expect(data.activeId).not.toBe(active);
    expect(data.courses.some((c) => c.id === data.activeId)).toBe(true);
  });

  it("gir ingen aktivt emne når det siste slettes", async () => {
    const data = new MemoryDataSource();
    await saveCourse(data, input("IBE430"));
    await removeCourse(data, data.activeId!);
    expect(data.courses).toHaveLength(0);
    expect(data.activeId).toBeNull();
  });

  it("gir unavailable når databasen er nede", async () => {
    const data = await threeCourses();
    data.down = true;
    expect(await removeCourse(data, data.activeId!)).toEqual({ status: "unavailable" });
  });
});

describe("chooseCourse", () => {
  it("gjør det valgte emnet aktivt", async () => {
    const data = new MemoryDataSource();
    await saveCourse(data, input("IBE430"));
    const second = await saveCourse(data, input("IBE160"));
    const id = second.status === "ok" ? second.course.id : "";
    expect(await chooseCourse(data, id)).toEqual({ status: "ok" });
    expect(data.activeId).toBe(id);
  });

  it("gir notFound for et ukjent emne og endrer ikke aktivt emne", async () => {
    const data = new MemoryDataSource();
    await saveCourse(data, input("IBE430"));
    const active = data.activeId;
    expect(await chooseCourse(data, "finnes-ikke")).toEqual({ status: "notFound" });
    expect(data.activeId).toBe(active);
  });
});
