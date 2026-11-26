import type { SubchapterOverview } from "@/application/chapterOverview";
import type { StudyPlan } from "@/application/dataSource";
import { hasNotes } from "@/domain/hasNotes";
import { type DailySuggestion, type SuggestionCandidate, dailySuggestion } from "@/domain/studyPlan";

/** Delkapitlene slik dagens forslag trenger dem. «Klart» er samlet status «klart» eller «utdatert». */
export function suggestionCandidates(subchapters: readonly SubchapterOverview[]): SuggestionCandidate[] {
  return subchapters.map((s) => ({
    number: s.number,
    ready: s.status === "klart" || s.status === "utdatert",
    hasNotes: hasNotes(s.noteText),
    completedAt: s.completedAt,
  }));
}

/**
 * Dagens forslag for delkapitlene på siden. Både forslaget og framdriften bruker denne, så de regner
 * forslaget likt, med samme inndata.
 */
export function todaysSuggestion(
  plan: StudyPlan,
  subchapters: readonly SubchapterOverview[],
  today: string,
): DailySuggestion {
  return dailySuggestion(plan, suggestionCandidates(subchapters), today);
}
