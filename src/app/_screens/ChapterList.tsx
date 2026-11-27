import Link from "next/link";
import type { ChapterOverview } from "@/application/chapterOverview";
import type { ReadResult } from "@/application/dataSource";
import type { SubchapterStatus } from "@/domain/summary";
import { completedBadge } from "../(innlogget)/emner/formState";
import { textLink } from "../(innlogget)/emner/styles";
import { UnavailableMessage } from "./UnavailableMessage";

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

/** «29 gjennomgangsspørsmål», «1 gjennomgangsspørsmål», eller `null` når kapittelet ikke har noen. */
export function reviewQuestionLabel(count: number): string | null {
  return count > 0 ? `${count} gjennomgangsspørsmål` : null;
}

/**
 * Kapitlene i emnet med delkapitler i rekkefølge og samlet status for sammendraget og
 * spørsmålsbanken. Delkapitler med et sammendrag lenker til lesesiden på `subchapterHref(nummer)`.
 * Gjennomførte delkapitler har merket «gjennomført» ved siden av statusen. Under kapitteltittelen
 * står antallet aktive gjennomgangsspørsmål, og ingenting når kapittelet ikke har noen.
 */
export function ChapterList({
  chapters,
  subchapterHref,
}: {
  chapters: ReadResult<ChapterOverview[]>;
  subchapterHref: (number: string) => string;
}) {
  return (
    <section aria-labelledby="kapitler" className="mt-4 flex flex-col gap-4">
      <h2 id="kapitler" className="text-2xl font-bold">
        Kapitler
      </h2>
      {chapters.status !== "ok" ? (
        <UnavailableMessage />
      ) : chapters.value.length === 0 ? (
        <p className="max-w-prose text-muted">Ingen kapitler er importert ennå.</p>
      ) : (
        <ol className="flex flex-col gap-6">
          {chapters.value.map((chapter) => {
            const reviewLabel = reviewQuestionLabel(chapter.reviewQuestionCount);
            return (
              <li key={chapter.id} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-semibold break-words">
                    Kapittel {chapter.number}: {chapter.title}
                  </h3>
                  {reviewLabel && <p className="text-muted">{reviewLabel}</p>}
                </div>
                <ol className="flex flex-col gap-2">
                  {chapter.subchapters.map((sub) => (
                    <li
                      key={sub.id}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-sky px-4 py-3"
                    >
                      {canRead(sub.summaryStatus) ? (
                        <Link href={subchapterHref(sub.number)} className={`min-w-0 break-words ${textLink}`}>
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
            );
          })}
        </ol>
      )}
    </section>
  );
}
