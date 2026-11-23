"use server";

import { redirect } from "next/navigation";
import { reportSummary } from "@/application/chapterOverview";
import { getDataSource } from "@/composition/server";
import { commentTooLongMessage, unavailableMessage, type ReportFormState } from "../../../formState";

function summaryPath(courseId: string, number: string): string {
  return `/emner/${encodeURIComponent(courseId)}/delkapitler/${encodeURIComponent(number)}`;
}

/**
 * Melder sammendragsversjonen `versionId` som feil (FR-12). Server Actions sjekker eieren selv
 * (getDataSource). Lykkes det, eller er siden gammel, lastes lesesiden på nytt, og den viser
 * beskjeden eller den nyeste versjonen. Er kommentaren for lang eller databasen nede, vises feilen i
 * skjemaet, og teksten står igjen.
 */
export async function reportSummaryAction(
  courseId: string,
  number: string,
  versionId: string,
  previous: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const data = await getDataSource();
  if (!data) redirect("/");

  const value = formData.get("kommentar");
  const comment = typeof value === "string" ? value : "";
  const result = await reportSummary(data, courseId, number, versionId, comment);
  const failed: ReportFormState = { comment, commentError: null, formError: null, attempt: previous.attempt + 1 };
  if (result.status === "invalid") return { ...failed, commentError: commentTooLongMessage };
  if (result.status === "unavailable") return { ...failed, formError: unavailableMessage };
  redirect(summaryPath(courseId, number));
}
