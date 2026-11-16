/**
 * Regler for emner (FR-3, FR-6). Rene funksjoner uten avhengigheter (AD-2).
 */

export type CourseInput = {
  code: string;
  name: string;
  learningOutcomes: string;
  examForm: string;
};

export type CourseField = "code" | "name";

export type CourseValidation =
  | { ok: true; value: CourseInput }
  | { ok: false; errors: Partial<Record<CourseField, string>> };

export const COURSE_CODE_MAX_LENGTH = 20;

export const courseMessages = {
  invalidCode: `Emnekoden må være 1–${COURSE_CODE_MAX_LENGTH} bokstaver eller tall, uten mellomrom.`,
  emptyName: "Skriv inn et navn på emnet.",
  duplicateCode: (code: string) => `Du har allerede et emne med koden ${code}.`,
} as const;

const validCode = new RegExp(`^[\\p{L}\\p{N}]{1,${COURSE_CODE_MAX_LENGTH}}$`, "u");

/** Fjerner mellomrom rundt og gjør om til store bokstaver: «ibe430 » → «IBE430». */
export function normalizeCourseCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Validerer og normaliserer det eieren har skrevet inn. */
export function validateCourseInput(input: CourseInput): CourseValidation {
  const value: CourseInput = {
    code: normalizeCourseCode(input.code),
    name: input.name.trim(),
    learningOutcomes: input.learningOutcomes.trim(),
    examForm: input.examForm.trim(),
  };

  const errors: Partial<Record<CourseField, string>> = {};
  if (!validCode.test(value.code)) errors.code = courseMessages.invalidCode;
  if (value.name === "") errors.name = courseMessages.emptyName;

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };
}
