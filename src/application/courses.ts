// Brukstilfellene for emner (FR-3, FR-6). Eneste sted som skriver emner og aktivt emne.
import { validateCourseInput, type CourseField, type CourseInput } from "@/domain/course";
import type { Course, DataSource } from "./dataSource";

export type SaveCourseResult =
  | { status: "ok"; course: Course }
  | { status: "invalid"; errors: Partial<Record<CourseField, string>> }
  | { status: "duplicate"; code: string }
  | { status: "notFound" }
  | { status: "unavailable" };

/**
 * Validerer og oppretter emnet, eller endrer det når `id` er gitt.
 * Har eieren ikke noe aktivt emne, blir et nytt emne aktivt.
 */
export async function saveCourse(
  data: DataSource,
  input: CourseInput,
  id?: string,
): Promise<SaveCourseResult> {
  const validation = validateCourseInput(input);
  if (!validation.ok) return { status: "invalid", errors: validation.errors };
  const value = validation.value;

  if (id !== undefined) {
    const updated = await data.updateCourse(id, value);
    if (updated.status === "duplicate") return { status: "duplicate", code: value.code };
    if (updated.status === "unavailable") return updated;
    if (!updated.value) return { status: "notFound" };
    return { status: "ok", course: updated.value };
  }

  const created = await data.createCourse(value);
  if (created.status === "duplicate") return { status: "duplicate", code: value.code };
  if (created.status === "unavailable") return created;

  // Emnet er lagret. Feiler det å gjøre det aktivt, kan eieren velge det i emnelisten.
  const active = await data.getActiveCourse();
  if (active.status === "ok" && active.value === null) {
    await data.setActiveCourse(created.value.id);
  }
  return { status: "ok", course: created.value };
}

export type RemoveCourseResult = { status: "ok" } | { status: "unavailable" };

/** Sletter emnet. Var det aktivt, blir et annet av eierens emner aktivt, ellers ingen. */
export async function removeCourse(data: DataSource, id: string): Promise<RemoveCourseResult> {
  const active = await data.getActiveCourse();
  if (active.status === "unavailable") return active;
  const wasActive = active.value?.id === id;

  const deleted = await data.deleteCourse(id);
  if (deleted.status !== "ok") return { status: "unavailable" };
  if (!wasActive) return { status: "ok" };

  // Databasen har alt satt aktivt emne til tomt (on delete set null). Velg et nytt om det finnes.
  const remaining = await data.listCourses();
  if (remaining.status === "ok" && remaining.value.length > 0) {
    await data.setActiveCourse(remaining.value[0].id);
  }
  return { status: "ok" };
}

/** Gjør emnet til eierens aktive emne. */
export async function chooseCourse(
  data: DataSource,
  id: string,
): Promise<{ status: "ok" } | { status: "notFound" } | { status: "unavailable" }> {
  const course = await data.getCourse(id);
  if (course.status === "unavailable") return course;
  if (!course.value) return { status: "notFound" };
  const result = await data.setActiveCourse(id);
  return result.status === "ok" ? { status: "ok" } : { status: "unavailable" };
}
