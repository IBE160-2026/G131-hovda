import type { Metadata } from "next";
import Link from "next/link";
import { getDataSourceForRender } from "@/composition/server";
import { OwnerOnly } from "../../OwnerOnly";
import { updateCourseAction } from "../actions";
import { CourseForm } from "../CourseForm";
import { initialCourseFormState, notFoundMessage, unavailableMessage } from "../formState";
import { pageMain, textLink } from "../styles";

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

async function EditCourse({ params }: Pick<PageProps<"/emner/[id]">, "params">) {
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
  return (
    <CourseForm
      action={updateCourseAction.bind(null, course.value.id)}
      initialState={initialCourseFormState({ code, name, learningOutcomes, examForm })}
      submitLabel="Lagre endringene"
      pendingLabel="Lagrer …"
    />
  );
}
