// Kapittellisten med status og lesesiden for sammendraget (FR-11, NFR-3, AD-8). Leser bare, skriver ingenting.
import { hasNotes } from "@/domain/hasNotes";
import { subchapterStatus, type SubchapterStatus } from "@/domain/summary";
import type { Chapter, DataSource, ReadResult, Subchapter, SummaryVersion, Unavailable } from "./dataSource";
import { subchapterInputHash } from "./summaryHash";

/**
 * `status` gjelder både sammendraget og spørsmålsbanken. `summaryStatus` gjelder bare sammendraget
 * og avgjør om delkapittelet lenker til lesesiden.
 */
export type SubchapterOverview = Subchapter & { status: SubchapterStatus; summaryStatus: SubchapterStatus };

export type ChapterOverview = Omit<Chapter, "subchapters"> & { subchapters: SubchapterOverview[] };

/**
 * Hashen regnes med samme funksjon som importen, så «utdatert» betyr det samme her som i
 * importutskriften. Uten notater trengs ingen hash. `readyInputHashes` har én hash per innholdstype.
 */
async function statusOf(chapter: Chapter, sub: Subchapter, readyInputHashes: (string | null)[]) {
  const notes = hasNotes(sub.noteText);
  return subchapterStatus({
    hasNotes: notes,
    readyInputHashes,
    currentInputHash: notes ? await subchapterInputHash(chapter, sub.noteText) : "",
  });
}

/**
 * Kapitlene i emnet med status per delkapittel. Klart betyr at både sammendraget og
 * spørsmålsbanken har en klar versjon med hashen notatet har nå (AD-8). Henter alle
 * sammendragsversjonene med ett kall og alle bankversjonene med ett.
 */
export async function listChapterOverview(
  data: DataSource,
  courseId: string,
): Promise<ReadResult<ChapterOverview[]>> {
  const chapters = await data.listChapters(courseId);
  if (chapters.status !== "ok") return chapters;

  const ids = chapters.value.flatMap((c) => c.subchapters.map((s) => s.id));
  const [summaries, banks] = await Promise.all([data.listSummaryVersions(ids), data.listQuestionBanks(ids)]);
  if (summaries.status !== "ok") return summaries;
  if (banks.status !== "ok") return banks;
  const summaryById = new Map(summaries.value.map((s) => [s.subchapterId, s.latestReady?.inputHash ?? null]));
  const bankById = new Map(banks.value.map((b) => [b.subchapterId, b.latestReady?.inputHash ?? null]));

  const value = await Promise.all(
    chapters.value.map(async (chapter) => ({
      ...chapter,
      subchapters: await Promise.all(
        chapter.subchapters.map(async (sub) => {
          const summary = summaryById.get(sub.id) ?? null;
          const [status, summaryStatus] = await Promise.all([
            statusOf(chapter, sub, [summary, bankById.get(sub.id) ?? null]),
            statusOf(chapter, sub, [summary]),
          ]);
          return { ...sub, status, summaryStatus };
        }),
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
      /**
       * Om eieren kan ta en quiz: både sammendraget og spørsmålsbanken har en klar versjon, så den
       * samlede statusen er «klart» eller «utdatert» (AD-8).
       */
      quizReady: boolean;
    }
  | { status: "notFound" }
  | Unavailable;

/**
 * Delkapittelet med nummeret «n.m» i emnet, med kapittelet, status for sammendraget, siste klare versjon av
 * sammendraget og om eieren kan ta en quiz. `notFound` når emnet eller nummeret ikke finnes, eller ikke er eierens.
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
    const [summaries, banks] = await Promise.all([
      data.listSummaryVersions([subchapter.id]),
      data.listQuestionBanks([subchapter.id]),
    ]);
    if (summaries.status !== "ok") return summaries;
    if (banks.status !== "ok") return banks;
    const summary = summaries.value.find((s) => s.subchapterId === subchapter.id)?.latestReady ?? null;
    const bank = banks.value.find((b) => b.subchapterId === subchapter.id)?.latestReady ?? null;
    const [summaryStatus, status] = await Promise.all([
      statusOf(chapter, subchapter, [summary?.inputHash ?? null]),
      statusOf(chapter, subchapter, [summary?.inputHash ?? null, bank?.inputHash ?? null]),
    ]);
    return {
      status: "ok",
      chapter,
      subchapter,
      summaryStatus,
      summary,
      quizReady: status === "klart" || status === "utdatert",
    };
  }
  return { status: "notFound" };
}
