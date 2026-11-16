import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const getDataSourceForRender = vi.fn();
vi.mock("@/composition/server", () => ({ getDataSourceForRender }));
vi.mock("./actions", () => ({ logOut: async () => {} }));

const { ActiveCourse } = await import("./page");
const { unavailableMessage } = await import("../emner/formState");

const course = {
  id: "c1",
  code: "IBE430",
  name: "Virksomhetssystemer",
  learningOutcomes: "LU",
  examForm: "Skriftlig",
};
const ok = <T>(value: T) => ({ status: "ok", value });

const listChapters = vi.fn();

async function render(active: unknown, courses: unknown, chapters: unknown = ok([])) {
  getDataSourceForRender.mockResolvedValue({
    getActiveCourse: async () => active,
    listCourses: async () => courses,
    listChapters: listChapters.mockReset().mockResolvedValue(chapters),
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

  it("lager ingen lenker til delkapitlene ennå", async () => {
    const html = await render(ok(course), ok([course]), ok(chapters));
    expect(html.match(/<a /g)).toHaveLength(1); // bare «Bytt emne»
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
