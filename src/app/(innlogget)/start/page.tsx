import type { Metadata } from "next";
import Link from "next/link";
import { listChapterOverview, type ChapterOverview } from "@/application/chapterOverview";
import type { ReadResult } from "@/application/dataSource";
import { courseProgress } from "@/domain/progress";
import type { SubchapterStatus } from "@/domain/summary";
import { getDataSourceForRender } from "@/composition/server";
import { OwnerOnly } from "../OwnerOnly";
import {
  completedBadge,
  goalReachedMessage,
  progressText,
  remainingText,
  unavailableMessage,
} from "../emner/formState";
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

  const chapters = await listChapterOverview(data, course.id);
  return (
    <>
      <Progress chapters={chapters} />
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
      <ChapterList courseId={course.id} chapters={chapters} />
    </>
  );
}

/**
 * Framdriften mot målet øverst i emnekortet (FR-15, FR-20): gjennomførte av de aktive
 * delkapitlene, målet på 90 % og hvor mange som er igjen. «Gjennomført» kommer fra avkrysningen.
 * Vises ikke uten delkapitler, eller når de ikke kan leses (kapittellisten sier da fra).
 */
export function Progress({ chapters }: { chapters: ReadResult<ChapterOverview[]> }) {
  if (chapters.status !== "ok") return null;
  const subchapters = chapters.value.flatMap((c) => c.subchapters);
  if (subchapters.length === 0) return null;
  const { completed, total, goal, remaining } = courseProgress(
    subchapters.length,
    subchapters.filter((s) => s.completed).length,
  );
  return (
    <section aria-label="Framdrift" className="flex flex-col gap-2 rounded-xl bg-mint px-4 py-3">
      <p id="framdrift-tekst" className="text-lg font-semibold">
        {progressText(completed, total, goal)}
      </p>
      <progress
        aria-labelledby="framdrift-tekst"
        value={completed}
        max={total}
        className="h-3 w-full accent-accent"
      />
      <p>{remaining === 0 ? goalReachedMessage : remainingText(remaining)}</p>
    </section>
  );
}

const statusColors: Record<SubchapterStatus, string> = {
  klart: "bg-mint",
  utdatert: "bg-sun",
  "mangler innhold": "bg-sky",
  "mangler notater": "bg-sun",
};

/**
 * Delkapitler med et klart sammendrag, også et utdatert, kan leses, selv om spørsmålsbanken mangler.
 * Gjelder `summaryStatus`, ikke den samlede statusen.
 */
function canRead(summaryStatus: SubchapterStatus): boolean {
  return summaryStatus === "klart" || summaryStatus === "utdatert";
}

/**
 * Kapitlene i det aktive emnet med delkapitler i rekkefølge og samlet status for sammendraget og
 * spørsmålsbanken. Delkapitler med et sammendrag lenker til lesesiden. Gjennomførte delkapitler
 * har merket «gjennomført» ved siden av statusen.
 */
export function ChapterList({
  courseId,
  chapters,
}: {
  courseId: string;
  chapters: ReadResult<ChapterOverview[]>;
}) {
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
                    {canRead(sub.summaryStatus) ? (
                      <Link
                        href={`/emner/${encodeURIComponent(courseId)}/delkapitler/${encodeURIComponent(sub.number)}`}
                        className={`min-w-0 break-words ${textLink}`}
                      >
                        <span>{sub.number}</span> <span className="font-normal">{sub.title}</span>
                      </Link>
                    ) : (
                      <span className="min-w-0 break-words">
                        <span className="font-semibold">{sub.number}</span> {sub.title}
                      </span>
                    )}
                    <span className={`rounded-full px-3 py-0.5 text-sm font-semibold ${statusColors[sub.status]}`}>
                      {sub.status}
                    </span>
                    {sub.completed && (
                      <span className="rounded-full bg-accent px-3 py-0.5 text-sm font-semibold text-accent-contrast">
                        <span aria-hidden="true">✓ </span>
                        {completedBadge}
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
