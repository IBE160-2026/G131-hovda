import type { Metadata } from "next";
import Link from "next/link";
import { listChapterOverview } from "@/application/chapterOverview";
import { getDataSourceForRender } from "@/composition/server";
import { ChapterList } from "../../_screens/ChapterList";
import { CourseHeader } from "../../_screens/CourseHeader";
import { CourseSection } from "../../_screens/CourseSection";
import { Progress } from "../../_screens/Progress";
import { UnavailableMessage } from "../../_screens/UnavailableMessage";
import { OwnerOnly } from "../OwnerOnly";
import { pageMain, primaryButton, secondaryButton } from "../emner/styles";
import { logOut } from "./actions";

export const metadata: Metadata = {
  title: "Start – Studievenn",
};

export default function StartPage() {
  return (
    <OwnerOnly>
      <main className={pageMain}>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-wide text-accent uppercase">Studievenn</p>
          <form action={logOut}>
            <button type="submit" className={secondaryButton}>
              Logg ut
            </button>
          </form>
        </header>
        <CourseSection>
          <ActiveCourse />
        </CourseSection>
      </main>
    </OwnerOnly>
  );
}

/** Lenken fra kapittellisten til lesesiden for et delkapittel i emnet. */
function subchapterHref(courseId: string) {
  return (number: string) =>
    `/emner/${encodeURIComponent(courseId)}/delkapitler/${encodeURIComponent(number)}`;
}

export async function ActiveCourse() {
  const data = await getDataSourceForRender();
  if (!data) return null;
  const active = await data.getActiveCourse();

  if (active.status !== "ok") {
    return (
      <>
        <h1 className="text-3xl leading-tight font-bold sm:text-4xl">Hei!</h1>
        <UnavailableMessage />
      </>
    );
  }

  const course = active.value;
  if (!course) {
    const courses = await data.listCourses();
    if (courses.status !== "ok") {
      return (
        <>
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">Hei!</h1>
          <UnavailableMessage />
        </>
      );
    }
    const hasCourses = courses.value.length > 0;
    return (
      <>
        <h1 className="text-3xl leading-tight font-bold sm:text-4xl">Hei!</h1>
        <p className="max-w-prose text-lg text-muted">
          {hasCourses
            ? "Velg hvilket emne du vil jobbe med."
            : "Du har ingen emner ennå. Opprett et emne for å komme i gang."}
        </p>
        <div>
          <Link href={hasCourses ? "/emner" : "/emner/ny"} className={primaryButton}>
            {hasCourses ? "Velg emne" : "Opprett et emne"}
          </Link>
        </div>
      </>
    );
  }

  const [chapters, plan] = await Promise.all([listChapterOverview(data, course.id), data.getStudyPlan(course.id)]);
  // Kan planen ikke leses, vises emnet uten eksamensdato.
  const examDate = plan.status === "ok" ? plan.value?.examDate : undefined;
  return (
    <>
      <Progress chapters={chapters} />
      <p className="text-sm font-semibold text-muted">Aktivt emne</p>
      <CourseHeader course={course} examDate={examDate} />
      <div>
        <Link href="/emner" className={secondaryButton}>
          Bytt emne
        </Link>
      </div>
      <ChapterList chapters={chapters} subchapterHref={subchapterHref(course.id)} />
    </>
  );
}
