import type { Metadata } from "next";
import Link from "next/link";
import { getDataSourceForRender } from "@/composition/server";
import { OwnerOnly } from "../../OwnerOnly";
import { startPlanAction, updateCourseAction } from "../actions";
import { CourseForm } from "../CourseForm";
import {
  initialCourseFormState,
  initialStudyPlanFormState,
  notFoundMessage,
  unavailableMessage,
} from "../formState";
import { pageMain, textLink } from "../styles";
import { StudyPlanForm } from "./StudyPlanForm";

export const metadata: Metadata = {
  title: "Endre emne – Studievenn",
};

export default function EditCoursePage({ params }: PageProps<"/emner/[id]">) {
  return (
    <OwnerOnly>
      <main className={pageMain}>
        <header className="flex flex-col gap-3">
          <Link href="/emner" className={`self-start text-sm ${textLink}`}>
            Til emnene
          </Link>
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">Endre emne</h1>
        </header>
        <EditCourse params={params} />
      </main>
    </OwnerOnly>
  );
}

export async function EditCourse({ params }: Pick<PageProps<"/emner/[id]">, "params">) {
  const { id } = await params;
  const data = await getDataSourceForRender();
  if (!data) return null;
  const course = await data.getCourse(id);

  if (course.status !== "ok") {
    return (
      <p role="alert" className="font-semibold text-error">
        {unavailableMessage}
      </p>
    );
  }
  if (!course.value) return <p className="text-lg text-muted">{notFoundMessage}</p>;

  const { code, name, learningOutcomes, examForm } = course.value;
  const plan = await data.getStudyPlan(course.value.id);
  return (
    <>
      <CourseForm
        action={updateCourseAction.bind(null, course.value.id)}
        initialState={initialCourseFormState({ code, name, learningOutcomes, examForm })}
        submitLabel="Lagre endringene"
        pendingLabel="Lagrer …"
      />
      <section aria-labelledby="studieplan" className="flex flex-col gap-5 border-t border-muted/30 pt-8">
        <h2 id="studieplan" className="text-2xl font-bold">
          Eksamensdato og planstart
        </h2>
        {plan.status === "ok" ? (
          <StudyPlanForm
            action={startPlanAction.bind(null, course.value.id)}
            initialState={initialStudyPlanFormState(
              plan.value ? { examDate: plan.value.examDate, planStart: plan.value.planStart } : undefined,
            )}
          />
        ) : (
          <p role="alert" className="font-semibold text-error">
            {unavailableMessage}
          </p>
        )}
      </section>
    </>
  );
}
