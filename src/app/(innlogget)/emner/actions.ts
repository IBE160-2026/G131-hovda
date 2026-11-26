"use server";

import { redirect } from "next/navigation";
import { chooseCourse, removeCourse, saveCourse } from "@/application/courses";
import { startPlan } from "@/application/studyPlan";
import { courseMessages, type CourseInput } from "@/domain/course";
import { getClock, getDataSource } from "@/composition/server";
import {
  notFoundMessage,
  studyPlanSavedMessage,
  studyPlanUnchangedMessage,
  unavailableMessage,
  type CourseFormState,
  type StudyPlanFormState,
} from "./formState";

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

// Eksamensdato og planstart (3.1). Blir på siden og viser planen slik den er lagret.
export async function startPlanAction(
  courseId: string,
  previous: StudyPlanFormState,
  formData: FormData,
): Promise<StudyPlanFormState> {
  const data = await getDataSource();
  if (!data) redirect("/");

  const values = {
    examDate: String(formData.get("examDate") ?? ""),
    planStart: String(formData.get("planStart") ?? ""),
  };
  const result = await startPlan(data, getClock(), courseId, values);
  const state: StudyPlanFormState = {
    values,
    errors: {},
    formError: null,
    message: null,
    attempt: previous.attempt + 1,
  };
  if (result.status === "ok" || result.status === "unchanged") {
    state.values = { examDate: result.plan.examDate, planStart: result.plan.planStart };
    state.message = result.status === "ok" ? studyPlanSavedMessage : studyPlanUnchangedMessage;
  }
  if (result.status === "invalid") state.errors = result.errors;
  if (result.status === "notFound") state.formError = notFoundMessage;
  if (result.status === "unavailable") state.formError = unavailableMessage;
  return state;
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
