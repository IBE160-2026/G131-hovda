import type { ChapterOverview } from "@/application/chapterOverview";
import type { ReadResult } from "@/application/dataSource";
import { courseProgress } from "@/domain/progress";
import { goalReachedMessage, progressText, remainingText } from "../(innlogget)/emner/formState";

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
