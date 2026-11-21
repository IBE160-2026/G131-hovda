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

// Quizen.
export const quizNotReadyMessage = "Dette delkapittelet har ikke quiz ennå.";
export const tooFewQuestionsMessage = "Spørsmålsbanken har for få spørsmål til en quiz.";
export const chooseAnswerMessage = "Velg et svar før du går videre.";
export const correctAnswerMessage = "Riktig!";
export const wrongAnswerMessage = "Ikke riktig.";

// Avkrysningen under quizresultatet.
export const completedMessage = "Delkapittelet er krysset av som gjennomført.";
export const alreadyCompletedMessage = "Delkapittelet er alt gjennomført.";
export const belowThresholdMessage =
  "Under 80 % riktige denne gangen. Les sammendraget igjen, og ta en ny quiz når du er klar.";
export const newQuizLabel = "Ta en ny quiz";

// Framdriften på startsiden.
export const completedBadge = "gjennomført";
export const goalReachedMessage = "Målet er nådd!";

/** «5 av 19 gjennomført, mål 18». */
export function progressText(completed: number, total: number, goal: number): string {
  return `${completed} av ${total} gjennomført, mål ${goal}`;
}

/** «13 igjen til målet». */
export function remainingText(remaining: number): string {
  return `${remaining} igjen til målet`;
}
