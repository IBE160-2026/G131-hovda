"use server";

import { redirect } from "next/navigation";
import { answerQuiz, reportQuizQuestion, startQuiz } from "@/application/quiz";
import { getDataSource } from "@/composition/server";
import { commentTooLongMessage, unavailableMessage, type ReportFormState } from "../../../../formState";

function quizPath(courseId: string, number: string, query = ""): string {
  return `/emner/${encodeURIComponent(courseId)}/delkapitler/${encodeURIComponent(number)}/quiz${query}`;
}

/** Tallet i feltet `svar`, eller `null` når det mangler. Gyldigheten sjekkes av `answerQuiz`. */
function readChoice(formData: FormData): number | null {
  const value = formData.get("svar");
  if (typeof value !== "string" || value.trim() === "") return null;
  return Number(value);
}

// Server Actions sjekker eieren selv (getDataSource). Siden viser utfallet etter `redirect`.
export async function startQuizAction(courseId: string, number: string): Promise<void> {
  const data = await getDataSource();
  if (!data) redirect("/");

  const result = await startQuiz(data, courseId, number);
  if (result.status === "unavailable") redirect(quizPath(courseId, number, "?feil=1"));
  if (result.status === "ok" && result.finished) {
    redirect(quizPath(courseId, number, `?resultat=${encodeURIComponent(result.quizId)}`));
  }
  redirect(quizPath(courseId, number));
}

export async function answerQuizAction(
  courseId: string,
  number: string,
  quizId: string,
  position: number,
  formData: FormData,
): Promise<void> {
  const data = await getDataSource();
  if (!data) redirect("/");

  const result = await answerQuiz(data, courseId, number, quizId, position, readChoice(formData));
  if (result.status === "unavailable") redirect(quizPath(courseId, number, "?feil=1"));
  if (result.status === "invalid") redirect(quizPath(courseId, number, "?feil=valg"));
  if (result.status === "ok" && result.finished) {
    redirect(quizPath(courseId, number, `?resultat=${encodeURIComponent(result.quizId)}`));
  }
  if (result.status === "ok" && result.feedbackPosition !== null) {
    redirect(quizPath(courseId, number, `?svar=${result.feedbackPosition}`));
  }
  redirect(quizPath(courseId, number));
}

/**
 * Melder spørsmålet på `position` som feil (FR-16). Lykkes det, sendes eieren videre til neste
 * spørsmål eller til resultatet, med beskjeden i `meldt`. Er kommentaren for lang eller databasen
 * nede, vises feilen i skjemaet, og teksten står igjen.
 */
export async function reportQuizQuestionAction(
  courseId: string,
  number: string,
  quizId: string,
  position: number,
  previous: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const data = await getDataSource();
  if (!data) redirect("/");

  const value = formData.get("kommentar");
  const comment = typeof value === "string" ? value : "";
  const result = await reportQuizQuestion(data, courseId, number, quizId, position, comment);
  const failed: ReportFormState = { comment, commentError: null, formError: null, attempt: previous.attempt + 1 };
  if (result.status === "invalid") return { ...failed, commentError: commentTooLongMessage };
  if (result.status === "unavailable") return { ...failed, formError: unavailableMessage };
  if (result.status === "notFound") redirect(quizPath(courseId, number));

  if (result.finished) {
    const meldt = result.removedFrom === "bank" ? "banken" : "quiz";
    redirect(quizPath(courseId, number, `?resultat=${encodeURIComponent(result.quizId)}&meldt=${meldt}`));
  }
  redirect(quizPath(courseId, number, result.finishFailed ? "?meldt=quiz&feil=1" : "?meldt=quiz"));
}
