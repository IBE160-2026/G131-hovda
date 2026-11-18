// Brukstilfellet for import av ett kapittel fra en notatfil (FR-8), med KI-sammendrag (FR-11).
// Eneste sted som skriver kapitler, delkapitler og sammendragsversjoner.
import type { ChapterChange, ChapterInput, SubchapterChange } from "@/domain/chapter";
import { normalizeCourseCode } from "@/domain/course";
import { hasNotes } from "@/domain/hasNotes";
import { checkNotesFileTarget, parseNotesFile } from "@/domain/notesFile";
import { validateSummaryText } from "@/domain/summary";
import type { AiProvider, SummaryInput, SummaryResult } from "./aiProvider";
import type { Course, DataSource, NewSummaryVersion, SaveChapterReport } from "./dataSource";
import { summaryInputHash } from "./summaryHash";

export type ChapterImportTarget = { courseCode: string; chapterNumber: number };

export type ImportOptions = {
  /** Uten KI lagres bare kapitlene, og det lages ingen sammendrag. */
  ai?: AiProvider | null;
  /** «n.m»: lager sammendraget for dette delkapittelet på nytt selv om hashen er uendret. */
  force?: string;
};

/** Hva som skjedde med sammendraget for ett aktivt delkapittel. */
export type SummaryOutcome =
  | { number: string; status: "created" }
  | { number: string; status: "unchanged" }
  | { number: string; status: "failed"; reason: string }
  | { number: string; status: "noNotes" };

export type PreparedImport = { status: "ok"; chapter: ChapterInput } | { status: "invalid"; errors: string[] };

export type ImportChapterResult =
  | {
      status: "ok";
      chapter: ChapterInput;
      report: SaveChapterReport;
      /** `null` når importen kjørte uten KI. */
      summaries: SummaryOutcome[] | null;
    }
  | { status: "invalid"; errors: string[] }
  | { status: "courseNotFound"; courseCode: string }
  | { status: "unavailable" };

export const importMessages = {
  courseNotFound: (code: string) => `Fant ikke emnet ${code}. Opprett det i appen først.`,
  unavailable: "Fikk ikke kontakt med databasen. Prøv igjen senere.",
  allUnchanged: "Alt er uendret.",
  forceNotFound: (number: string) =>
    `--force ${number}: delkapittelet finnes ikke i notatfilen. Ingenting er skrevet.`,
  forceNoNotes: (number: string) => `--force ${number}: delkapittelet har ingen notater. Ingenting er skrevet.`,
  summaryNotSaved: "Fikk ikke lagret sammendraget i databasen.",
  summariesFailed: "Ett eller flere sammendrag feilet. Kjør importen på nytt for å prøve igjen.",
  summaryUnexpected: "KI-kallet stoppet med en uventet feil.",
} as const;

/**
 * Tolker og validerer hele notatfilen uten å skrive noe. Brukes også før bekreftelsen mot prod,
 * så feil i filen vises før eieren blir spurt. `force` må være et delkapittel i filen.
 */
export function prepareChapterImport(text: string, target: ChapterImportTarget, force?: string): PreparedImport {
  const parsed = parseNotesFile(text);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };
  const errors = checkNotesFileTarget(parsed.value, target);
  if (errors.length > 0) return { status: "invalid", errors };
  const chapter = parsed.value.chapter;
  if (force !== undefined) {
    const forced = chapter.subchapters.find((s) => s.number === force);
    if (!forced) return { status: "invalid", errors: [importMessages.forceNotFound(force)] };
    if (!hasNotes(forced.noteText)) return { status: "invalid", errors: [importMessages.forceNoNotes(force)] };
  }
  return { status: "ok", chapter };
}

/**
 * Validerer hele filen, finner emnet og lagrer kapittelet idempotent. Ved feil i filen eller
 * manglende emne skrives ingenting. Med KI lages deretter sammendrag for aktive delkapitler med
 * notater, ett om gangen. Et feilet sammendrag stopper ikke importen.
 */
export async function importChapter(
  data: DataSource,
  text: string,
  target: ChapterImportTarget,
  options: ImportOptions = {},
): Promise<ImportChapterResult> {
  const prepared = prepareChapterImport(text, target, options.force);
  if (prepared.status === "invalid") return prepared;

  const courseCode = normalizeCourseCode(target.courseCode);
  const courses = await data.listCourses();
  if (courses.status !== "ok") return { status: "unavailable" };
  const course = courses.value.find((c) => normalizeCourseCode(c.code) === courseCode);
  if (!course) return { status: "courseNotFound", courseCode };

  const saved = await data.saveChapter(course.id, prepared.chapter);
  if (saved.status !== "ok") return { status: "unavailable" };

  const summaries = options.ai
    ? await createSummaries(data, options.ai, course, prepared.chapter, options.force)
    : null;
  return { status: "ok", chapter: prepared.chapter, report: saved.value, summaries };
}

/** Når kapitlene eller versjonene ikke kan leses, feiler alle delkapitler med notater. */
function allUnavailable(chapter: ChapterInput): SummaryOutcome[] {
  return chapter.subchapters.map((s) =>
    hasNotes(s.noteText)
      ? { number: s.number, status: "failed", reason: importMessages.unavailable }
      : { number: s.number, status: "noNotes" },
  );
}

async function createSummaries(
  data: DataSource,
  ai: AiProvider,
  course: Course,
  input: ChapterInput,
  force: string | undefined,
): Promise<SummaryOutcome[]> {
  const listed = await data.listChapters(course.id);
  if (listed.status !== "ok") return allUnavailable(input);
  const chapter = listed.value.find((c) => c.number === input.number);
  if (!chapter) return allUnavailable(input);

  // Bare aktive delkapitler er med i listChapters, så fjernede får aldri KI-kall.
  const withNotes = chapter.subchapters.filter((s) => hasNotes(s.noteText));
  const versions = await data.listSummaryVersions(withNotes.map((s) => s.id));
  if (versions.status !== "ok") return allUnavailable(input);
  const latestById = new Map(versions.value.map((v) => [v.subchapterId, v.latest]));

  const outcomes: SummaryOutcome[] = [];
  for (const sub of chapter.subchapters) {
    if (!hasNotes(sub.noteText)) {
      outcomes.push({ number: sub.number, status: "noNotes" });
      continue;
    }

    const inputHash = await summaryInputHash({
      noteText: sub.noteText,
      learningGoals: chapter.learningGoals,
      keyConcepts: chapter.keyConcepts,
      promptVersion: ai.summaryPromptVersion,
    });
    const latest = latestById.get(sub.id) ?? null;
    // En feilet siste versjon prøves på nytt selv med samme hash (AD-8).
    if (force !== sub.number && latest?.status === "klart" && latest.inputHash === inputHash) {
      outcomes.push({ number: sub.number, status: "unchanged" });
      continue;
    }

    const result = await summarizeSafely(ai, {
      courseCode: course.code,
      courseName: course.name,
      learningOutcomes: course.learningOutcomes,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      learningGoals: chapter.learningGoals,
      keyConcepts: chapter.keyConcepts,
      subchapterNumber: sub.number,
      subchapterTitle: sub.title,
      noteText: sub.noteText,
    });
    const version = toNewVersion(sub.id, inputHash, result);
    const stored = await data.addSummaryVersion(version);
    if (stored.status !== "ok") {
      outcomes.push({ number: sub.number, status: "failed", reason: importMessages.summaryNotSaved });
    } else if (version.status === "feilet") {
      outcomes.push({ number: sub.number, status: "failed", reason: version.error });
    } else {
      outcomes.push({ number: sub.number, status: "created" });
    }
  }
  return outcomes;
}

async function summarizeSafely(ai: AiProvider, input: SummaryInput): Promise<SummaryResult> {
  try {
    return await ai.summarize(input);
  } catch {
    return {
      status: "failed",
      reason: importMessages.summaryUnexpected,
      modelId: "ukjent",
      promptVersion: ai.summaryPromptVersion,
    };
  }
}

/** Svaret valideres før lagring: tomt eller over 600 ord gir en feilet versjon. */
function toNewVersion(subchapterId: string, inputHash: string, result: SummaryResult): NewSummaryVersion {
  const base = { subchapterId, inputHash, modelId: result.modelId, promptVersion: result.promptVersion };
  if (result.status === "failed") return { ...base, status: "feilet", error: result.reason };
  const valid = validateSummaryText(result.text);
  if (!valid.ok) return { ...base, status: "feilet", error: valid.reason };
  return { ...base, status: "klart", text: valid.text };
}

/** Om et sammendrag feilet, så kommandoen kan avslutte med kode 1. */
export function anySummaryFailed(summaries: SummaryOutcome[] | null): boolean {
  return (summaries ?? []).some((s) => s.status === "failed");
}

/** Kode 1 når AWS-nøklene mangler eller et sammendrag feilet, ellers 0. */
export function importExitCode(aiAvailable: boolean, summaries: SummaryOutcome[] | null): 0 | 1 {
  return !aiAvailable || anySummaryFailed(summaries) ? 1 : 0;
}

const changeLabel: Record<ChapterChange | SubchapterChange, string> = {
  created: "opprettet",
  updated: "oppdatert",
  unchanged: "uendret",
  removed: "fjernet",
  restored: "gjenopprettet",
};

function summaryLabel(outcome: SummaryOutcome): string {
  switch (outcome.status) {
    case "created":
      return "sammendrag laget";
    case "unchanged":
      return "sammendrag uendret";
    case "failed":
      return `sammendrag feilet: ${outcome.reason}`;
    case "noNotes":
      return "mangler notater";
  }
}

/**
 * Norsk sammendrag av importen, én linje per kapittel og delkapittel. Med KI står det på hver
 * linje også hva som skjedde med sammendraget.
 */
export function describeImport(
  chapter: ChapterInput,
  report: SaveChapterReport,
  summaries: SummaryOutcome[] | null = null,
): string[] {
  const titles = new Map(chapter.subchapters.map((s) => [s.number, s.title]));
  const outcomes = new Map((summaries ?? []).map((s) => [s.number, s]));
  const lines = [`Kapittel ${chapter.number} ${chapter.title}: ${changeLabel[report.chapter]}`];
  for (const sub of report.subchapters) {
    const title = titles.get(sub.number);
    const outcome = outcomes.get(sub.number);
    const summary = outcome ? `, ${summaryLabel(outcome)}` : "";
    lines.push(`  ${sub.number}${title ? ` ${title}` : ""}: ${changeLabel[sub.change]}${summary}`);
  }
  const allUnchanged =
    report.chapter === "unchanged" &&
    report.subchapters.every((s) => s.change === "unchanged") &&
    (summaries ?? []).every((s) => s.status === "unchanged" || s.status === "noNotes");
  if (allUnchanged) lines.push(importMessages.allUnchanged);
  return lines;
}

export type ImportReport = { stdout: string[]; stderr: string[]; code: 0 | 1 };

/**
 * Det kommandoen skriver ut etter en vellykket lagring, og koden den avslutter med. `aiError` er
 * meldingen om manglende AWS-nøkler, eller `null` når KI var tilgjengelig.
 */
export function reportImport(
  result: Extract<ImportChapterResult, { status: "ok" }>,
  aiError: string | null,
): ImportReport {
  const stderr: string[] = [];
  if (aiError !== null) stderr.push(aiError);
  if (anySummaryFailed(result.summaries)) stderr.push(importMessages.summariesFailed);
  return {
    stdout: describeImport(result.chapter, result.report, result.summaries),
    stderr,
    code: importExitCode(aiError === null, result.summaries),
  };
}

