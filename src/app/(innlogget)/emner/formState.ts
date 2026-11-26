import type { CourseField, CourseInput } from "@/domain/course";
import type { StudyPlanField } from "@/domain/studyPlan";

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

/** Skjemaet for eksamensdato og planstart. Datoene er `ÅÅÅÅ-MM-DD`, som i `<input type="date">`. */
export type StudyPlanFormState = {
  values: { examDate: string; planStart: string };
  errors: Partial<Record<StudyPlanField, string>>;
  formError: string | null;
  /** Bekreftelsen etter lagring. */
  message: string | null;
  attempt: number;
};

export function initialStudyPlanFormState(
  values: StudyPlanFormState["values"] = { examDate: "", planStart: "" },
): StudyPlanFormState {
  return { values, errors: {}, formError: null, message: null, attempt: 0 };
}

export const studyPlanSavedMessage = "Planen er lagret.";
export const studyPlanUnchangedMessage = "Eksamensdatoen og planstart er uendret, så planen er den samme.";

export const unavailableMessage = "Noe gikk galt. Prøv igjen senere.";
export const notFoundMessage = "Fant ikke emnet. Det kan være slettet.";

// Lesesiden for sammendraget.
export const subchapterNotFoundMessage = "Fant ikke delkapittelet.";
export const noSummaryMessage = "Dette delkapittelet har ikke noe sammendrag ennå.";
export const outdatedMessage = "Notatet er endret etter at dette sammendraget ble laget.";

// Feilrapporten på sammendraget.
export const summaryReportLabel = "Meld feil i sammendraget";
export const summaryReportedMessage = "Sammendraget er meldt som feil. Det vises til neste import.";

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

// Feilrapporten på et quizspørsmål.
export const reportQuestionLabel = "Meld feil i spørsmålet";
export const reportCommentLabel = "Hva er feil? (valgfritt)";
export const reportButtonLabel = "Send feilrapport";
export const reportPendingLabel = "Sender …";
export const reportedFromQuizMessage = "Spørsmålet er meldt som feil og tatt ut av quizen.";
export const reportedFromBankMessage = "Spørsmålet er meldt som feil og tatt ut av banken.";
export const alreadyReportedMessage = "Spørsmålet er meldt som feil.";
export const allReportedMessage = "Alle spørsmålene ble meldt som feil, så quizen har ikke noe resultat.";
export const commentTooLongMessage = "Kommentaren kan være på høyst 500 tegn.";

/** Skjemaet for feilrapporten. Ved feil beholdes teksten. */
export type ReportFormState = {
  comment: string;
  /** Feil ved kommentarfeltet. */
  commentError: string | null;
  /** Feil for hele skjemaet, for eksempel når databasen ikke svarer. */
  formError: string | null;
  attempt: number;
};

export const initialReportFormState: ReportFormState = { comment: "", commentError: null, formError: null, attempt: 0 };

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

// Foran eller bak studieplanen. Ingen skyldspråk (UX-3).
export const onTrackMessage = "Du er i rute.";

/** «1 delkapittel» eller «3 delkapitler». */
function subchapterCount(n: number): string {
  return `${n} ${n === 1 ? "delkapittel" : "delkapitler"}`;
}

/** «2 delkapitler foran planen.» */
export function aheadText(lead: number): string {
  return `${subchapterCount(lead)} foran planen.`;
}

/** «3 delkapitler bak planen.» */
export function behindText(backlog: number): string {
  return `${subchapterCount(backlog)} bak planen.`;
}

/**
 * Veien tilbake: «2 delkapitler i kveld, så er du i rute søndag.» `onTrackLabel` er dagen, for eksempel
 * «i morgen» eller «søndag», eller `null` når eieren ikke er i rute før eksamen.
 */
export function catchUpText(perDay: number, onTrackLabel: string | null): string {
  return onTrackLabel
    ? `${subchapterCount(perDay)} i kveld, så er du i rute ${onTrackLabel}.`
    : `${subchapterCount(perDay)} om dagen tar deg nærmere planen.`;
}

// Dagens forslag (FR-10 del 2, UX-1, UX-2).
export const dailySuggestionHeading = "Dagens forslag";
export const startSessionLabel = "Start økta";
export const sessionDoneMessage = "Dagens økt er gjort.";
export const flexibleDayMessage = "I dag er en fleksibel dag. Du kan velge et delkapittel selv i listen under.";
export const nothingReadyMessage = "Ingen delkapitler er klare ennå.";
/** Etter eksamensdatoen. */
export const finishedMessage = "Fullført.";

/** «3.2», «3.2 og 3.3» eller «3.2, 3.3 og 3.4». */
function numberList(numbers: readonly string[]): string {
  if (numbers.length <= 1) return numbers.join("");
  return `${numbers.slice(0, -1).join(", ")} og ${numbers[numbers.length - 1]}`;
}

/** «I kveld: delkapittel 3.2, deretter quiz.» eller «I kveld: delkapittel 3.2 og 3.3, med quiz etter hvert.» */
export function suggestionText(numbers: readonly string[]): string {
  const quiz = numbers.length === 1 ? "deretter quiz" : "med quiz etter hvert";
  return `I kveld: delkapittel ${numberList(numbers)}, ${quiz}.`;
}

/** «I kveld: repetisjon med ny quiz på delkapittel 1.1 og 1.2.» */
export function reviewText(numbers: readonly string[]): string {
  return `I kveld: repetisjon med ny quiz på delkapittel ${numberList(numbers)}.`;
}
