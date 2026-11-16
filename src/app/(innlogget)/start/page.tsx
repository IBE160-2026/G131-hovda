import type { Metadata } from "next";
import Link from "next/link";
import type { Chapter, ReadResult } from "@/application/dataSource";
import { hasNotes } from "@/domain/hasNotes";
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
      <ChapterList chapters={await data.listChapters(course.id)} />
    </>
  );
}

/** Kapitlene i det aktive emnet med delkapitler i rekkefølge. Delkapitlene blir lenker i 1.7. */
export function ChapterList({ chapters }: { chapters: ReadResult<Chapter[]> }) {
  return (
    <section aria-labelledby="kapitler" className="mt-4 flex flex-col gap-4">
      <h2 id="kapitler" className="text-2xl font-bold">
        Kapitler
      </h2>
      {chapters.status !== "ok" ? (
        <p role="alert" className="font-semibold text-error">
          {unavailableMessage}
        </p>
      ) : chapters.value.length === 0 ? (
        <p className="max-w-prose text-muted">Ingen kapitler er importert ennå.</p>
      ) : (
        <ol className="flex flex-col gap-6">
          {chapters.value.map((chapter) => (
            <li key={chapter.id} className="flex flex-col gap-3">
              <h3 className="text-xl font-semibold break-words">
                Kapittel {chapter.number}: {chapter.title}
              </h3>
              <ol className="flex flex-col gap-2">
                {chapter.subchapters.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-sky px-4 py-3"
                  >
                    <span className="min-w-0 break-words">
                      <span className="font-semibold">{sub.number}</span> {sub.title}
                    </span>
                    {!hasNotes(sub.noteText) && (
                      <span className="rounded-full bg-sun px-3 py-0.5 text-sm font-semibold">
                        mangler notater
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
