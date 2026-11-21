"use server";

import { redirect } from "next/navigation";
import { answerQuiz, startQuiz } from "@/application/quiz";
import { getDataSource } from "@/composition/server";

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
