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
      for (const method of ["select", "insert", "update", "upsert", "delete", "eq", "in", "is", "order", "single", "maybeSingle"]) {
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

const chapterRow = { id: "k1", number: 1, title: "Kapittel én", learning_goals: "- mål", key_concepts: "" };
const subRow = (number: string, position: number, extra: Record<string, unknown> = {}) => ({
  id: `d${number}`,
  chapter_id: "k1",
  number,
  position,
  title: `Tittel ${number}`,
  note_text: `Notat ${number}`,
  removed_at: null,
  ...extra,
});
const chapterInput = (subchapters: { number: string; title: string; noteText: string }[]) => ({
  number: 1,
  title: "Kapittel én",
  learningGoals: "- mål",
  keyConcepts: "",
  subchapters,
});
const sub = (number: string, extra: Partial<{ title: string; noteText: string }> = {}) => ({
  number,
  title: `Tittel ${number}`,
  noteText: `Notat ${number}`,
  ...extra,
});

function isWrite(query: Query) {
  return query.calls.some(([m]) => m === "insert" || m === "update" || m === "upsert" || m === "delete");
}

describe("SupabaseDataSource med kapitler", () => {
  it("lister kapitler med aktive delkapitler i rekkefølge, filtrert på eier", async () => {
    const { client, queries } = fakeClient((q) =>
      q.table === "chapters" ? { data: [chapterRow] } : { data: [subRow("1.1", 1), subRow("1.2", 2)] },
    );
    const result = await new SupabaseDataSource(client, "eier").listChapters("c1");
    expect(result).toEqual({
      status: "ok",
      value: [
        {
          id: "k1",
          number: 1,
          title: "Kapittel én",
          learningGoals: "- mål",
          keyConcepts: "",
          subchapters: [
            { id: "d1.1", number: "1.1", title: "Tittel 1.1", noteText: "Notat 1.1" },
            { id: "d1.2", number: "1.2", title: "Tittel 1.2", noteText: "Notat 1.2" },
          ],
        },
      ],
    });
    expect(queries.every(filtersOnOwner)).toBe(true);
    expect(queries[0].calls).toContainEqual(["eq", "course_id", "c1"]);
    expect(queries[0].calls).toContainEqual(["order", "number"]);
    expect(queries[1].calls).toContainEqual(["in", "chapter_id", ["k1"]]);
    expect(queries[1].calls).toContainEqual(["is", "removed_at", null]);
    expect(queries[1].calls).toContainEqual(["order", "position"]);
  });

  it("gir tom liste uten å spørre etter delkapitler når emnet ikke har kapitler", async () => {
    const { client, queries } = fakeClient(() => ({ data: [] }));
    expect(await new SupabaseDataSource(client, "eier").listChapters("c1")).toEqual({ status: "ok", value: [] });
    expect(queries).toHaveLength(1);
  });

  it("gir unavailable når kapitlene ikke kan hentes", async () => {
    const { client } = fakeClient(() => ({ error: { code: "", message: "fetch failed" } }));
    const data = new SupabaseDataSource(client, "eier");
    expect(await data.listChapters("c1")).toEqual({ status: "unavailable" });
    expect(await data.saveChapter("c1", chapterInput([sub("1.1")]))).toEqual({ status: "unavailable" });
  });

  it("oppretter kapittel og delkapitler med eier ved første import", async () => {
    const { client, queries } = fakeClient((q) => {
      if (q.table === "chapters" && q.calls[0][0] === "select") return { data: null };
      if (q.table === "chapters") return { data: { id: "k1" } };
      return {};
    });
    const result = await new SupabaseDataSource(client, "eier").saveChapter(
      "c1",
      chapterInput([sub("1.1"), sub("1.2")]),
    );
    expect(result).toEqual({
      status: "ok",
      value: {
        chapter: "created",
        subchapters: [
          { number: "1.1", change: "created" },
          { number: "1.2", change: "created" },
        ],
      },
    });
    expect(filtersOnOwner(queries[0])).toBe(true);
    expect(queries[1].calls[0]).toEqual([
      "insert",
      { owner_id: "eier", course_id: "c1", number: 1, title: "Kapittel én", learning_goals: "- mål", key_concepts: "" },
    ]);
    expect(queries[2].calls[0]).toEqual([
      "insert",
      [
        { owner_id: "eier", chapter_id: "k1", number: "1.1", title: "Tittel 1.1", note_text: "Notat 1.1", position: 1 },
        { owner_id: "eier", chapter_id: "k1", number: "1.2", title: "Tittel 1.2", note_text: "Notat 1.2", position: 2 },
      ],
    ]);
  });

  it("skriver ingenting når kapittelet er uendret", async () => {
    const { client, queries } = fakeClient((q) =>
      q.table === "chapters" ? { data: chapterRow } : { data: [subRow("1.1", 1)] },
    );
    const result = await new SupabaseDataSource(client, "eier").saveChapter("c1", chapterInput([sub("1.1")]));
    expect(result).toEqual({
      status: "ok",
      value: { chapter: "unchanged", subchapters: [{ number: "1.1", change: "unchanged" }] },
    });
    expect(queries.some(isWrite)).toBe(false);
    expect(queries.every(filtersOnOwner)).toBe(true);
  });

  it("oppdaterer bare endrede felt, merker fjernede og gjenoppretter", async () => {
    const { client, queries } = fakeClient((q) =>
      q.table === "chapters"
        ? { data: chapterRow }
        : q.calls[0][0] === "select"
          ? { data: [subRow("1.1", 1), subRow("1.2", 2), subRow("1.3", 3, { removed_at: "2026-11-16T20:00:00Z" })] }
          : {},
    );
    const input = { ...chapterInput([sub("1.1", { noteText: "Nytt" }), sub("1.3")]), title: "Ny tittel" };
    const result = await new SupabaseDataSource(client, "eier").saveChapter("c1", input);
    expect(result).toEqual({
      status: "ok",
      value: {
        chapter: "updated",
        subchapters: [
          { number: "1.1", change: "updated" },
          { number: "1.3", change: "restored" },
          { number: "1.2", change: "removed" },
        ],
      },
    });
    const writes = queries.filter(isWrite);
    expect(writes.every(filtersOnOwner)).toBe(true);
    expect(writes.map((q) => q.calls[0])).toEqual([
      ["update", { title: "Ny tittel" }],
      ["update", { note_text: "Nytt" }],
      ["update", { position: 2, removed_at: null }],
      ["update", { removed_at: expect.any(String) }],
    ]);
    expect(writes[1].calls).toContainEqual(["eq", "id", "d1.1"]);
    expect(writes[3].calls).toContainEqual(["in", "id", ["d1.2"]]);
  });
});

describe("SupabaseDataSource med kapitler når en senere spørring feiler", () => {
  const failure = { error: { code: "", message: "fetch failed" } };
  const firstMethod = (q: Query) => q.calls[0][0];

  it("gir unavailable når delkapitlene i listChapters ikke kan hentes", async () => {
    const { client } = fakeClient((q) => (q.table === "chapters" ? { data: [chapterRow] } : failure));
    expect(await new SupabaseDataSource(client, "eier").listChapters("c1")).toEqual({ status: "unavailable" });
  });

  it("gir unavailable når delkapitlene ikke kan opprettes", async () => {
    const { client } = fakeClient((q) =>
      q.table === "chapters" ? { data: chapterRow } : firstMethod(q) === "insert" ? failure : { data: [] },
    );
    expect(await new SupabaseDataSource(client, "eier").saveChapter("c1", chapterInput([sub("1.1")]))).toEqual({
      status: "unavailable",
    });
  });

  it("gir unavailable når et delkapittel ikke kan oppdateres", async () => {
    const { client } = fakeClient((q) =>
      q.table === "chapters"
        ? { data: chapterRow }
        : firstMethod(q) === "update"
          ? failure
          : { data: [subRow("1.1", 1)] },
    );
    const input = chapterInput([sub("1.1", { noteText: "Nytt" })]);
    expect(await new SupabaseDataSource(client, "eier").saveChapter("c1", input)).toEqual({ status: "unavailable" });
  });

  it("gir unavailable når et delkapittel ikke kan merkes som fjernet", async () => {
    const { client } = fakeClient((q) =>
      q.table === "chapters"
        ? { data: chapterRow }
        : firstMethod(q) === "update"
          ? failure
          : { data: [subRow("1.1", 1), subRow("1.2", 2)] },
    );
    expect(await new SupabaseDataSource(client, "eier").saveChapter("c1", chapterInput([sub("1.1")]))).toEqual({
      status: "unavailable",
    });
  });
});
