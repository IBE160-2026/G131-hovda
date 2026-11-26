import Link from "next/link";
import type { ChapterOverview } from "@/application/chapterOverview";
import type { ReadResult, StudyPlan } from "@/application/dataSource";
import { hasNotes } from "@/domain/hasNotes";
import { dailySuggestion } from "@/domain/studyPlan";
import {
  completedBadge,
  dailySuggestionHeading,
  flexibleDayMessage,
  nothingReadyMessage,
  reviewText,
  sessionDoneMessage,
  startSessionLabel,
  suggestionText,
} from "../(innlogget)/emner/formState";
import { primaryButton, textLink } from "../(innlogget)/emner/styles";

/**
 * Dagens forslag øverst på startsiden (FR-10 del 2, UX-1, UX-2): hva eieren skal gjøre i kveld, med
 * «Start økta» til lesesiden for det første delkapittelet. Avkrysninger fra i dag endrer ikke forslaget før midnatt (AD-15).
 * Et foreslått delkapittel som er gjennomført i dag, merkes, og knappen går til det neste. Vises ikke
 * uten plan, eller når delkapitlene ikke kan leses.
 */
export function DailySuggestion({
  chapters,
  plan,
  today,
  subchapterHref,
}: {
  chapters: ReadResult<ChapterOverview[]>;
  plan: StudyPlan | null;
  today: string;
  subchapterHref: (number: string) => string;
}) {
  if (!plan || chapters.status !== "ok") return null;
  const subchapters = chapters.value.flatMap((c) => c.subchapters);
  if (subchapters.length === 0) return null;
  const suggestion = dailySuggestion(
    plan,
    subchapters.map((s) => ({
      number: s.number,
      ready: s.status === "klart" || s.status === "utdatert",
      hasNotes: hasNotes(s.noteText),
      completedAt: s.completedAt,
    })),
    today,
  );

  let body;
  if (suggestion.kind === "flexibleDay") body = <p>{flexibleDayMessage}</p>;
  else if (suggestion.kind === "nothingReady") body = <p>{nothingReadyMessage}</p>;
  else {
    const review = suggestion.kind === "review";
    const items = suggestion.numbers.map((n) => subchapters.find((s) => s.number === n)!);
    // Ved repetisjon er alle gjennomført fra før, så ingenting merkes.
    const isDone = (s: (typeof items)[number]) => !review && s.completed;
    const next = items.find((s) => !isDone(s));
    body = (
      <>
        <p className="text-lg font-semibold">
          {review ? reviewText(suggestion.numbers) : suggestionText(suggestion.numbers)}
        </p>
        <ul className="flex flex-col gap-1">
          {items.map((s) => (
            <li key={s.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Link href={subchapterHref(s.number)} className={`min-w-0 break-words ${textLink}`}>
                <span>{s.number}</span> <span className="font-normal">{s.title}</span>
              </Link>
              {isDone(s) && (
                <span className="rounded-full bg-accent px-3 py-0.5 text-sm font-semibold text-accent-contrast">
                  <span aria-hidden="true">✓ </span>
                  {completedBadge}
                </span>
              )}
            </li>
          ))}
        </ul>
        {next ? (
          <div>
            <Link href={subchapterHref(next.number)} className={primaryButton}>
              {startSessionLabel}
            </Link>
          </div>
        ) : (
          <p className="font-semibold">{sessionDoneMessage}</p>
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="dagens-forslag" className="flex flex-col gap-3 rounded-xl bg-sky px-4 py-3 break-words">
      <h2 id="dagens-forslag" className="text-xl font-bold">
        {dailySuggestionHeading}
      </h2>
      {body}
    </section>
  );
}
