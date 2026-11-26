// Brukstilfellet for studieplanen (FR-3 del 2, AD-11, AD-15). Eneste sted som skriver planen.
import { planSnapshot, validateStudyPlanDates, type StudyPlanField } from "@/domain/studyPlan";
import type { Clock } from "./clock";
import type { DataSource, StudyPlan } from "./dataSource";

export type StudyPlanDatesInput = {
  /** `ÅÅÅÅ-MM-DD`. */
  examDate: string;
  /** `ÅÅÅÅ-MM-DD`, eller tom for i dag. */
  planStart: string;
};

export type StartPlanResult =
  | { status: "ok"; plan: StudyPlan }
  | { status: "unchanged"; plan: StudyPlan }
  | { status: "invalid"; errors: Partial<Record<StudyPlanField, string>> }
  | { status: "notFound" }
  | { status: "unavailable" };

/**
 * Lagrer eksamensdatoen og planstart for emnet, med et nytt øyeblikksbilde (G₀, R₀, D) som erstatter
 * det gamle. Tom planstart er i dag (`clock.today()`). Skjemaet er forhåndsutfylt med planen som finnes,
 * så når eksamensdatoen endres og planstart står som før, starter den nye planen i dag. Er begge
 * uendret, lagres ingenting (`unchanged`).
 */
export async function startPlan(
  data: DataSource,
  clock: Clock,
  courseId: string,
  input: StudyPlanDatesInput,
): Promise<StartPlanResult> {
  const today = clock.today();

  const course = await data.getCourse(courseId);
  if (course.status === "unavailable") return course;
  if (!course.value) return { status: "notFound" };

  const existing = await data.getStudyPlan(courseId);
  if (existing.status === "unavailable") return existing;
  const current = existing.value;

  let planStart = input.planStart.trim();
  if (current && planStart === current.planStart && input.examDate.trim() !== current.examDate) planStart = "";

  const validation = validateStudyPlanDates({ examDate: input.examDate, planStart }, today);
  if (!validation.ok) return { status: "invalid", errors: validation.errors };
  const dates = validation.value;

  if (current && current.examDate === dates.examDate && current.planStart === dates.planStart) {
    return { status: "unchanged", plan: current };
  }

  const chapters = await data.listChapters(courseId);
  if (chapters.status === "unavailable") return chapters;
  const activeSubchapterIds = chapters.value.flatMap((c) => c.subchapters.map((s) => s.id));

  const completions = await data.listCompletions(activeSubchapterIds);
  if (completions.status === "unavailable") return completions;

  const snapshot = planSnapshot({ activeSubchapterIds, completions: completions.value, ...dates });
  const saved = await data.saveStudyPlan({ courseId, ...dates, ...snapshot });
  if (saved.status !== "ok") return { status: "unavailable" };
  return { status: "ok", plan: saved.value };
}
