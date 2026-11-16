import type { Metadata } from "next";
import Link from "next/link";
import { getDataSourceForRender } from "@/composition/server";
import { OwnerOnly } from "../OwnerOnly";
import { unavailableMessage } from "../emner/formState";
import { pageMain, primaryButton, secondaryButton, textLink } from "../emner/styles";
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
        <section className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-sm">
          <span aria-hidden="true" className="h-2 w-12 rounded-full bg-mint" />
          <ActiveCourse />
        </section>
      </main>
    </OwnerOnly>
  );
}

export async function ActiveCourse() {
  const data = await getDataSourceForRender();
  if (!data) return null;
  const active = await data.getActiveCourse();

  if (active.status !== "ok") {
    return (
      <>
        <h1 className="text-3xl leading-tight font-bold sm:text-4xl">Hei!</h1>
        <p role="alert" className="font-semibold text-error">
          {unavailableMessage}
        </p>
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
          <p role="alert" className="font-semibold text-error">
            {unavailableMessage}
          </p>
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

  return (
    <>
      <p className="text-sm font-semibold text-muted">Aktivt emne</p>
      <h1 className="text-3xl leading-tight font-bold break-words sm:text-4xl">
        {course.code} <span className="font-normal">{course.name}</span>
      </h1>
      {course.examForm && (
        <p className="max-w-prose text-lg break-words whitespace-pre-line text-muted">
          <span className="font-semibold">Eksamensform:</span> {course.examForm}
        </p>
      )}
      {course.learningOutcomes && (
        <details className="max-w-prose">
          <summary className={`cursor-pointer ${textLink}`}>Læringsutbytte</summary>
          <p className="mt-3 break-words whitespace-pre-line">{course.learningOutcomes}</p>
        </details>
      )}
      <div>
        <Link href="/emner" className={secondaryButton}>
          Bytt emne
        </Link>
      </div>
    </>
  );
}
