import type { Metadata } from "next";
import Link from "next/link";
import { getDataSourceForRender } from "@/composition/server";
import { OwnerOnly } from "../OwnerOnly";
import { chooseCourseAction } from "./actions";
import { unavailableMessage } from "./formState";
import { pageMain, primaryButton, secondaryButton, textLink } from "./styles";

export const metadata: Metadata = {
  title: "Emner – Studievenn",
};

export default function CoursesPage({ searchParams }: PageProps<"/emner">) {
  return (
    <OwnerOnly>
      <main className={pageMain}>
        <header className="flex flex-col gap-3">
          <Link href="/start" className={`self-start text-sm ${textLink}`}>
            Til startsiden
          </Link>
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">Emnene dine</h1>
        </header>
        <CourseList searchParams={searchParams} />
        <div>
          <Link href="/emner/ny" className={primaryButton}>
            Nytt emne
          </Link>
        </div>
      </main>
    </OwnerOnly>
  );
}

async function CourseList({ searchParams }: Pick<PageProps<"/emner">, "searchParams">) {
  const failed = (await searchParams).feil !== undefined;
  const data = await getDataSourceForRender();
  if (!data) return null;
  const [courses, active] = await Promise.all([data.listCourses(), data.getActiveCourse()]);

  if (courses.status !== "ok" || active.status !== "ok") {
    return (
      <p role="alert" className="font-semibold text-error">
        {unavailableMessage}
      </p>
    );
  }

  const activeId = active.value?.id;

  return (
    <>
      {failed && (
        <p role="alert" className="font-semibold text-error">
          {unavailableMessage}
        </p>
      )}
      {courses.value.length === 0 ? (
        <p className="text-lg text-muted">Du har ingen emner ennå.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {courses.value.map((course) => {
            const isActive = course.id === activeId;
            return (
              <li
                key={course.id}
                aria-current={isActive ? "true" : undefined}
                className={`flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ${isActive ? "ring-3 ring-accent" : ""}`}
              >
                <div className="flex min-w-0 flex-col gap-2">
                  {isActive && (
                    <p className="self-start rounded-full bg-mint px-3 py-1 text-sm font-semibold">
                      Aktivt emne
                    </p>
                  )}
                  <h2 className="text-xl font-semibold break-words">
                    {course.code} <span className="font-normal">{course.name}</span>
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {!isActive && (
                    <form action={chooseCourseAction}>
                      <input type="hidden" name="id" value={course.id} />
                      <button
                        type="submit"
                        className={secondaryButton}
                        aria-label={`Velg ${course.code}`}
                      >
                        Velg
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/emner/${course.id}`}
                    className={textLink}
                    aria-label={`Endre ${course.code}`}
                  >
                    Endre
                  </Link>
                  <Link
                    href={`/emner/${course.id}/slett`}
                    className={textLink}
                    aria-label={`Slett ${course.code}`}
                  >
                    Slett
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
