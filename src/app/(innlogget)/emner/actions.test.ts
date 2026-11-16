import { beforeEach, describe, expect, it, vi } from "vitest";

const getDataSource = vi.fn();
vi.mock("@/composition/server", () => ({ getDataSource }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { createCourseAction, updateCourseAction, deleteCourseAction, chooseCourseAction } =
  await import("./actions");
const { initialCourseFormState } = await import("./formState");

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const filled = { code: "ibe430 ", name: "Virksomhetssystemer", learningOutcomes: "LU", examForm: "Skriftlig" };
const course = { id: "c1", code: "IBE430", name: "Virksomhetssystemer", learningOutcomes: "LU", examForm: "Skriftlig" };
const ok = <T>(value: T) => ({ status: "ok", value });

function dataSource(overrides: Record<string, unknown> = {}) {
  return {
    listCourses: vi.fn(async () => ok([course])),
    getCourse: vi.fn(async () => ok(course)),
    createCourse: vi.fn(async () => ok(course)),
    updateCourse: vi.fn(async () => ok(course)),
    deleteCourse: vi.fn(async () => ok(undefined)),
    getActiveCourse: vi.fn(async () => ok(null)),
    setActiveCourse: vi.fn(async () => ok(undefined)),
    ...overrides,
  };
}

describe("emnehandlingene", () => {
  beforeEach(() => getDataSource.mockReset());

  it("sender uinnloggede til forsiden uten å skrive noe", async () => {
    getDataSource.mockResolvedValue(null);
    await expect(createCourseAction(initialCourseFormState(), form(filled))).rejects.toThrow(
      /^redirect:\/$/,
    );
    await expect(deleteCourseAction("c1")).rejects.toThrow(/^redirect:\/$/);
    await expect(chooseCourseAction(form({ id: "c1" }))).rejects.toThrow(/^redirect:\/$/);
  });

  it("lagrer et nytt emne og sender til emnelisten", async () => {
    const data = dataSource();
    getDataSource.mockResolvedValue(data);
    await expect(createCourseAction(initialCourseFormState(), form(filled))).rejects.toThrow(
      "redirect:/emner",
    );
    expect(data.createCourse).toHaveBeenCalledWith({ ...filled, code: "IBE430" });
    expect(data.setActiveCourse).toHaveBeenCalledWith("c1");
  });

  it("blir på skjemaet med utfylte felt når koden finnes", async () => {
    getDataSource.mockResolvedValue(dataSource({ createCourse: async () => ({ status: "duplicate" }) }));
    const state = await createCourseAction(initialCourseFormState(), form(filled));
    expect(state).toEqual({
      values: filled,
      errors: { code: "Du har allerede et emne med koden IBE430." },
      formError: null,
      attempt: 1,
    });
  });

  it("viser valideringsfeilene", async () => {
    getDataSource.mockResolvedValue(dataSource());
    const state = await createCourseAction(
      initialCourseFormState(),
      form({ ...filled, code: "IBE 430", name: "  " }),
    );
    expect(state.errors).toEqual({
      code: "Emnekoden må være 1–20 bokstaver eller tall, uten mellomrom.",
      name: "Skriv inn et navn på emnet.",
    });
  });

  it("sier fra når databasen er nede", async () => {
    getDataSource.mockResolvedValue(
      dataSource({ updateCourse: async () => ({ status: "unavailable" }) }),
    );
    const state = await updateCourseAction("c1", initialCourseFormState(), form(filled));
    expect(state.formError).toBe("Noe gikk galt. Prøv igjen senere.");
  });

  it("sletter og sender til emnelisten", async () => {
    const data = dataSource();
    getDataSource.mockResolvedValue(data);
    await expect(deleteCourseAction("c1")).rejects.toThrow("redirect:/emner");
    expect(data.deleteCourse).toHaveBeenCalledWith("c1");
  });

  it("blir på bekreftelsessiden når slettingen feiler", async () => {
    getDataSource.mockResolvedValue(dataSource({ deleteCourse: async () => ({ status: "unavailable" }) }));
    await expect(deleteCourseAction("c1")).rejects.toThrow("redirect:/emner/c1/slett?feil=1");
  });

  it("blir på emnelisten med feil når emnet som velges, ikke finnes", async () => {
    const data = dataSource({ getCourse: vi.fn(async () => ok(null)) });
    getDataSource.mockResolvedValue(data);
    await expect(chooseCourseAction(form({ id: "c9" }))).rejects.toThrow("redirect:/emner?feil=1");
    expect(data.setActiveCourse).not.toHaveBeenCalled();
  });

  it("blir på emnelisten med feil når valget ikke kan lagres", async () => {
    getDataSource.mockResolvedValue(
      dataSource({ setActiveCourse: async () => ({ status: "unavailable" }) }),
    );
    await expect(chooseCourseAction(form({ id: "c1" }))).rejects.toThrow("redirect:/emner?feil=1");
  });

  it("sier fra når emnet som endres, ikke finnes", async () => {
    getDataSource.mockResolvedValue(dataSource({ updateCourse: async () => ok(null) }));
    const state = await updateCourseAction("c9", initialCourseFormState(), form(filled));
    expect(state.formError).toBe("Fant ikke emnet. Det kan være slettet.");
  });

  it("velger emnet og sender til startsiden", async () => {
    const data = dataSource();
    getDataSource.mockResolvedValue(data);
    await expect(chooseCourseAction(form({ id: "c1" }))).rejects.toThrow("redirect:/start");
    expect(data.setActiveCourse).toHaveBeenCalledWith("c1");
  });
});
