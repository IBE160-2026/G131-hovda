import type { CourseField, CourseInput } from "@/domain/course";

export type CourseFormState = {
  values: CourseInput;
  errors: Partial<Record<CourseField, string>>;
  formError: string | null;
  // Øker for hvert forsøk, så skjemaet tegnes på nytt med verdiene fra serveren.
  attempt: number;
};

export const emptyCourse: CourseInput = { code: "", name: "", learningOutcomes: "", examForm: "" };

export function initialCourseFormState(values: CourseInput = emptyCourse): CourseFormState {
  return { values, errors: {}, formError: null, attempt: 0 };
}

export const unavailableMessage = "Noe gikk galt. Prøv igjen senere.";
export const notFoundMessage = "Fant ikke emnet. Det kan være slettet.";

// Lesesiden for sammendraget.
export const subchapterNotFoundMessage = "Fant ikke delkapittelet.";
export const noSummaryMessage = "Dette delkapittelet har ikke noe sammendrag ennå.";
export const outdatedMessage = "Notatet er endret etter at dette sammendraget ble laget.";
