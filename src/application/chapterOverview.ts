// Kapittellisten med status og lesesiden for sammendraget (FR-11, NFR-3). Leser bare, skriver ingenting.
import { hasNotes } from "@/domain/hasNotes";
import { subchapterStatus, type SubchapterStatus } from "@/domain/summary";
import type { Chapter, DataSource, ReadResult, Subchapter, SummaryVersion, Unavailable } from "./dataSource";
import { subchapterInputHash } from "./summaryHash";

export type SubchapterOverview = Subchapter & { status: SubchapterStatus };

export type ChapterOverview = Omit<Chapter, "subchapters"> & { subchapters: SubchapterOverview[] };

/**
 * Hashen regnes med samme funksjon som importen, så «utdatert» betyr det samme her som i
 * importutskriften. Uten notater trengs ingen hash.
 */
async function statusOf(chapter: Chapter, sub: Subchapter, latestReady: SummaryVersion | null) {
  const notes = hasNotes(sub.noteText);
  return subchapterStatus({
    hasNotes: notes,
    readyInputHash: latestReady?.inputHash ?? null,
    currentInputHash: notes ? await subchapterInputHash(chapter, sub.noteText) : "",
  });
}

/** Kapitlene i emnet med status per delkapittel. Henter alle sammendragsversjonene med ett kall. */
export async function listChapterOverview(
  data: DataSource,
  courseId: string,
): Promise<ReadResult<ChapterOverview[]>> {
  const chapters = await data.listChapters(courseId);
  if (chapters.status !== "ok") return chapters;

  const ids = chapters.value.flatMap((c) => c.subchapters.map((s) => s.id));
  const summaries = await data.listSummaryVersions(ids);
  if (summaries.status !== "ok") return summaries;
  const readyById = new Map(summaries.value.map((s) => [s.subchapterId, s.latestReady]));

  const value = await Promise.all(
    chapters.value.map(async (chapter) => ({
      ...chapter,
      subchapters: await Promise.all(
        chapter.subchapters.map(async (sub) => ({
          ...sub,
          status: await statusOf(chapter, sub, readyById.get(sub.id) ?? null),
        })),
      ),
    })),
  );
  return { status: "ok", value };
}

export type SubchapterSummaryResult =
  | {
      status: "ok";
      chapter: Chapter;
      subchapter: Subchapter;
      summaryStatus: SubchapterStatus;
      /** Siste klare versjon, eller `null` når det ikke finnes noen. */
      summary: SummaryVersion | null;
    }
  | { status: "notFound" }
  | Unavailable;

/**
 * Delkapittelet med nummeret «n.m» i emnet, med kapittelet, status og siste klare versjon av
 * sammendraget. `notFound` når emnet eller nummeret ikke finnes, eller ikke er eierens.
 */
export async function getSubchapterSummary(
  data: DataSource,
  courseId: string,
  number: string,
): Promise<SubchapterSummaryResult> {
  const chapters = await data.listChapters(courseId);
  if (chapters.status !== "ok") return chapters;

  for (const chapter of chapters.value) {
    const subchapter = chapter.subchapters.find((s) => s.number === number);
    if (!subchapter) continue;
    const summaries = await data.listSummaryVersions([subchapter.id]);
    if (summaries.status !== "ok") return summaries;
    const summary = summaries.value.find((s) => s.subchapterId === subchapter.id)?.latestReady ?? null;
    return {
      status: "ok",
      chapter,
      subchapter,
      summaryStatus: await statusOf(chapter, subchapter, summary),
      summary,
    };
  }
  return { status: "notFound" };
}
