import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const getDataSourceForRender = vi.fn();
vi.mock("@/composition/server", () => ({ getDataSourceForRender }));
vi.mock("../actions", () => ({ updateCourseAction: async () => {}, startPlanAction: async () => {} }));

const { EditCourse } = await import("./page");
const { unavailableMessage } = await import("../formState");

const course = { id: "c1", code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "LU", examForm: "Skriftlig" };
const ok = <T>(value: T) => ({ status: "ok", value });
const getStudyPlan = vi.fn();

async function render(plan: unknown) {
  getDataSourceForRender.mockResolvedValue({
    getCourse: async () => ok(course),
    getStudyPlan: getStudyPlan.mockReset().mockResolvedValue(plan),
  });
  return renderToStaticMarkup(await EditCourse({ params: Promise.resolve({ id: "c1" }) }));
}

/** `<input …>` for feltet med `id`. */
function input(html: string, id: string) {
  return html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))?.[0] ?? "";
}

describe("EditCourse med eksamensdato og planstart", () => {
  beforeEach(() => getDataSourceForRender.mockReset());

  it("fyller ut begge datoene med planen som finnes", async () => {
    const html = await render(ok({ courseId: "c1", examDate: "2026-12-10", planStart: "2026-11-26", g0: 7, r0: 2, d: 10 }));
    expect(getStudyPlan).toHaveBeenCalledWith("c1");
    expect(input(html, "examDate")).toContain('value="2026-12-10"');
    expect(input(html, "planStart")).toContain('value="2026-11-26"');
  });

  it("lar begge datoene stå tomme uten plan", async () => {
    const html = await render(ok(null));
    expect(input(html, "examDate")).toContain('value=""');
    expect(input(html, "planStart")).toContain('value=""');
  });

  it("viser feilmeldingen og ikke planskjemaet når planen ikke kan leses", async () => {
    const html = await render({ status: "unavailable" });
    expect(html).toContain(unavailableMessage);
    expect(input(html, "examDate")).toBe("");
    expect(input(html, "planStart")).toBe("");
    // Emneskjemaet vises fortsatt.
    expect(input(html, "code")).toContain('value="IBE430"');
  });
});
