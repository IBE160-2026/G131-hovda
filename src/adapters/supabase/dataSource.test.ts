import { describe, expect, it } from "vitest";
import { SupabaseDataSource, toWriteFailure, type SupabaseDataClient } from "./dataSource";

type Call = [method: string, ...args: unknown[]];
type Query = { table: string; calls: Call[] };
type Response = { data?: unknown; error?: { code?: string; message?: string } | null };

// Falsk Supabase-klient: hver kjede av kall registreres, og svaret kommer fra `respond`.
function fakeClient(respond: (query: Query) => Response | Promise<Response>) {
  const queries: Query[] = [];
  const client = {
    from(table: string) {
      const query: Query = { table, calls: [] };
      queries.push(query);
      const builder: Record<string, unknown> = {
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve()
            .then(() => respond(query))
            .then((r) => ({ data: r.data ?? null, error: r.error ?? null }))
            .then(resolve, reject);
        },
      };
      for (const method of ["select", "insert", "update", "upsert", "delete", "eq", "order", "single", "maybeSingle"]) {
        builder[method] = (...args: unknown[]) => {
          query.calls.push([method, ...args]);
          return builder;
        };
      }
      return builder;
    },
  };
  return { client: client as unknown as SupabaseDataClient, queries };
}

const row = {
  id: "c1",
  code: "IBE430",
  name: "Virksomhetssystemer",
  learning_outcomes: "LU",
  exam_form: "Skriftlig",
};
const course = {
  id: "c1",
  code: "IBE430",
  name: "Virksomhetssystemer",
  learningOutcomes: "LU",
  examForm: "Skriftlig",
};
const input = { code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "LU", examForm: "Skriftlig" };

function filtersOnOwner(query: Query) {
  return query.calls.some(([m, col, val]) => m === "eq" && col === "owner_id" && val === "eier");
}

describe("SupabaseDataSource", () => {
  it("lister eierens emner, filtrert på eier og sortert på kode", async () => {
    const { client, queries } = fakeClient(() => ({ data: [row] }));
    expect(await new SupabaseDataSource(client, "eier").listCourses()).toEqual({
      status: "ok",
      value: [course],
    });
    expect(queries[0].table).toBe("courses");
    expect(filtersOnOwner(queries[0])).toBe(true);
    expect(queries[0].calls).toContainEqual(["order", "code"]);
  });

  it("henter ett emne og filtrerer på både eier og id", async () => {
    const { client, queries } = fakeClient(() => ({ data: row }));
    expect(await new SupabaseDataSource(client, "eier").getCourse("c1")).toEqual({
      status: "ok",
      value: course,
    });
    expect(filtersOnOwner(queries[0])).toBe(true);
    expect(queries[0].calls).toContainEqual(["eq", "id", "c1"]);
  });

  it("gir null for et emne som ikke finnes", async () => {
    const { client } = fakeClient(() => ({ data: null }));
    expect(await new SupabaseDataSource(client, "eier").getCourse("c9")).toEqual({
      status: "ok",
      value: null,
    });
  });

  it("gir null for en ugyldig id i stedet for feil", async () => {
    const { client } = fakeClient(() => ({ error: { code: "22P02" } }));
    expect(await new SupabaseDataSource(client, "eier").getCourse("abc")).toEqual({
      status: "ok",
      value: null,
    });
  });

  it("oppretter et emne med eieren satt", async () => {
    const { client, queries } = fakeClient(() => ({ data: row }));
    expect(await new SupabaseDataSource(client, "eier").createCourse(input)).toEqual({
      status: "ok",
      value: course,
    });
    expect(queries[0].calls[0]).toEqual([
      "insert",
      { owner_id: "eier", code: "IBE430", name: "Virksomhetssystemer", learning_outcomes: "LU", exam_form: "Skriftlig" },
    ]);
  });

  it("gjør 23505 om til duplicate", async () => {
    const { client } = fakeClient(() => ({ error: { code: "23505", message: "duplicate key" } }));
    const data = new SupabaseDataSource(client, "eier");
    expect(await data.createCourse(input)).toEqual({ status: "duplicate" });
    expect(await data.updateCourse("c1", input)).toEqual({ status: "duplicate" });
  });

  it("gjør nettverksfeil om til unavailable", async () => {
    const { client } = fakeClient(() => ({ error: { code: "", message: "TypeError: fetch failed" } }));
    const data = new SupabaseDataSource(client, "eier");
    expect(await data.listCourses()).toEqual({ status: "unavailable" });
    expect(await data.getCourse("c1")).toEqual({ status: "unavailable" });
    expect(await data.createCourse(input)).toEqual({ status: "unavailable" });
    expect(await data.deleteCourse("c1")).toEqual({ status: "unavailable" });
    expect(await data.getActiveCourse()).toEqual({ status: "unavailable" });
    expect(await data.setActiveCourse("c1")).toEqual({ status: "unavailable" });
  });

  it("gir unavailable når klienten kaster", async () => {
    const { client } = fakeClient(() => {
      throw new TypeError("fetch failed");
    });
    expect(await new SupabaseDataSource(client, "eier").listCourses()).toEqual({ status: "unavailable" });
  });

  it("endrer bare eierens emne", async () => {
    const { client, queries } = fakeClient(() => ({ data: row }));
    expect(await new SupabaseDataSource(client, "eier").updateCourse("c1", input)).toEqual({
      status: "ok",
      value: course,
    });
    expect(filtersOnOwner(queries[0])).toBe(true);
    expect(queries[0].calls).toContainEqual(["eq", "id", "c1"]);
  });

  it("sletter bare eierens emne", async () => {
    const { client, queries } = fakeClient(() => ({}));
    expect(await new SupabaseDataSource(client, "eier").deleteCourse("c1")).toEqual({
      status: "ok",
      value: undefined,
    });
    expect(queries[0].calls[0]).toEqual(["delete"]);
    expect(filtersOnOwner(queries[0])).toBe(true);
  });

  it("henter aktivt emne via user_settings", async () => {
    const { client, queries } = fakeClient((q) =>
      q.table === "user_settings" ? { data: { active_course_id: "c1" } } : { data: row },
    );
    expect(await new SupabaseDataSource(client, "eier").getActiveCourse()).toEqual({
      status: "ok",
      value: course,
    });
    expect(queries.map((q) => q.table)).toEqual(["user_settings", "courses"]);
    expect(queries.every(filtersOnOwner)).toBe(true);
  });

  it("gir null når eieren ikke har noe aktivt emne", async () => {
    const { client, queries } = fakeClient(() => ({ data: null }));
    expect(await new SupabaseDataSource(client, "eier").getActiveCourse()).toEqual({
      status: "ok",
      value: null,
    });
    expect(queries).toHaveLength(1);
  });

  it("lagrer aktivt emne med upsert på eier", async () => {
    const { client, queries } = fakeClient(() => ({}));
    expect(await new SupabaseDataSource(client, "eier").setActiveCourse("c2")).toEqual({
      status: "ok",
      value: undefined,
    });
    expect(queries[0].calls[0]).toEqual([
      "upsert",
      { owner_id: "eier", active_course_id: "c2" },
      { onConflict: "owner_id" },
    ]);
  });
});

describe("toWriteFailure", () => {
  it("gir duplicate bare for 23505", () => {
    expect(toWriteFailure({ code: "23505" })).toEqual({ status: "duplicate" });
    expect(toWriteFailure({ code: "42501" })).toEqual({ status: "unavailable" });
    expect(toWriteFailure(null)).toEqual({ status: "unavailable" });
  });
});
