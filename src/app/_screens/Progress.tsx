import type { ChapterOverview } from "@/application/chapterOverview";
import type { ReadResult, StudyPlan } from "@/application/dataSource";
import { hasNotes } from "@/domain/hasNotes";
import { courseProgress } from "@/domain/progress";
import { planStatus, relativeDayLabel } from "@/domain/studyPlan";
import {
  aheadText,
  behindText,
  catchUpText,
  goalReachedMessage,
  onTrackMessage,
  progressText,
  remainingText,
} from "../(innlogget)/emner/formState";

/**
 * Framdriften mot målet øverst i emnekortet (FR-15, FR-20): gjennomførte av de aktive
 * delkapitlene, målet på 90 % og hvor mange som er igjen. «Gjennomført» kommer fra avkrysningen.
 * Med en studieplan og dagens dato (`today`, `ÅÅÅÅ-MM-DD`) vises også om eieren er i rute, foran
 * eller bak, og veien tilbake ved etterslep (FR-9, UX-3). Vises ikke uten delkapitler, eller når de
 * ikke kan leses (kapittellisten sier da fra).
 */
export function Progress({
  chapters,
  plan,
  today,
}: {
  chapters: ReadResult<ChapterOverview[]>;
  plan?: StudyPlan | null;
  today?: string;
}) {
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
      {plan && today && (
        <PlanLine
          plan={plan}
          today={today}
          completed={completed}
          reachable={subchapters.filter((s) => s.completed || hasNotes(s.noteText)).length}
        />
      )}
    </section>
  );
}

/** I rute, foran eller bak. Etterslepet står i en egen, varm boks med veien tilbake. */
function PlanLine({
  plan,
  today,
  completed,
  reachable,
}: {
  plan: StudyPlan;
  today: string;
  completed: number;
  reachable: number;
}) {
  const status = planStatus(plan, { completed, reachable }, today);
  if (status.kind === "onTrack") return <p className="font-semibold">{onTrackMessage}</p>;
  if (status.kind === "ahead") return <p className="font-semibold">{aheadText(status.lead)}</p>;
  const label = status.onTrackOn ? relativeDayLabel(status.onTrackOn, today) : null;
  // Aldri flere enn det som kan gjøres: delkapitler uten notater kan ikke tas.
  const perDay = Math.min(status.perDay, reachable - completed);
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-sun px-3 py-2 break-words">
      <p className="font-semibold">{behindText(status.backlog)}</p>
      <p>{catchUpText(perDay, label)}</p>
    </div>
  );
}
