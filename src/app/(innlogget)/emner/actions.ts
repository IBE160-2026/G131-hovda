"use server";

import { redirect } from "next/navigation";
import { chooseCourse, removeCourse, saveCourse } from "@/application/courses";
import { courseMessages, type CourseInput } from "@/domain/course";
import { getDataSource } from "@/composition/server";
import { notFoundMessage, unavailableMessage, type CourseFormState } from "./formState";

function readCourseForm(formData: FormData): CourseInput {
  const field = (name: string) => String(formData.get(name) ?? "");
  return {
    code: field("code"),
    name: field("name"),
    learningOutcomes: field("learningOutcomes"),
    examForm: field("examForm"),
  };
}

// Felles for oppretting og endring. Server Actions sjekker eieren selv (getDataSource).
async function save(
  previous: CourseFormState,
  formData: FormData,
  id?: string,
): Promise<CourseFormState> {
  const data = await getDataSource();
  if (!data) redirect("/");

  const values = readCourseForm(formData);
  const result = await saveCourse(data, values, id);
  if (result.status === "ok") redirect("/emner");

  const state: CourseFormState = {
    values,
    errors: {},
    formError: null,
    attempt: previous.attempt + 1,
  };
  if (result.status === "invalid") state.errors = result.errors;
  if (result.status === "duplicate") state.errors = { code: courseMessages.duplicateCode(result.code) };
  if (result.status === "notFound") state.formError = notFoundMessage;
  if (result.status === "unavailable") state.formError = unavailableMessage;
  return state;
}

export async function createCourseAction(
  previous: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  return save(previous, formData);
}

export async function updateCourseAction(
  id: string,
  previous: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  return save(previous, formData, id);
}

export async function deleteCourseAction(id: string): Promise<void> {
  const data = await getDataSource();
  if (!data) redirect("/");

  const result = await removeCourse(data, id);
  if (result.status === "ok") redirect("/emner");
  redirect(`/emner/${encodeURIComponent(id)}/slett?feil=1`);
}

export async function chooseCourseAction(formData: FormData): Promise<void> {
  const data = await getDataSource();
  if (!data) redirect("/");

  const result = await chooseCourse(data, String(formData.get("id") ?? ""));
  if (result.status === "ok") redirect("/start");
  redirect("/emner?feil=1");
}
