import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const getDataSourceForRender = vi.fn();
vi.mock("@/composition/server", () => ({ getDataSourceForRender }));
vi.mock("./actions", () => ({ logOut: async () => {} }));

const { ActiveCourse } = await import("./page");
const { unavailableMessage } = await import("../emner/formState");
const { subchapterInputHash } = await import("@/application/summaryHash");

const course = {
  id: "c1",
  code: "IBE430",
  name: "Virksomhetssystemer",
  learningOutcomes: "LU",
  examForm: "Skriftlig",
};
const ok = <T>(value: T) => ({ status: "ok", value });

const listChapters = vi.fn();
const listSummaryVersions = vi.fn();
const listQuestionBanks = vi.fn();

/** Siste klare versjon per delkapittel-ID, med `inputHash`. Delkapitler som ikke er med, har ingen. */
type ReadyHashes = Record<string, string>;

/** Svaret fra `listSummaryVersions` eller `listQuestionBanks` for de klare hashene. */
function versions(ready: ReadyHashes | { status: "unavailable" }, ids: string[]) {
  if ("status" in ready) return ready;
  return ok(
    ids.map((subchapterId) => {
      const version = ready[subchapterId]
        ? { id: `v-${subchapterId}`, subchapterId, status: "klart", text: "Tekst", inputHash: ready[subchapterId] }
        : null;
      return { subchapterId, latest: version, latestReady: version };
    }),
  );
}

async function render(
  active: unknown,
  courses: unknown,
  chapters: unknown = ok([]),
  ready: ReadyHashes | { status: "unavailable" } = {},
  // Spørsmålsbankene har de samme klare hashene som sammendragene hvis ikke annet er oppgitt.
  banks: ReadyHashes | { status: "unavailable" } = ready,
) {
  getDataSourceForRender.mockResolvedValue({
    getActiveCourse: async () => active,
    listCourses: async () => courses,
    listChapters: listChapters.mockReset().mockResolvedValue(chapters),
    listSummaryVersions: listSummaryVersions.mockReset().mockImplementation(async (ids: string[]) => versions(ready, ids)),
    listQuestionBanks: listQuestionBanks.mockReset().mockImplementation(async (ids: string[]) => versions(banks, ids)),
  });
  return renderToStaticMarkup(await ActiveCourse());
}

describe("ActiveCourse", () => {
  beforeEach(() => getDataSourceForRender.mockReset());

  it("ber eieren opprette et emne når det ikke finnes noen", async () => {
    const html = await render(ok(null), ok([]));
    expect(html).toContain('href="/emner/ny"');
    expect(html).toContain("Opprett et emne");
  });

  it("ber eieren velge emne når ingen er aktive", async () => {
    const html = await render(ok(null), ok([course]));
    expect(html).toContain('href="/emner"');
    expect(html).toContain("Velg emne");
  });

  it("viser aktivt emne med «Bytt emne»", async () => {
    const html = await render(ok(course), ok([course]));
    expect(html).toContain("IBE430");
    expect(html).toContain("Virksomhetssystemer");
    expect(html).toContain("Bytt emne");
  });

  it("viser feilmeldingen når emnelisten ikke kan hentes", async () => {
    const html = await render(ok(null), { status: "unavailable" });
    expect(html).toContain(unavailableMessage);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("ingen emner");
  });

  it("viser feilmeldingen når aktivt emne ikke kan hentes", async () => {
    const html = await render({ status: "unavailable" }, ok([]));
    expect(html).toContain(unavailableMessage);
  });
});

const chapters = [
  {
    id: "k1",
    number: 1,
    title: "Organisasjoner",
    learningGoals: "",
    keyConcepts: "",
    subchapters: [
      { id: "d1", number: "1.1", title: "Det moderne", noteText: "Notat" },
      { id: "d2", number: "1.2", title: "Den funksjonelle", noteText: "Notat" },
    ],
  },
  {
    id: "k2",
    number: 2,
    title: "Forretningssystemer",
    learningGoals: "",
    keyConcepts: "",
    subchapters: [
      { id: "d3", number: "2.2", title: "Datatyper", noteText: "Notat" },
      { id: "d4", number: "2.3", title: "Super Skateboard Builders", noteText: "*Ingen notater ennå.*" },
      { id: "d5", number: "2.5", title: "SAP-programvaren", noteText: "  " },
    ],
  },
];

describe("kapittellisten på startsiden", () => {
  beforeEach(() => getDataSourceForRender.mockReset());

  it("viser kapitler og delkapitler i rekkefølge under aktivt emne", async () => {
    const html = await render(ok(course), ok([course]), ok(chapters));
    expect(listChapters).toHaveBeenCalledWith("c1");
    const order = ["Kapittel 1: Organisasjoner", "1.1", "1.2", "Kapittel 2: Forretningssystemer", "2.2", "2.3", "2.5"];
    const positions = order.map((text) => html.indexOf(text));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).toContain("<ol");
  });

  it("merker delkapitler uten notater med «mangler notater»", async () => {
    const html = await render(ok(course), ok([course]), ok(chapters));
    expect(html.match(/mangler notater/g)).toHaveLength(2);
    const marked = html.split("<li").filter((li) => li.includes("mangler notater"));
    expect(marked.map((li) => (li.includes("2.3") ? "2.3" : li.includes("2.5") ? "2.5" : "?"))).toEqual(["2.3", "2.5"]);
  });

  it("henter alle sammendragsversjonene og spørsmålsbankene med ett kall hver", async () => {
    await render(ok(course), ok([course]), ok(chapters));
    expect(listSummaryVersions).toHaveBeenCalledTimes(1);
    expect(listSummaryVersions).toHaveBeenCalledWith(["d1", "d2", "d3", "d4", "d5"]);
    expect(listQuestionBanks).toHaveBeenCalledTimes(1);
    expect(listQuestionBanks).toHaveBeenCalledWith(["d1", "d2", "d3", "d4", "d5"]);
  });

  /** Statusmerket for delkapittelet med nummeret, og om det er en lenke. */
  function rowOf(html: string, number: string) {
    const li = html.split("<li").find((part) => part.includes(`>${number}<`)) ?? "";
    const status = ["klart", "utdatert", "mangler innhold", "mangler notater"].find((s) => li.includes(`>${s}<`));
    const link = li.match(/<a [^>]*href="([^"]*)"/)?.[1] ?? null;
    return { status, link };
  }

  it("viser status per delkapittel og lenker bare til dem med sammendrag", async () => {
    const hash = await subchapterInputHash({ learningGoals: "", keyConcepts: "" }, "Notat");
    const html = await render(ok(course), ok([course]), ok(chapters), { d1: hash, d2: "gammel-hash" });
    expect(rowOf(html, "1.1")).toEqual({ status: "klart", link: "/emner/c1/delkapitler/1.1" });
    expect(rowOf(html, "1.2")).toEqual({ status: "utdatert", link: "/emner/c1/delkapitler/1.2" });
    expect(rowOf(html, "2.2")).toEqual({ status: "mangler innhold", link: null });
    expect(rowOf(html, "2.3")).toEqual({ status: "mangler notater", link: null });
    expect(rowOf(html, "2.5")).toEqual({ status: "mangler notater", link: null });
    expect(html.match(/<a /g)).toHaveLength(3); // «Bytt emne», 1.1 og 1.2
  });

  it("viser «mangler innhold», men lenker til sammendraget, når bare spørsmålsbanken mangler", async () => {
    const hash = await subchapterInputHash({ learningGoals: "", keyConcepts: "" }, "Notat");
    const html = await render(ok(course), ok([course]), ok(chapters), { d1: hash }, {});
    expect(rowOf(html, "1.1")).toEqual({ status: "mangler innhold", link: "/emner/c1/delkapitler/1.1" });
    expect(rowOf(html, "2.2")).toEqual({ status: "mangler innhold", link: null });
  });

  it("viser feilmeldingen når spørsmålsbankene ikke kan hentes", async () => {
    const html = await render(ok(course), ok([course]), ok(chapters), {}, { status: "unavailable" });
    expect(html).toContain(unavailableMessage);
    expect(html).not.toContain("Kapittel 1: Organisasjoner");
  });

  it("viser feilmeldingen når sammendragene ikke kan hentes", async () => {
    const html = await render(ok(course), ok([course]), ok(chapters), { status: "unavailable" });
    expect(html).toContain(unavailableMessage);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("Kapittel 1: Organisasjoner");
  });

  it("sier fra når ingen kapitler er importert", async () => {
    const html = await render(ok(course), ok([course]), ok([]));
    expect(html).toContain("Ingen kapitler er importert ennå.");
  });

  it("viser feilmeldingen når kapitlene ikke kan hentes", async () => {
    const html = await render(ok(course), ok([course]), { status: "unavailable" });
    expect(html).toContain("Bytt emne");
    expect(html).toContain(unavailableMessage);
    expect(html).toContain('role="alert"');
  });
});
