import { describe, expect, it } from "vitest";
import { courseMessages, normalizeCourseCode, validateCourseInput, type CourseInput } from "./course";

function input(overrides: Partial<CourseInput> = {}): CourseInput {
  return {
    code: "IBE430",
    name: "Virksomhetssystemer",
    learningOutcomes: "Kunnskap om ERP.",
    examForm: "Skriftlig eksamen, 4 timer",
    ...overrides,
  };
}

describe("normalizeCourseCode", () => {
  it("fjerner mellomrom rundt og gjør om til store bokstaver", () => {
    expect(normalizeCourseCode(" ibe430 ")).toBe("IBE430");
  });

  it("lar en kode som alt er normalisert, være som den er", () => {
    expect(normalizeCourseCode("IBE160")).toBe("IBE160");
  });
});

describe("validateCourseInput", () => {
  it("godtar et gyldig emne og normaliserer koden", () => {
    expect(validateCourseInput(input({ code: "ibe430 ", name: "  Virksomhetssystemer " }))).toEqual({
      ok: true,
      value: input({ name: "Virksomhetssystemer" }),
    });
  });

  it("fjerner mellomrom rundt læringsutbytte og eksamensform", () => {
    const result = validateCourseInput(input({ learningOutcomes: "\n LU \n", examForm: " Muntlig " }));
    expect(result.ok && result.value).toMatchObject({ learningOutcomes: "LU", examForm: "Muntlig" });
  });

  it("godtar tomt læringsutbytte og tom eksamensform", () => {
    expect(validateCourseInput(input({ learningOutcomes: "", examForm: "" })).ok).toBe(true);
  });

  it("godtar en kode på nøyaktig 20 tegn", () => {
    expect(validateCourseInput(input({ code: "A".repeat(20) })).ok).toBe(true);
  });

  it("godtar norske bokstaver i koden", () => {
    expect(validateCourseInput(input({ code: "øk100" }))).toMatchObject({
      ok: true,
      value: { code: "ØK100" },
    });
  });

  it.each([
    ["tom", ""],
    ["bare mellomrom", "   "],
    ["over 20 tegn", "A".repeat(21)],
    ["mellomrom inni", "IBE 430"],
    ["tegnsetting", "IBE-430"],
  ])("avviser koden når den er %s", (_case, code) => {
    expect(validateCourseInput(input({ code }))).toEqual({
      ok: false,
      errors: { code: courseMessages.invalidCode },
    });
  });

  it("avviser et navn med bare mellomrom", () => {
    expect(validateCourseInput(input({ name: "   " }))).toEqual({
      ok: false,
      errors: { name: courseMessages.emptyName },
    });
  });

  it("gir begge feilene samtidig", () => {
    const result = validateCourseInput(input({ code: "", name: "" }));
    expect(result.ok === false && Object.keys(result.errors).sort()).toEqual(["code", "name"]);
  });

  it("har meldingene fra matrisen", () => {
    expect(courseMessages.invalidCode).toBe(
      "Emnekoden må være 1–20 bokstaver eller tall, uten mellomrom.",
    );
    expect(courseMessages.duplicateCode("IBE430")).toBe(
      "Du har allerede et emne med koden IBE430.",
    );
  });
});
