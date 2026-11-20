// Brukstilfellet for import av ett kapittel fra en notatfil (FR-8), med sammendrag fra
// innholdsfilen (FR-11). Sammendragene er laget på forhånd i Claude Code, og importen kaller aldri
// en KI-leverandør (AD-7). Eneste sted som skriver kapitler, delkapitler og sammendragsversjoner.
import type { ChapterChange, ChapterInput, SubchapterChange } from "@/domain/chapter";
import { CONTENT_INSTRUCTION_VERSION, parseContentFile, type ContentFile } from "@/domain/contentFile";
import { normalizeCourseCode } from "@/domain/course";
import { hasNotes } from "@/domain/hasNotes";
import { checkNotesFileTarget, parseNotesFile } from "@/domain/notesFile";
import type { Course, DataSource, SaveChapterReport } from "./dataSource";
import { subchapterInputHash } from "./summaryHash";

export type ChapterImportTarget = { courseCode: string; chapterNumber: number };

export type ImportOptions = {
  /** Teksten i innholdsfilen. `null` eller utelatt: filen finnes ikke, og alt mangler innhold. */
  content?: string | null;
  /** «n.m»: legger inn sammendraget for dette delkapittelet på nytt selv om det er uendret. */
  force?: string;
};

/** Hva som skjedde med sammendraget for ett aktivt delkapittel. */
export type SummaryOutcome =
  | { number: string; status: "created" }
  | { number: string; status: "unchanged" }
  | { number: string; status: "outdated" }
  | { number: string; status: "missing" }
  | { number: string; status: "failed"; reason: string }
  | { number: string; status: "noNotes" };

/** `file` sier om feilene er i notatfilen eller innholdsfilen. */
export type InvalidImport = { status: "invalid"; file: "notes" | "content"; errors: string[] };

export type PreparedImport = { status: "ok"; chapter: ChapterInput; content: ContentFile | null } | InvalidImport;

export type ImportChapterResult =
  | { status: "ok"; chapter: ChapterInput; report: SaveChapterReport; summaries: SummaryOutcome[] }
  | InvalidImport
  | { status: "courseNotFound"; courseCode: string }
  | { status: "unavailable" };

export const importMessages = {
  courseNotFound: (code: string) => `Fant ikke emnet ${code}. Opprett det i appen først.`,
  unavailable: "Fikk ikke kontakt med databasen. Prøv igjen senere.",
  allUnchanged: "Alt er uendret.",
  forceNotFound: (number: string) =>
    `--force ${number}: delkapittelet finnes ikke i notatfilen. Ingenting er skrevet.`,
  forceNoNotes: (number: string) => `--force ${number}: delkapittelet har ingen notater. Ingenting er skrevet.`,
  forceNoContent: (number: string) =>
    `--force ${number}: delkapittelet har ikke sammendrag i innholdsfilen. Ingenting er skrevet.`,
  summaryNotSaved: "Fikk ikke lagret sammendraget i databasen.",
  summariesFailed: "Ett eller flere sammendrag ble ikke lagret. Kjør importen på nytt for å prøve igjen.",
  summariesOutdated:
    "Ett eller flere sammendrag er utdatert, fordi notatet, læringsmålene, nøkkelbegrepene eller instruksjonen er endret. " +
    "Lag dem på nytt etter instruksjonen, hent ny hash med `npm run innhold:hash` og kjør importen igjen.",
} as const;

/**
 * Tolker og validerer hele notatfilen og innholdsfilen uten å skrive noe. Brukes også før
 * bekreftelsen mot prod, så feil i filene vises før eieren blir spurt. `force` må være et
 * delkapittel med notater og med sammendrag i innholdsfilen.
 */
export function prepareChapterImport(
  text: string,
  target: ChapterImportTarget,
  options: ImportOptions = {},
): PreparedImport {
  const parsed = parseNotesFile(text);
  if (!parsed.ok) return { status: "invalid", file: "notes", errors: parsed.errors };
  const targetErrors = checkNotesFileTarget(parsed.value, target);
  if (targetErrors.length > 0) return { status: "invalid", file: "notes", errors: targetErrors };
  const chapter = parsed.value.chapter;
  const { force } = options;
  if (force !== undefined) {
    const forced = chapter.subchapters.find((s) => s.number === force);
    if (!forced) return { status: "invalid", file: "notes", errors: [importMessages.forceNotFound(force)] };
    if (!hasNotes(forced.noteText)) {
      return { status: "invalid", file: "notes", errors: [importMessages.forceNoNotes(force)] };
    }
  }

  let content: ContentFile | null = null;
  if (options.content != null) {
    const read = parseContentFile(options.content, chapter, target);
    if (!read.ok) return { status: "invalid", file: "content", errors: read.errors };
    content = read.value;
  }
  if (force !== undefined && !content?.summaries.some((s) => s.number === force)) {
    return { status: "invalid", file: "content", errors: [importMessages.forceNoContent(force)] };
  }
  return { status: "ok", chapter, content };
}

/**
 * Validerer begge filene, finner emnet og lagrer kapittelet idempotent. Ved feil i en av filene
 * eller manglende emne skrives ingenting. Deretter legges sammendragene fra innholdsfilen inn for
 * aktive delkapitler med notater. Et utdatert sammendrag lagres ikke.
 */
export async function importChapter(
  data: DataSource,
  text: string,
  target: ChapterImportTarget,
  options: ImportOptions = {},
): Promise<ImportChapterResult> {
  const prepared = prepareChapterImport(text, target, options);
  if (prepared.status === "invalid") return prepared;

  const courseCode = normalizeCourseCode(target.courseCode);
  const courses = await data.listCourses();
  if (courses.status !== "ok") return { status: "unavailable" };
  const course = courses.value.find((c) => normalizeCourseCode(c.code) === courseCode);
  if (!course) return { status: "courseNotFound", courseCode };

  const saved = await data.saveChapter(course.id, prepared.chapter);
  if (saved.status !== "ok") return { status: "unavailable" };

  const summaries = await createSummaries(data, course, prepared.chapter, prepared.content, options.force);
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
  course: Course,
  input: ChapterInput,
  content: ContentFile | null,
  force: string | undefined,
): Promise<SummaryOutcome[]> {
  const listed = await data.listChapters(course.id);
  if (listed.status !== "ok") return allUnavailable(input);
  const chapter = listed.value.find((c) => c.number === input.number);
  if (!chapter) return allUnavailable(input);

  // Bare aktive delkapitler er med i listChapters, så fjernede får aldri nye versjoner.
  const withNotes = chapter.subchapters.filter((s) => hasNotes(s.noteText));
  const versions = await data.listSummaryVersions(withNotes.map((s) => s.id));
  if (versions.status !== "ok") return allUnavailable(input);
  const readyById = new Map(versions.value.map((v) => [v.subchapterId, v.latestReady]));
  const fromFile = new Map((content?.summaries ?? []).map((s) => [s.number, s]));
  const notesByNumber = new Map(input.subchapters.map((s) => [s.number, s.noteText]));
  // En annen instruksjon enn den importen kjenner gjør alt innholdet utdatert.
  const knownInstruction = content?.instruction === CONTENT_INSTRUCTION_VERSION;

  const outcomes: SummaryOutcome[] = [];
  for (const sub of chapter.subchapters) {
    if (!hasNotes(sub.noteText)) {
      outcomes.push({ number: sub.number, status: "noNotes" });
      continue;
    }
    const summary = fromFile.get(sub.number);
    if (!content || !summary) {
      outcomes.push({ number: sub.number, status: "missing" });
      continue;
    }
    // Hashen regnes fra filen, som i `npm run innhold:hash`.
    const inputHash = await subchapterInputHash(input, notesByNumber.get(sub.number) ?? sub.noteText);
    if (!knownInstruction || summary.inputHash !== inputHash) {
      outcomes.push({ number: sub.number, status: "outdated" });
      continue;
    }
    const ready = readyById.get(sub.id) ?? null;
    if (force !== sub.number && ready?.inputHash === inputHash && ready.text === summary.text) {
      outcomes.push({ number: sub.number, status: "unchanged" });
      continue;
    }
    const stored = await data.addSummaryVersion({
      subchapterId: sub.id,
      status: "klart",
      text: summary.text,
      inputHash,
      modelId: content.model,
      promptVersion: content.instruction,
    });
    outcomes.push(
      stored.status === "ok"
        ? { number: sub.number, status: "created" }
        : { number: sub.number, status: "failed", reason: importMessages.summaryNotSaved },
    );
  }
  return outcomes;
}

/** Kode 1 når et sammendrag er utdatert eller ikke ble lagret, ellers 0. «Mangler innhold» gir 0. */
export function importExitCode(summaries: SummaryOutcome[]): 0 | 1 {
  return summaries.some((s) => s.status === "failed" || s.status === "outdated") ? 1 : 0;
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
      return "sammendrag lagt inn";
    case "unchanged":
      return "sammendrag uendret";
    case "outdated":
      return "sammendrag utdatert";
    case "missing":
      return "mangler innhold";
    case "failed":
      return `sammendrag feilet: ${outcome.reason}`;
    case "noNotes":
      return "mangler notater";
  }
}

/**
 * Norsk sammendrag av importen, én linje per kapittel og delkapittel. Linjen for et aktivt
 * delkapittel sier også hva som skjedde med sammendraget.
 */
export function describeImport(
  chapter: ChapterInput,
  report: SaveChapterReport,
  summaries: SummaryOutcome[] = [],
): string[] {
  const titles = new Map(chapter.subchapters.map((s) => [s.number, s.title]));
  const outcomes = new Map(summaries.map((s) => [s.number, s]));
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
    summaries.every((s) => s.status === "unchanged" || s.status === "missing" || s.status === "noNotes");
  if (allUnchanged) lines.push(importMessages.allUnchanged);
  return lines;
}

export type ImportReport = { stdout: string[]; stderr: string[]; code: 0 | 1 };

/** Det kommandoen skriver ut etter en vellykket lagring, og koden den avslutter med. */
export function reportImport(result: Extract<ImportChapterResult, { status: "ok" }>): ImportReport {
  const stderr: string[] = [];
  if (result.summaries.some((s) => s.status === "outdated")) stderr.push(importMessages.summariesOutdated);
  if (result.summaries.some((s) => s.status === "failed")) stderr.push(importMessages.summariesFailed);
  return {
    stdout: describeImport(result.chapter, result.report, result.summaries),
    stderr,
    code: importExitCode(result.summaries),
  };
}
