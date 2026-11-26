import { describe, expect, it } from "vitest";
import { SupabaseDataSource, toWriteFailure, type SupabaseDataClient } from "./dataSource";

type Call = [method: string, ...args: unknown[]];
type Query = { table: string; calls: Call[] };
type Response = { data?: unknown; error?: { code?: string; message?: string } | null };

// Falsk Supabase-klient: hver kjede av kall registreres, og svaret kommer fra `respond`.
function fakeClient(respond: (query: Query) => Response | Promise<Response>) {
  const queries: Query[] = [];
  const client = {
    // Et rpc-kall registreres som tabellen `rpc:<navn>` med kallet `["rpc", args]`.
    rpc(fn: string, args: unknown) {
      return client.from(`rpc:${fn}`, [["rpc", args]]);
    },
    from(table: string, calls: Call[] = []) {
      const query: Query = { table, calls: [...calls] };
      queries.push(query);
      const builder: Record<string, unknown> = {
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve()
            .then(() => respond(query))
            .then((r) => ({ data: r.data ?? null, error: r.error ?? null }))
            .then(resolve, reject);
        },
      };
      for (const method of ["select", "insert", "update", "upsert", "delete", "eq", "in", "is", "order", "limit", "single", "maybeSingle"]) {
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

const versionRow = (id: string, subchapterId: string, status: string, createdAt: string) => ({
  id,
  subchapter_id: subchapterId,
  status,
  text: status === "klart" ? `Tekst ${id}` : null,
  model_id: "anthropic.claude-sonnet-5-5",
  prompt_version: "summary.v1",
  input_hash: "h",
  error: status === "feilet" ? "Nede." : null,
  created_at: createdAt,
});

describe("SupabaseDataSource med sammendragsversjoner", () => {
  it("gir siste og siste klare versjon per delkapittel, filtrert på eier", async () => {
    const rows = [
      versionRow("v3", "d1", "feilet", "2026-11-18T03:00:00Z"),
      versionRow("v2", "d1", "klart", "2026-11-18T02:00:00Z"),
      versionRow("v1", "d1", "klart", "2026-11-18T01:00:00Z"),
    ];
    const { client, queries } = fakeClient(() => ({ data: rows }));
    const result = await new SupabaseDataSource(client, "eier").listSummaryVersions(["d1", "d2"]);
    expect(result).toEqual({
      status: "ok",
      value: [
        {
          subchapterId: "d1",
          latest: expect.objectContaining({ id: "v3", status: "feilet", error: "Nede.", text: null }),
          latestReady: {
            id: "v2",
            subchapterId: "d1",
            status: "klart",
            text: "Tekst v2",
            modelId: "anthropic.claude-sonnet-5-5",
            promptVersion: "summary.v1",
            inputHash: "h",
            error: null,
            createdAt: "2026-11-18T02:00:00Z",
          },
        },
        { subchapterId: "d2", latest: null, latestReady: null },
      ],
    });
    expect(queries[0].table).toBe("summary_versions");
    expect(filtersOnOwner(queries[0])).toBe(true);
    expect(queries[0].calls).toContainEqual(["in", "subchapter_id", ["d1", "d2"]]);
    expect(queries[0].calls).toContainEqual(["order", "created_at", { ascending: false }]);
  });

  it("spør ikke databasen uten delkapitler", async () => {
    const { client, queries } = fakeClient(() => ({ data: [] }));
    expect(await new SupabaseDataSource(client, "eier").listSummaryVersions([])).toEqual({ status: "ok", value: [] });
    expect(queries).toHaveLength(0);
  });

  it("lagrer en ny versjon med eieren satt", async () => {
    const row = versionRow("v1", "d1", "klart", "2026-11-18T01:00:00Z");
    const { client, queries } = fakeClient(() => ({ data: row }));
    const result = await new SupabaseDataSource(client, "eier").addSummaryVersion({
      subchapterId: "d1",
      status: "klart",
      text: "Tekst v1",
      modelId: "anthropic.claude-sonnet-5-5",
      promptVersion: "summary.v1",
      inputHash: "h",
    });
    expect(result).toEqual({ status: "ok", value: expect.objectContaining({ id: "v1", status: "klart" }) });
    expect(queries[0].calls[0]).toEqual([
      "insert",
      {
        owner_id: "eier",
        subchapter_id: "d1",
        status: "klart",
        text: "Tekst v1",
        error: null,
        model_id: "anthropic.claude-sonnet-5-5",
        prompt_version: "summary.v1",
        input_hash: "h",
      },
    ]);
  });

  it("lagrer en feilet versjon med årsak og uten tekst", async () => {
    const { client, queries } = fakeClient(() => ({ data: versionRow("v1", "d1", "feilet", "2026-11-18T01:00:00Z") }));
    await new SupabaseDataSource(client, "eier").addSummaryVersion({
      subchapterId: "d1",
      status: "feilet",
      error: "Nede.",
      modelId: "anthropic.claude-sonnet-5-5",
      promptVersion: "summary.v1",
      inputHash: "h",
    });
    expect(queries[0].calls[0][1]).toMatchObject({ status: "feilet", text: null, error: "Nede." });
  });

  it("gir unavailable når versjonene ikke kan leses eller lagres", async () => {
    const { client } = fakeClient(() => ({ error: { code: "", message: "fetch failed" } }));
    const data = new SupabaseDataSource(client, "eier");
    expect(await data.listSummaryVersions(["d1"])).toEqual({ status: "unavailable" });
    expect(
      await data.addSummaryVersion({
        subchapterId: "d1",
        status: "feilet",
        error: "x",
        modelId: "m",
        promptVersion: "p",
        inputHash: "h",
      }),
    ).toEqual({ status: "unavailable" });
    expect(await data.reportSummaryVersion("s1", null)).toEqual({ status: "unavailable" });
    expect(await data.listSummaryReports(["d1"])).toEqual({ status: "unavailable" });
  });

  it("melder en versjon med upsert som ignorerer duplikater, med eieren satt", async () => {
    const { client, queries } = fakeClient(() => ({}));
    expect(await new SupabaseDataSource(client, "eier").reportSummaryVersion("s1", "Feil definisjon")).toEqual({
      status: "ok",
      value: true,
    });
    expect(queries.map((q) => [q.table, q.calls])).toEqual([
      [
        "summary_reports",
        [
          [
            "upsert",
            { owner_id: "eier", summary_version_id: "s1", comment: "Feil definisjon" },
            { onConflict: "owner_id,summary_version_id", ignoreDuplicates: true },
          ],
        ],
      ],
    ]);
  });

  it("gir false når versjonen ikke finnes (FK) eller id-en er ugyldig", async () => {
    for (const code of ["23503", "22P02"]) {
      const { client } = fakeClient(() => ({ error: { code } }));
      expect(await new SupabaseDataSource(client, "eier").reportSummaryVersion("s9", null)).toEqual({
        status: "ok",
        value: false,
      });
    }
  });

  it("lister rapportene på sammendrag med delkapittelet fra versjonen, filtrert på eier", async () => {
    const rows = [
      { summary_version_id: "s1", comment: "Feil definisjon", reported_at: "2026-11-22T10:00:00Z", summary_versions: { subchapter_id: "d1" } },
      { summary_version_id: "s2", comment: null, reported_at: "2026-11-22T11:00:00Z", summary_versions: { subchapter_id: "d2" } },
    ];
    const { client, queries } = fakeClient(() => ({ data: rows }));
    expect(await new SupabaseDataSource(client, "eier").listSummaryReports(["d1", "d2"])).toEqual({
      status: "ok",
      value: [
        { subchapterId: "d1", summaryVersionId: "s1", comment: "Feil definisjon", reportedAt: "2026-11-22T10:00:00Z" },
        { subchapterId: "d2", summaryVersionId: "s2", comment: null, reportedAt: "2026-11-22T11:00:00Z" },
      ],
    });
    expect(queries[0].table).toBe("summary_reports");
    expect(filtersOnOwner(queries[0])).toBe(true);
    expect(String(queries[0].calls[0][1])).toContain("summary_versions!summary_reports_summary_version_fkey!inner(");
    expect(queries[0].calls).toContainEqual(["in", "summary_versions.subchapter_id", ["d1", "d2"]]);
    expect(queries[0].calls).toContainEqual(["order", "reported_at"]);
    const empty = fakeClient(() => ({ data: [] }));
    expect(await new SupabaseDataSource(empty.client, "eier").listSummaryReports([])).toEqual({ status: "ok", value: [] });
    expect(empty.queries).toHaveLength(0);
  });
});

describe("SupabaseDataSource med spørsmålsbanker", () => {
  const bankRow = (id: string, status: string, createdAt: string) => ({
    id,
    subchapter_id: "d1",
    status,
    model_id: "claude-code/test",
    prompt_version: "innhold.v2",
    input_hash: "h",
    content_hash: "c",
    error: status === "feilet" ? "Nede." : null,
    created_at: createdAt,
  });

  const newBank = {
    subchapterId: "d1",
    modelId: "claude-code/test",
    promptVersion: "innhold.v2",
    inputHash: "h",
    contentHash: "c",
    themes: ["Alfa", "Beta"],
    questions: [
      {
        question: "Hva?",
        options: ["A", "B", "C", "D"],
        correctIndex: 1,
        explanation: "Fordi.",
        theme: "Beta",
        sourceNumber: 1,
        originalText: "Er det slik?",
      },
    ],
  };

  it("gir siste og siste klare bankversjon per delkapittel, filtrert på eier", async () => {
    const rows = [bankRow("b2", "feilet", "2026-11-20T02:00:00Z"), bankRow("b1", "klart", "2026-11-20T01:00:00Z")];
    const { client, queries } = fakeClient(() => ({ data: rows }));
    const result = await new SupabaseDataSource(client, "eier").listQuestionBanks(["d1", "d2"]);
    expect(result).toEqual({
      status: "ok",
      value: [
        {
          subchapterId: "d1",
          latest: expect.objectContaining({ id: "b2", status: "feilet", error: "Nede." }),
          latestReady: {
            id: "b1",
            subchapterId: "d1",
            status: "klart",
            modelId: "claude-code/test",
            promptVersion: "innhold.v2",
            inputHash: "h",
            contentHash: "c",
            error: null,
            createdAt: "2026-11-20T01:00:00Z",
          },
        },
        { subchapterId: "d2", latest: null, latestReady: null },
      ],
    });
    expect(queries[0].table).toBe("question_bank_versions");
    expect(filtersOnOwner(queries[0])).toBe(true);
    expect(queries[0].calls).toContainEqual(["order", "created_at", { ascending: false }]);
    const empty = fakeClient(() => ({ data: [] }));
    expect(await new SupabaseDataSource(empty.client, "eier").listQuestionBanks([])).toEqual({ status: "ok", value: [] });
    expect(empty.queries).toHaveLength(0);
  });

  it("lagrer versjonen som «lages», så temaer og spørsmål, og til slutt «klart»", async () => {
    const { client, queries } = fakeClient((query) => {
      if (query.table === "themes") return { data: [{ id: "t1", name: "Alfa" }, { id: "t2", name: "Beta" }] };
      if (query.table === "quiz_questions") return { data: null };
      const isUpdate = query.calls.some(([m]) => m === "update");
      return { data: bankRow("b1", isUpdate ? "klart" : "lages", "2026-11-20T01:00:00Z") };
    });
    const result = await new SupabaseDataSource(client, "eier").addQuestionBank(newBank);
    expect(result).toEqual({ status: "ok", value: expect.objectContaining({ id: "b1", status: "klart" }) });
    expect(queries.map((q) => q.table)).toEqual(["question_bank_versions", "themes", "quiz_questions", "question_bank_versions"]);
    expect(queries[0].calls[0]).toEqual([
      "insert",
      {
        owner_id: "eier",
        subchapter_id: "d1",
        status: "lages",
        model_id: "claude-code/test",
        prompt_version: "innhold.v2",
        input_hash: "h",
        content_hash: "c",
      },
    ]);
    expect(queries[1].calls[0]).toEqual([
      "upsert",
      [
        { owner_id: "eier", subchapter_id: "d1", name: "Alfa" },
        { owner_id: "eier", subchapter_id: "d1", name: "Beta" },
      ],
      { onConflict: "owner_id,subchapter_id,name" },
    ]);
    expect(queries[2].calls[0]).toEqual([
      "insert",
      [
        {
          owner_id: "eier",
          subchapter_id: "d1",
          bank_version_id: "b1",
          theme_id: "t2",
          position: 1,
          question: "Hva?",
          options: ["A", "B", "C", "D"],
          correct_index: 1,
          explanation: "Fordi.",
          source_number: 1,
          rewritten: true,
          original_text: "Er det slik?",
        },
      ],
    ]);
    expect(queries[3].calls).toContainEqual(["update", { status: "klart" }]);
    expect(filtersOnOwner(queries[3])).toBe(true);
    expect(queries[3].calls).toContainEqual(["eq", "id", "b1"]);
  });

  it("setter versjonen til «feilet» og gir unavailable når spørsmålene ikke kan lagres", async () => {
    const { client, queries } = fakeClient((query) => {
      if (query.table === "themes") return { data: [{ id: "t1", name: "Alfa" }, { id: "t2", name: "Beta" }] };
      if (query.table === "quiz_questions") return { error: { code: "23514", message: "check" } };
      return { data: bankRow("b1", "lages", "2026-11-20T01:00:00Z") };
    });
    expect(await new SupabaseDataSource(client, "eier").addQuestionBank(newBank)).toEqual({ status: "unavailable" });
    const last = queries.at(-1)!;
    expect(last.table).toBe("question_bank_versions");
    expect(last.calls).toContainEqual(["update", { status: "feilet", error: "Fikk ikke lagret temaene eller spørsmålene." }]);
    expect(last.calls).toContainEqual(["eq", "id", "b1"]);
  });

  it("gir unavailable uten flere skrivinger når versjonen ikke kan opprettes", async () => {
    const { client, queries } = fakeClient(() => ({ error: { code: "", message: "fetch failed" } }));
    expect(await new SupabaseDataSource(client, "eier").addQuestionBank(newBank)).toEqual({ status: "unavailable" });
    expect(queries).toHaveLength(1);
  });
});

describe("SupabaseDataSource med quizer", () => {
  const failure = { error: { code: "", message: "fetch failed" } };
  const questionRow = (id: string) => ({
    id,
    theme_id: "t1",
    question: `Spørsmål ${id}?`,
    options: ["A", "B", "C", "D"],
    correct_index: 2,
    explanation: "Fordi.",
  });
  const question = (id: string) => ({
    id,
    themeId: "t1",
    question: `Spørsmål ${id}?`,
    options: ["A", "B", "C", "D"],
    correctIndex: 2,
    explanation: "Fordi.",
  });
  const itemRow = (id: string, position: number, extra: Record<string, unknown> = {}) => ({
    id,
    position,
    status: "aktiv",
    chosen_index: null,
    correct: null,
    answered_at: null,
    created_at: "2026-11-21T10:00:00Z",
    quiz_questions: { ...questionRow(`q${id}`), status: "aktiv" },
    ...extra,
  });
  const quizRow = (items: unknown[]) => ({
    id: "z1",
    session_id: "o1",
    subchapter_id: "d1",
    status: "pågår",
    correct_count: null,
    total: null,
    carry_theme_id: null,
    created_at: "2026-11-21T10:00:00Z",
    finished_at: null,
    quiz_items: items,
  });

  it("henter de aktive spørsmålene i siste klare bankversjon", async () => {
    const { client, queries } = fakeClient((q) =>
      q.table === "question_bank_versions" ? { data: [{ id: "b2" }] } : { data: [questionRow("q1"), questionRow("q2")] },
    );
    expect(await new SupabaseDataSource(client, "eier").listQuizBank("d1")).toEqual({
      status: "ok",
      value: [question("q1"), question("q2")],
    });
    expect(queries.map((q) => q.table)).toEqual(["question_bank_versions", "quiz_questions"]);
    expect(queries.every(filtersOnOwner)).toBe(true);
    expect(queries[0].calls).toContainEqual(["eq", "status", "klart"]);
    expect(queries[0].calls).toContainEqual(["order", "created_at", { ascending: false }]);
    expect(queries[0].calls).toContainEqual(["limit", 1]);
    expect(queries[1].calls).toContainEqual(["eq", "bank_version_id", "b2"]);
    expect(queries[1].calls).toContainEqual(["eq", "status", "aktiv"]);
    expect(queries[1].calls).toContainEqual(["order", "position"]);
  });

  it("gir tom bank uten klar versjon eller for en ugyldig id", async () => {
    const none = fakeClient(() => ({ data: [] }));
    expect(await new SupabaseDataSource(none.client, "eier").listQuizBank("d1")).toEqual({ status: "ok", value: [] });
    expect(none.queries).toHaveLength(1);
    const invalid = fakeClient(() => ({ error: { code: "22P02" } }));
    expect(await new SupabaseDataSource(invalid.client, "eier").listQuizBank("abc")).toEqual({ status: "ok", value: [] });
  });

  it("lister quizene med elementene sortert på posisjon og tidspunkt", async () => {
    const items = [
      itemRow("i3", 2, { created_at: "2026-11-21T10:05:00Z" }),
      itemRow("i2", 2, { status: "erstattet", quiz_questions: { ...questionRow("qi2"), status: "trukket" } }),
      itemRow("i1", 1, { chosen_index: 2, correct: true, answered_at: "2026-11-21T10:01:00Z" }),
    ];
    const { client, queries } = fakeClient(() => ({ data: [quizRow(items)] }));
    const result = await new SupabaseDataSource(client, "eier").listQuizzes("d1");
    if (result.status !== "ok") throw new Error(result.status);
    expect(result.value[0]).toMatchObject({
      id: "z1",
      sessionId: "o1",
      subchapterId: "d1",
      status: "pågår",
      correctCount: null,
      carryThemeId: null,
    });
    expect(result.value[0].items.map((i) => [i.id, i.position, i.status, i.questionRetired])).toEqual([
      ["i1", 1, "aktiv", false],
      ["i2", 2, "erstattet", true],
      ["i3", 2, "aktiv", false],
    ]);
    expect(result.value[0].items[0]).toEqual({
      id: "i1",
      position: 1,
      status: "aktiv",
      question: question("qi1"),
      questionRetired: false,
      chosenIndex: 2,
      correct: true,
      answeredAt: "2026-11-21T10:01:00Z",
      createdAt: "2026-11-21T10:00:00Z",
    });
    expect(queries).toHaveLength(1);
    expect(filtersOnOwner(queries[0])).toBe(true);
    expect(queries[0].calls).toContainEqual(["eq", "subchapter_id", "d1"]);
    expect(queries[0].calls).toContainEqual(["order", "created_at", { ascending: false }]);
    expect(String(queries[0].calls[0][1])).toContain("quiz_items!quiz_items_quiz_fkey(");
    expect(String(queries[0].calls[0][1])).toContain("explanation, status))");
  });

  it("lager økt, quiz og elementer i én transaksjon med create_quiz og leser quizen", async () => {
    const { client, queries } = fakeClient((q) =>
      q.table === "rpc:create_quiz" ? { data: "z1" } : { data: quizRow([itemRow("i1", 1), itemRow("i2", 2)]) },
    );
    const result = await new SupabaseDataSource(client, "eier").createQuiz({ subchapterId: "d1", questionIds: ["q1", "q2"] });
    expect(result).toEqual({ status: "ok", value: expect.objectContaining({ id: "z1", status: "pågår" }) });
    expect(queries.map((q) => q.table)).toEqual(["rpc:create_quiz", "quizzes"]);
    expect(queries[0].calls).toEqual([["rpc", { p_subchapter_id: "d1", p_question_ids: ["q1", "q2"] }]]);
    expect(filtersOnOwner(queries[1])).toBe(true);
    expect(queries[1].calls).toContainEqual(["eq", "id", "z1"]);
  });

  it("gir duplicate når en quiz alt er i gang, uten flere kall", async () => {
    const { client, queries } = fakeClient(() => ({ error: { code: "23505" } }));
    expect(await new SupabaseDataSource(client, "eier").createQuiz({ subchapterId: "d1", questionIds: ["q1"] })).toEqual({
      status: "duplicate",
    });
    expect(queries).toHaveLength(1);
  });

  it("gir unavailable uten flere kall når create_quiz feiler", async () => {
    const { client, queries } = fakeClient(() => failure);
    expect(await new SupabaseDataSource(client, "eier").createQuiz({ subchapterId: "d1", questionIds: ["q1"] })).toEqual({
      status: "unavailable",
    });
    expect(queries).toHaveLength(1);
  });

  it("lagrer bare svaret på et aktivt, ubesvart element", async () => {
    const { client, queries } = fakeClient(() => ({ data: [{ id: "i1" }] }));
    expect(await new SupabaseDataSource(client, "eier").answerQuizItem("i1", 2, true)).toEqual({ status: "ok", value: true });
    expect(queries[0].calls[0]).toEqual(["update", { chosen_index: 2, correct: true, answered_at: expect.any(String) }]);
    expect(filtersOnOwner(queries[0])).toBe(true);
    expect(queries[0].calls).toContainEqual(["eq", "id", "i1"]);
    expect(queries[0].calls).toContainEqual(["eq", "status", "aktiv"]);
    expect(queries[0].calls).toContainEqual(["is", "answered_at", null]);

    const answered = fakeClient(() => ({ data: [] }));
    expect(await new SupabaseDataSource(answered.client, "eier").answerQuizItem("i1", 0, false)).toEqual({
      status: "ok",
      value: false,
    });
  });

  it("erstatter et element i én transaksjon med replace_quiz_item", async () => {
    const { client, queries } = fakeClient(() => ({ data: true }));
    expect(await new SupabaseDataSource(client, "eier").replaceQuizItem("i7", "q99")).toEqual({ status: "ok", value: true });
    expect(queries.map((q) => [q.table, q.calls])).toEqual([
      ["rpc:replace_quiz_item", [["rpc", { p_item_id: "i7", p_question_id: "q99" }]]],
    ]);
  });

  it("erstatter ingenting når elementet alt er besvart eller id-en er ugyldig", async () => {
    const answered = fakeClient(() => ({ data: false }));
    expect(await new SupabaseDataSource(answered.client, "eier").replaceQuizItem("i7", "q99")).toEqual({
      status: "ok",
      value: false,
    });
    const invalid = fakeClient(() => ({ error: { code: "22P02" } }));
    expect(await new SupabaseDataSource(invalid.client, "eier").replaceQuizItem("abc", "q99")).toEqual({
      status: "ok",
      value: false,
    });
  });

  it("lagrer resultatet og avkrysningen i én transaksjon med finish_quiz", async () => {
    const { client, queries } = fakeClient(() => ({ data: true }));
    expect(
      await new SupabaseDataSource(client, "eier").saveQuizResult("z1", { correctCount: 8, carryThemeId: "t1", completes: true }),
    ).toEqual({ status: "ok", value: true });
    expect(queries.map((q) => [q.table, q.calls])).toEqual([
      ["rpc:finish_quiz", [["rpc", { p_quiz_id: "z1", p_correct_count: 8, p_carry_theme_id: "t1", p_completes: true }]]],
    ]);
  });

  it("lagrer ingenting når quizen alt er ferdig eller id-en er ugyldig", async () => {
    const result = { correctCount: 7, carryThemeId: null, completes: false };
    const done = fakeClient(() => ({ data: false }));
    expect(await new SupabaseDataSource(done.client, "eier").saveQuizResult("z1", result)).toEqual({ status: "ok", value: false });
    const invalid = fakeClient(() => ({ error: { code: "22P02" } }));
    expect(await new SupabaseDataSource(invalid.client, "eier").saveQuizResult("abc", result)).toEqual({
      status: "ok",
      value: false,
    });
  });

  it("melder et element i én transaksjon med report_quiz_question", async () => {
    const { client, queries } = fakeClient(() => ({ data: true }));
    expect(await new SupabaseDataSource(client, "eier").reportQuizItem("i4", "Fasit er feil")).toEqual({
      status: "ok",
      value: true,
    });
    expect(queries.map((q) => [q.table, q.calls])).toEqual([
      ["rpc:report_quiz_question", [["rpc", { p_item_id: "i4", p_comment: "Fasit er feil" }]]],
    ]);
    const none = fakeClient(() => ({ data: false }));
    expect(await new SupabaseDataSource(none.client, "eier").reportQuizItem("i4", null)).toEqual({ status: "ok", value: false });
    expect(none.queries[0].calls).toEqual([["rpc", { p_item_id: "i4", p_comment: null }]]);
    const invalid = fakeClient(() => ({ error: { code: "22P02" } }));
    expect(await new SupabaseDataSource(invalid.client, "eier").reportQuizItem("abc", null)).toEqual({
      status: "ok",
      value: false,
    });
  });

  it("lister de meldte spørsmålene med tekst og tema for delkapitlene, filtrert på eier", async () => {
    const rows = [
      {
        comment: "Fasit er feil",
        reported_at: "2026-11-22T10:00:00Z",
        quiz_questions: { subchapter_id: "d1", question: "Hva?", themes: { name: "Alfa" } },
      },
      { comment: null, reported_at: "2026-11-22T11:00:00Z", quiz_questions: { subchapter_id: "d2", question: "Hvem?", themes: { name: "Beta" } } },
    ];
    const { client, queries } = fakeClient(() => ({ data: rows }));
    expect(await new SupabaseDataSource(client, "eier").listQuestionReports(["d1", "d2"])).toEqual({
      status: "ok",
      value: [
        { subchapterId: "d1", question: "Hva?", theme: "Alfa", comment: "Fasit er feil", reportedAt: "2026-11-22T10:00:00Z" },
        { subchapterId: "d2", question: "Hvem?", theme: "Beta", comment: null, reportedAt: "2026-11-22T11:00:00Z" },
      ],
    });
    expect(queries[0].table).toBe("question_reports");
    expect(filtersOnOwner(queries[0])).toBe(true);
    expect(String(queries[0].calls[0][1])).toContain("quiz_questions!question_reports_question_fkey!inner(");
    expect(queries[0].calls).toContainEqual(["in", "quiz_questions.subchapter_id", ["d1", "d2"]]);
    expect(queries[0].calls).toContainEqual(["order", "reported_at"]);
    const empty = fakeClient(() => ({ data: [] }));
    expect(await new SupabaseDataSource(empty.client, "eier").listQuestionReports([])).toEqual({ status: "ok", value: [] });
    expect(empty.queries).toHaveLength(0);
  });

  it("gir avkrysningene i rekkefølgen til delkapitlene, filtrert på eier", async () => {
    const rows = [
      { subchapter_id: "d3", quiz_id: "z3", completed_at: "2026-11-21T03:00:00Z" },
      { subchapter_id: "d1", quiz_id: "z1", completed_at: "2026-11-21T01:00:00Z" },
    ];
    const { client, queries } = fakeClient(() => ({ data: rows }));
    expect(await new SupabaseDataSource(client, "eier").listCompletions(["d1", "d2", "d3"])).toEqual({
      status: "ok",
      value: [
        { subchapterId: "d1", quizId: "z1", completedAt: "2026-11-21T01:00:00Z" },
        { subchapterId: "d3", quizId: "z3", completedAt: "2026-11-21T03:00:00Z" },
      ],
    });
    expect(queries[0].table).toBe("subchapter_completions");
    expect(filtersOnOwner(queries[0])).toBe(true);
    expect(queries[0].calls).toContainEqual(["in", "subchapter_id", ["d1", "d2", "d3"]]);
    const empty = fakeClient(() => ({ data: [] }));
    expect(await new SupabaseDataSource(empty.client, "eier").listCompletions([])).toEqual({ status: "ok", value: [] });
    expect(empty.queries).toHaveLength(0);
  });

  it("gir unavailable når quizene ikke kan leses eller skrives", async () => {
    const { client } = fakeClient(() => failure);
    const data = new SupabaseDataSource(client, "eier");
    expect(await data.listQuizBank("d1")).toEqual({ status: "unavailable" });
    expect(await data.listQuizzes("d1")).toEqual({ status: "unavailable" });
    expect(await data.createQuiz({ subchapterId: "d1", questionIds: ["q1"] })).toEqual({ status: "unavailable" });
    expect(await data.answerQuizItem("i1", 0, true)).toEqual({ status: "unavailable" });
    expect(await data.replaceQuizItem("i1", "q2")).toEqual({ status: "unavailable" });
    expect(await data.saveQuizResult("z1", { correctCount: 8, carryThemeId: null, completes: true })).toEqual({
      status: "unavailable",
    });
    expect(await data.listCompletions(["d1"])).toEqual({ status: "unavailable" });
    expect(await data.reportQuizItem("i1", null)).toEqual({ status: "unavailable" });
    expect(await data.listQuestionReports(["d1"])).toEqual({ status: "unavailable" });
  });
});

describe("SupabaseDataSource med studieplaner", () => {
  const planRow = { course_id: "c1", exam_date: "2026-12-10", plan_start: "2026-11-26", g0: 7, r0: 2, d: 10 };
  const plan = { courseId: "c1", examDate: "2026-12-10", planStart: "2026-11-26", g0: 7, r0: 2, d: 10 };

  it("henter planen for emnet, filtrert på eier og emne", async () => {
    const { client, queries } = fakeClient(() => ({ data: planRow }));
    expect(await new SupabaseDataSource(client, "eier").getStudyPlan("c1")).toEqual({ status: "ok", value: plan });
    expect(queries[0].table).toBe("study_plans");
    expect(filtersOnOwner(queries[0])).toBe(true);
    expect(queries[0].calls).toContainEqual(["eq", "course_id", "c1"]);
  });

  it("gir null uten plan eller for en ugyldig id", async () => {
    expect(await new SupabaseDataSource(fakeClient(() => ({ data: null })).client, "eier").getStudyPlan("c1")).toEqual({
      status: "ok",
      value: null,
    });
    const invalid = fakeClient(() => ({ error: { code: "22P02" } })).client;
    expect(await new SupabaseDataSource(invalid, "eier").getStudyPlan("x")).toEqual({ status: "ok", value: null });
  });

  it("lagrer planen med upsert på eier og emne, så den gamle erstattes", async () => {
    const { client, queries } = fakeClient(() => ({ data: planRow }));
    expect(await new SupabaseDataSource(client, "eier").saveStudyPlan(plan)).toEqual({ status: "ok", value: plan });
    expect(queries[0].calls[0]).toEqual([
      "upsert",
      { owner_id: "eier", ...planRow },
      { onConflict: "owner_id,course_id" },
    ]);
  });

  it("gir unavailable når planen ikke kan leses eller lagres", async () => {
    const { client } = fakeClient(() => ({ error: { code: "XX000" } }));
    const data = new SupabaseDataSource(client, "eier");
    expect(await data.getStudyPlan("c1")).toEqual({ status: "unavailable" });
    expect(await data.saveStudyPlan(plan)).toEqual({ status: "unavailable" });
  });
});
