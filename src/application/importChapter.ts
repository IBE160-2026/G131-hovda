// Brukstilfellet for import av ett kapittel fra en notatfil (FR-8), med sammendrag (FR-11) og
// spørsmålsbanker (FR-13) fra innholdsfilen. Innholdet er laget på forhånd i Claude Code, og importen
// kaller aldri en KI-leverandør (AD-7). Eneste sted som skriver kapitler, delkapitler,
// sammendragsversjoner og spørsmålsbanker.
import type { ChapterChange, ChapterInput, SubchapterChange } from "@/domain/chapter";
import { CONTENT_INSTRUCTION_VERSION, parseContentFile, type ContentFile } from "@/domain/contentFile";
import { normalizeCourseCode } from "@/domain/course";
import { hasNotes } from "@/domain/hasNotes";
import { checkNotesFileTarget, parseNotesFile } from "@/domain/notesFile";
import type { OwnQuestions } from "@/domain/questionBank";
import type { Chapter, Course, DataSource, SaveChapterReport } from "./dataSource";
import { questionBankContentHash, subchapterInputHash } from "./summaryHash";

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

/**
 * Hva som skjedde med spørsmålsbanken for ett aktivt delkapittel. `changed`: en klar bank finnes, og
 * filen har en annen. Erstatning og påfylling kommer i 1.6b, så ingenting skrives.
 */
export type QuestionBankOutcome = SummaryOutcome | { number: string; status: "changed" };

/** Et spørsmål som er meldt som feil, med delkapittelets nummer, så det kan rettes i innholdsfila. */
export type ReportedQuestion = { number: string; question: string; theme: string; comment: string | null };

/** `file` sier om feilene er i notatfilen eller innholdsfilen. */
export type InvalidImport = { status: "invalid"; file: "notes" | "content"; errors: string[] };

export type PreparedImport =
  | { status: "ok"; chapter: ChapterInput; content: ContentFile | null; ownQuestions: OwnQuestions }
  | InvalidImport;

export type ImportChapterResult =
  | {
      status: "ok";
      chapter: ChapterInput;
      report: SaveChapterReport;
      summaries: SummaryOutcome[];
      questionBanks: QuestionBankOutcome[];
      /** Numrene i `## Spørsmålsbank` som er hoppet over («Må avklares før bruk»). */
      skippedQuestions: number[];
      /** Spørsmålene som er meldt som feil i kapittelet (1.9a), eller `null` når de ikke kunne leses. */
      questionReports: ReportedQuestion[] | null;
    }
  | InvalidImport
  | { status: "courseNotFound"; courseCode: string }
  | { status: "unavailable" };

/** «2, 4 og 8». */
function listNumbers(numbers: number[]): string {
  return numbers.length <= 1 ? numbers.join("") : `${numbers.slice(0, -1).join(", ")} og ${numbers.at(-1)}`;
}

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
  bankNotSaved: "Fikk ikke lagret spørsmålsbanken i databasen.",
  banksFailed: "En eller flere spørsmålsbanker ble ikke lagret. Kjør importen på nytt for å prøve igjen.",
  banksOutdated:
    "En eller flere spørsmålsbanker er utdatert, fordi notatet, læringsmålene, nøkkelbegrepene eller instruksjonen er endret. " +
    "Hent ny hash med `npm run innhold:hash` og kjør importen igjen.",
  banksChanged:
    "En eller flere spørsmålsbanker finnes fra før og er endret i innholdsfilen. " +
    "Å erstatte eller fylle på spørsmål kommer i en senere story, så ingenting er skrevet for dem.",
  skippedQuestions: (numbers: number[]) =>
    `Hopper over spørsmål ${listNumbers(numbers)} fra «## Spørsmålsbank» (må avklares før bruk).`,
  reportedHeading: "Meldt som feil (rett i innholdsfila):",
  reportsUnavailable: "Fikk ikke lest spørsmålene som er meldt som feil.",
  noComment: "ingen kommentar",
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
  const { chapter, ownQuestions } = parsed.value;
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
    const read = parseContentFile(options.content, chapter, target, ownQuestions);
    if (!read.ok) return { status: "invalid", file: "content", errors: read.errors };
    content = read.value;
  }
  if (force !== undefined && !content?.summaries.some((s) => s.number === force)) {
    return { status: "invalid", file: "content", errors: [importMessages.forceNoContent(force)] };
  }
  return { status: "ok", chapter, content, ownQuestions };
}

/**
 * Validerer begge filene, finner emnet og lagrer kapittelet idempotent. Ved feil i en av filene
 * eller manglende emne skrives ingenting. Deretter legges sammendragene og spørsmålsbankene fra
 * innholdsfilen inn for aktive delkapitler med notater. Utdatert innhold lagres ikke.
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

  const chapter = await findSavedChapter(data, course, prepared.chapter);
  const summaries = chapter
    ? await createSummaries(data, chapter, prepared.chapter, prepared.content, options.force)
    : allUnavailable(prepared.chapter);
  const questionBanks = chapter
    ? await createQuestionBanks(data, chapter, prepared.chapter, prepared.content)
    : allUnavailable(prepared.chapter);
  return {
    status: "ok",
    chapter: prepared.chapter,
    report: saved.value,
    summaries,
    questionBanks,
    skippedQuestions: prepared.ownQuestions.skipped,
    questionReports: chapter ? await listReportedQuestions(data, chapter) : null,
  };
}

/**
 * Spørsmålene som er meldt som feil i kapittelets delkapitler, i delkapittelrekkefølge og så eldste
 * først. De listes ved hver import, til 1.6b legger inn en erstatning. `null` når de ikke kan leses.
 */
async function listReportedQuestions(data: DataSource, chapter: Chapter): Promise<ReportedQuestion[] | null> {
  const reports = await data.listQuestionReports(chapter.subchapters.map((s) => s.id));
  if (reports.status !== "ok") return null;
  const order = new Map(chapter.subchapters.map((s, i) => [s.id, i]));
  return [...reports.value]
    .filter((r) => order.has(r.subchapterId))
    .sort((a, b) => order.get(a.subchapterId)! - order.get(b.subchapterId)! || a.reportedAt.localeCompare(b.reportedAt))
    .map((r) => ({
      number: chapter.subchapters[order.get(r.subchapterId)!].number,
      question: r.question,
      theme: r.theme,
      comment: r.comment,
    }));
}

/** Kapittelet slik det er lagret nå, eller `null` når det ikke kan leses. */
async function findSavedChapter(data: DataSource, course: Course, input: ChapterInput): Promise<Chapter | null> {
  const listed = await data.listChapters(course.id);
  if (listed.status !== "ok") return null;
  return listed.value.find((c) => c.number === input.number) ?? null;
}

/** Når kapitlene eller versjonene ikke kan leses, feiler alle delkapitler med notater. */
function allUnavailable(chapter: Pick<ChapterInput, "subchapters">): SummaryOutcome[] {
  return chapter.subchapters.map((s) =>
    hasNotes(s.noteText)
      ? { number: s.number, status: "failed", reason: importMessages.unavailable }
      : { number: s.number, status: "noNotes" },
  );
}

async function createSummaries(
  data: DataSource,
  chapter: Chapter,
  input: ChapterInput,
  content: ContentFile | null,
  force: string | undefined,
): Promise<SummaryOutcome[]> {
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

/**
 * Legger inn spørsmålsbanken fra innholdsfilen for delkapitler som ikke har en klar bank. Finnes en
 * klar bank, er utfallet «uendret» når hash og innhold er like, og ellers «endret» uten at noe
 * skrives. En klar bank tas aldri bort.
 */
async function createQuestionBanks(
  data: DataSource,
  chapter: Chapter,
  input: ChapterInput,
  content: ContentFile | null,
): Promise<QuestionBankOutcome[]> {
  const withNotes = chapter.subchapters.filter((s) => hasNotes(s.noteText));
  const versions = await data.listQuestionBanks(withNotes.map((s) => s.id));
  if (versions.status !== "ok") return allUnavailable(input);
  const readyById = new Map(versions.value.map((v) => [v.subchapterId, v.latestReady]));
  const fromFile = new Map((content?.questionBanks ?? []).map((b) => [b.number, b]));
  const notesByNumber = new Map(input.subchapters.map((s) => [s.number, s.noteText]));
  const knownInstruction = content?.instruction === CONTENT_INSTRUCTION_VERSION;

  const outcomes: QuestionBankOutcome[] = [];
  for (const sub of chapter.subchapters) {
    if (!hasNotes(sub.noteText)) {
      outcomes.push({ number: sub.number, status: "noNotes" });
      continue;
    }
    const bank = fromFile.get(sub.number);
    if (!content || !bank) {
      outcomes.push({ number: sub.number, status: "missing" });
      continue;
    }
    const inputHash = await subchapterInputHash(input, notesByNumber.get(sub.number) ?? sub.noteText);
    if (!knownInstruction || bank.inputHash !== inputHash) {
      outcomes.push({ number: sub.number, status: "outdated" });
      continue;
    }
    const contentHash = await questionBankContentHash(bank);
    const ready = readyById.get(sub.id) ?? null;
    if (ready) {
      const same = ready.inputHash === inputHash && ready.contentHash === contentHash;
      outcomes.push({ number: sub.number, status: same ? "unchanged" : "changed" });
      continue;
    }
    const stored = await data.addQuestionBank({
      subchapterId: sub.id,
      modelId: content.model,
      promptVersion: content.instruction,
      inputHash,
      contentHash,
      themes: bank.themes,
      questions: bank.questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        theme: q.theme,
        sourceNumber: q.source,
        originalText: q.original,
      })),
    });
    outcomes.push(
      stored.status === "ok"
        ? { number: sub.number, status: "created" }
        : { number: sub.number, status: "failed", reason: importMessages.bankNotSaved },
    );
  }
  return outcomes;
}

/**
 * Kode 1 når et sammendrag eller en spørsmålsbank er utdatert, endret eller ikke ble lagret, ellers
 * 0. «Mangler innhold» gir 0.
 */
export function importExitCode(summaries: SummaryOutcome[], questionBanks: QuestionBankOutcome[] = []): 0 | 1 {
  const bad = (s: QuestionBankOutcome) => s.status === "failed" || s.status === "outdated" || s.status === "changed";
  return summaries.some(bad) || questionBanks.some(bad) ? 1 : 0;
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
      return "mangler sammendrag";
    case "failed":
      return `sammendrag feilet: ${outcome.reason}`;
    case "noNotes":
      return "mangler notater";
  }
}

function questionBankLabel(outcome: QuestionBankOutcome): string {
  switch (outcome.status) {
    case "created":
      return "spørsmålsbank lagt inn";
    case "unchanged":
      return "spørsmålsbank uendret";
    case "outdated":
      return "spørsmålsbank utdatert";
    case "changed":
      return "spørsmålsbank endret, ikke lagt inn";
    case "missing":
      return "mangler spørsmålsbank";
    case "failed":
      return `spørsmålsbank feilet: ${outcome.reason}`;
    case "noNotes":
      return "mangler notater";
  }
}

/** Det som står etter endringen i linjen for et delkapittel, eller `""`. */
function contentLabel(summary?: SummaryOutcome, bank?: QuestionBankOutcome): string {
  if (!summary && !bank) return "";
  if (summary?.status === "noNotes" || bank?.status === "noNotes") return ", mangler notater";
  if (summary?.status === "missing" && (!bank || bank.status === "missing")) return ", mangler innhold";
  return [summary && summaryLabel(summary), bank && questionBankLabel(bank)]
    .filter((label) => label)
    .map((label) => `, ${label}`)
    .join("");
}

/**
 * Norsk sammendrag av importen, én linje per kapittel og delkapittel. Linjen for et aktivt
 * delkapittel sier også hva som skjedde med sammendraget og spørsmålsbanken. Til slutt kommer
 * spørsmålene som er meldt som feil, med delkapittel, tekst, tema og kommentar.
 */
export function describeImport(
  chapter: ChapterInput,
  report: SaveChapterReport,
  summaries: SummaryOutcome[] = [],
  questionBanks: QuestionBankOutcome[] = [],
  reported: ReportedQuestion[] = [],
): string[] {
  const titles = new Map(chapter.subchapters.map((s) => [s.number, s.title]));
  const summaryByNumber = new Map(summaries.map((s) => [s.number, s]));
  const bankByNumber = new Map(questionBanks.map((s) => [s.number, s]));
  const lines = [`Kapittel ${chapter.number} ${chapter.title}: ${changeLabel[report.chapter]}`];
  for (const sub of report.subchapters) {
    const title = titles.get(sub.number);
    const content = contentLabel(summaryByNumber.get(sub.number), bankByNumber.get(sub.number));
    lines.push(`  ${sub.number}${title ? ` ${title}` : ""}: ${changeLabel[sub.change]}${content}`);
  }
  const quiet = (s: QuestionBankOutcome) => s.status === "unchanged" || s.status === "missing" || s.status === "noNotes";
  const allUnchanged =
    report.chapter === "unchanged" &&
    report.subchapters.every((s) => s.change === "unchanged") &&
    summaries.every(quiet) &&
    questionBanks.every(quiet);
  if (allUnchanged) lines.push(importMessages.allUnchanged);
  if (reported.length > 0) {
    lines.push(importMessages.reportedHeading);
    for (const r of reported) {
      lines.push(`  ${r.number} «${r.question}» (tema: ${r.theme}): ${r.comment ?? importMessages.noComment}`);
    }
  }
  return lines;
}

export type ImportReport = { stdout: string[]; stderr: string[]; code: 0 | 1 };

/**
 * Det kommandoen skriver ut etter en vellykket lagring, og koden den avslutter med. Spørsmål som er
 * meldt som feil, endrer ikke koden.
 */
export function reportImport(result: Extract<ImportChapterResult, { status: "ok" }>): ImportReport {
  const { summaries, questionBanks } = result;
  const stdout = describeImport(result.chapter, result.report, summaries, questionBanks, result.questionReports ?? []);
  if (result.skippedQuestions.length > 0) stdout.push(importMessages.skippedQuestions(result.skippedQuestions));
  const stderr: string[] = [];
  if (result.questionReports === null) stderr.push(importMessages.reportsUnavailable);
  if (summaries.some((s) => s.status === "outdated")) stderr.push(importMessages.summariesOutdated);
  if (summaries.some((s) => s.status === "failed")) stderr.push(importMessages.summariesFailed);
  if (questionBanks.some((s) => s.status === "outdated")) stderr.push(importMessages.banksOutdated);
  if (questionBanks.some((s) => s.status === "changed")) stderr.push(importMessages.banksChanged);
  if (questionBanks.some((s) => s.status === "failed")) stderr.push(importMessages.banksFailed);
  return { stdout, stderr, code: importExitCode(summaries, questionBanks) };
}
