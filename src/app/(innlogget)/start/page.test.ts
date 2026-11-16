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

async function render(active: unknown, courses: unknown) {
  getDataSourceForRender.mockResolvedValue({
    getActiveCourse: async () => active,
    listCourses: async () => courses,
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
