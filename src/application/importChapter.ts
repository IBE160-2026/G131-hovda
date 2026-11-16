// Brukstilfellet for import av ett kapittel fra en notatfil (FR-8 uten KI).
// Eneste sted som skriver kapitler og delkapitler.
import type { ChapterChange, ChapterInput, SubchapterChange } from "@/domain/chapter";
import { normalizeCourseCode } from "@/domain/course";
import { checkNotesFileTarget, parseNotesFile } from "@/domain/notesFile";
import type { DataSource, SaveChapterReport } from "./dataSource";

export type ChapterImportTarget = { courseCode: string; chapterNumber: number };

export type PreparedImport = { status: "ok"; chapter: ChapterInput } | { status: "invalid"; errors: string[] };

export type ImportChapterResult =
  | { status: "ok"; chapter: ChapterInput; report: SaveChapterReport }
  | { status: "invalid"; errors: string[] }
  | { status: "courseNotFound"; courseCode: string }
  | { status: "unavailable" };

export const importMessages = {
  courseNotFound: (code: string) => `Fant ikke emnet ${code}. Opprett det i appen først.`,
  unavailable: "Fikk ikke kontakt med databasen. Prøv igjen senere.",
  allUnchanged: "Alt er uendret.",
} as const;

/**
 * Tolker og validerer hele notatfilen uten å skrive noe. Brukes også før bekreftelsen mot prod,
 * så feil i filen vises før eieren blir spurt.
 */
export function prepareChapterImport(text: string, target: ChapterImportTarget): PreparedImport {
  const parsed = parseNotesFile(text);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };
  const errors = checkNotesFileTarget(parsed.value, target);
  if (errors.length > 0) return { status: "invalid", errors };
  return { status: "ok", chapter: parsed.value.chapter };
}

/**
 * Validerer hele filen, finner emnet og lagrer kapittelet idempotent. Ved feil i filen eller
 * manglende emne skrives ingenting.
 */
export async function importChapter(
  data: DataSource,
  text: string,
  target: ChapterImportTarget,
): Promise<ImportChapterResult> {
  const prepared = prepareChapterImport(text, target);
  if (prepared.status === "invalid") return prepared;

  const courseCode = normalizeCourseCode(target.courseCode);
  const courses = await data.listCourses();
  if (courses.status !== "ok") return { status: "unavailable" };
  const course = courses.value.find((c) => normalizeCourseCode(c.code) === courseCode);
  if (!course) return { status: "courseNotFound", courseCode };

  const saved = await data.saveChapter(course.id, prepared.chapter);
  if (saved.status !== "ok") return { status: "unavailable" };
  return { status: "ok", chapter: prepared.chapter, report: saved.value };
}

const changeLabel: Record<ChapterChange | SubchapterChange, string> = {
  created: "opprettet",
  updated: "oppdatert",
  unchanged: "uendret",
  removed: "fjernet",
  restored: "gjenopprettet",
};

/** Norsk sammendrag av importen, én linje per kapittel og delkapittel. */
export function describeImport(chapter: ChapterInput, report: SaveChapterReport): string[] {
  const titles = new Map(chapter.subchapters.map((s) => [s.number, s.title]));
  const lines = [`Kapittel ${chapter.number} ${chapter.title}: ${changeLabel[report.chapter]}`];
  for (const sub of report.subchapters) {
    const title = titles.get(sub.number);
    lines.push(`  ${sub.number}${title ? ` ${title}` : ""}: ${changeLabel[sub.change]}`);
  }
  const allUnchanged =
    report.chapter === "unchanged" && report.subchapters.every((s) => s.change === "unchanged");
  if (allUnchanged) lines.push(importMessages.allUnchanged);
  return lines;
}
