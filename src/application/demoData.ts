// Skjemaet for demofilene i `demo-data/` og brukstilfellet som bygger dem (FR-26, AD-3, NFR-4, NFR-6,
// NFR-8). Både `scripts/export-demo.ts` og demo-adapteren (2.2) validerer mot skjemaet. Leser bare,
// skriver ingenting.
//
// Fila har bare innhold: ingen e-post, bruker-ID, database-ID-er, notater, læringsmål, nøkkelbegreper,
// hasher, tidspunkter, svar, framdrift eller rapporter. ID-ene lages av strukturen.
import { listChapterOverview } from "./chapterOverview";
import type { DataSource, Unavailable } from "./dataSource";

export const DEMO_SCHEMA_VERSION = 1;

/** Kapitlene demoen kan ha. */
export const DEMO_CHAPTERS: readonly number[] = [1, 2, 3, 4];

/** Minst så mange aktive spørsmål per delkapittel og per tema (NFR-8). */
export const DEMO_MIN_QUESTIONS = 20;
export const DEMO_MIN_PER_THEME = 2;

export type DemoCourse = {
  /** `demo-<kode med små bokstaver>`, for eksempel `demo-ibe430`. */
  id: string;
  code: string;
  name: string;
  learningOutcomes: string;
  examForm: string;
};

/** Temaet har ikke noe navn, fordi quizen aldri viser det. */
export type DemoTheme = { id: string };

export type DemoQuestion = {
  /** `demo-<n.m>-q01`, `demo-<n.m>-q02` og så videre i bankens rekkefølge. */
  id: string;
  /** `demo-<n.m>-t1`, `demo-<n.m>-t2` og så videre i rekkefølgen temaene først brukes. */
  themeId: string;
  question: string;
  /** Fire alternativer. */
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type DemoSubchapter = {
  /** `demo-<n.m>`. */
  id: string;
  number: string;
  title: string;
  /** Teksten i siste klare sammendrag. */
  summary: string;
  themes: DemoTheme[];
  questions: DemoQuestion[];
};

export type DemoChapter = { number: number; title: string; subchapters: DemoSubchapter[] };

export type DemoData = {
  schemaVersion: typeof DEMO_SCHEMA_VERSION;
  course: DemoCourse;
  chapters: DemoChapter[];
};

export type DemoValidation = { ok: true; value: DemoData } | { ok: false; errors: string[] };

const demoId = {
  course: (code: string) => `demo-${code.toLowerCase()}`,
  subchapter: (number: string) => `demo-${number}`,
  question: (number: string, index: number) => `demo-${number}-q${String(index + 1).padStart(2, "0")}`,
  theme: (number: string, index: number) => `demo-${number}-t${index + 1}`,
};

type Obj = Record<string, unknown>;

/**
 * Validerer en demofil mot skjemaet. Ukjente felt, manglende felt, feil typer, ID-er som ikke følger
 * strukturen, feil rekkefølge og banker som bryter NFR-8 gir en norsk feil med stien til feltet.
 */
export function validateDemoData(input: unknown): DemoValidation {
  const errors: string[] = [];
  const fail = (path: string, message: string) => errors.push(`${path}: ${message}`);

  const isObj = (value: unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);

  /** Sjekker at verdien er et objekt med nøyaktig disse feltene. */
  function object(value: unknown, path: string, fields: readonly string[]): value is Obj {
    if (!isObj(value)) {
      fail(path, "skal være et objekt");
      return false;
    }
    for (const key of Object.keys(value)) if (!fields.includes(key)) fail(`${path}.${key}`, "ukjent felt");
    for (const key of fields) if (!(key in value)) fail(`${path}.${key}`, "mangler");
    return true;
  }

  function text(value: unknown, path: string, options: { allowEmpty?: boolean } = {}): value is string {
    if (typeof value !== "string") {
      if (value !== undefined) fail(path, "skal være tekst");
      return false;
    }
    if (!options.allowEmpty && value.trim() === "") {
      fail(path, "skal ikke være tom");
      return false;
    }
    return true;
  }

  function list(value: unknown, path: string): value is unknown[] {
    if (!Array.isArray(value)) {
      if (value !== undefined) fail(path, "skal være en liste");
      return false;
    }
    return true;
  }

  function equals(value: unknown, expected: string, path: string) {
    if (typeof value === "string" && value !== expected) fail(path, `skal være «${expected}»`);
  }

  if (!object(input, "demo", ["schemaVersion", "course", "chapters"])) return { ok: false, errors };

  if (input.schemaVersion !== DEMO_SCHEMA_VERSION && "schemaVersion" in input) {
    fail("schemaVersion", `skal være ${DEMO_SCHEMA_VERSION}`);
  }

  const course = input.course;
  if (object(course, "course", ["id", "code", "name", "learningOutcomes", "examForm"])) {
    text(course.id, "course.id");
    if (text(course.code, "course.code")) equals(course.id, demoId.course(course.code), "course.id");
    text(course.name, "course.name");
    text(course.learningOutcomes, "course.learningOutcomes", { allowEmpty: true });
    text(course.examForm, "course.examForm", { allowEmpty: true });
  }

  if (list(input.chapters, "chapters")) {
    if (input.chapters.length === 0) fail("chapters", "skal ha minst ett kapittel");
    let previousChapter = 0;
    input.chapters.forEach((chapter, c) => {
      const cPath = `chapters[${c}]`;
      if (!object(chapter, cPath, ["number", "title", "subchapters"])) return;
      const number = chapter.number;
      if (typeof number !== "number" || !Number.isInteger(number) || number < 1) {
        if (number !== undefined) fail(`${cPath}.number`, "skal være et positivt heltall");
      } else {
        if (!DEMO_CHAPTERS.includes(number)) {
          fail(`${cPath}.number`, `skal være et av kapitlene ${DEMO_CHAPTERS.join(", ")}`);
        }
        if (number <= previousChapter) fail(`${cPath}.number`, "kapitlene skal stå i stigende rekkefølge uten duplikater");
        previousChapter = number;
      }
      text(chapter.title, `${cPath}.title`);
      if (!list(chapter.subchapters, `${cPath}.subchapters`)) return;
      if (chapter.subchapters.length === 0) fail(`${cPath}.subchapters`, "skal ha minst ett delkapittel");
      const seenNumbers = new Set<string>();
      chapter.subchapters.forEach((sub, s) => {
        const sPath = `${cPath}.subchapters[${s}]`;
        if (!object(sub, sPath, ["id", "number", "title", "summary", "themes", "questions"])) return;
        const subNumber = typeof sub.number === "string" ? sub.number : null;
        if (text(sub.number, `${sPath}.number`)) {
          if (typeof number === "number" && !new RegExp(`^${number}\\.[1-9]\\d*$`).test(sub.number)) {
            fail(`${sPath}.number`, `skal være «${number}.m»`);
          }
          if (seenNumbers.has(sub.number)) fail(`${sPath}.number`, "finnes fra før i kapittelet");
          seenNumbers.add(sub.number);
          equals(sub.id, demoId.subchapter(sub.number), `${sPath}.id`);
        }
        text(sub.id, `${sPath}.id`);
        text(sub.title, `${sPath}.title`);
        text(sub.summary, `${sPath}.summary`);

        const themeIds: string[] = [];
        if (list(sub.themes, `${sPath}.themes`)) {
          sub.themes.forEach((theme, t) => {
            const tPath = `${sPath}.themes[${t}]`;
            if (!object(theme, tPath, ["id"])) return;
            if (text(theme.id, `${tPath}.id`)) {
              if (subNumber) equals(theme.id, demoId.theme(subNumber, t), `${tPath}.id`);
              themeIds.push(theme.id);
            }
          });
        }

        if (!list(sub.questions, `${sPath}.questions`)) return;
        if (sub.questions.length < DEMO_MIN_QUESTIONS) {
          fail(`${sPath}.questions`, `har ${sub.questions.length} spørsmål, færre enn ${DEMO_MIN_QUESTIONS}`);
        }
        const perTheme = new Map<string, number>();
        const firstUse: string[] = [];
        sub.questions.forEach((question, q) => {
          const qPath = `${sPath}.questions[${q}]`;
          if (!object(question, qPath, ["id", "themeId", "question", "options", "correctIndex", "explanation"])) return;
          if (text(question.id, `${qPath}.id`) && subNumber) equals(question.id, demoId.question(subNumber, q), `${qPath}.id`);
          if (text(question.themeId, `${qPath}.themeId`)) {
            if (!themeIds.includes(question.themeId)) {
              fail(`${qPath}.themeId`, "finnes ikke i themes");
            } else {
              if (!perTheme.has(question.themeId)) firstUse.push(question.themeId);
              perTheme.set(question.themeId, (perTheme.get(question.themeId) ?? 0) + 1);
            }
          }
          text(question.question, `${qPath}.question`);
          if (list(question.options, `${qPath}.options`)) {
            if (question.options.length !== 4) fail(`${qPath}.options`, "skal ha fire alternativer");
            question.options.forEach((option, o) => text(option, `${qPath}.options[${o}]`));
          }
          const index = question.correctIndex;
          if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index > 3) {
            if (index !== undefined) fail(`${qPath}.correctIndex`, "skal være 0, 1, 2 eller 3");
          }
          text(question.explanation, `${qPath}.explanation`);
        });
        for (const id of themeIds) {
          const count = perTheme.get(id) ?? 0;
          if (count < DEMO_MIN_PER_THEME) {
            fail(`${sPath}.themes`, `temaet ${id} har ${count} spørsmål, færre enn ${DEMO_MIN_PER_THEME}`);
          }
        }
        // Temaer uten spørsmål er alt meldt over, så de holdes utenfor rekkefølgen.
        if (firstUse.join() !== themeIds.filter((id) => perTheme.has(id)).join()) {
          fail(`${sPath}.themes`, "skal stå i rekkefølgen temaene først brukes");
        }
      });
    });
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as DemoData };
}

/** JSON med to mellomrom og linjeskift til slutt, så samme innhold gir samme fil. */
export function serializeDemoData(data: DemoData): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export type SkippedSubchapter = { number: string; title: string; reason: string };

export type BuildDemoResult =
  | { status: "ok"; data: DemoData; written: number; skipped: SkippedSubchapter[] }
  | { status: "courseNotFound"; courseCode: string }
  | { status: "noReadySubchapters"; skipped: SkippedSubchapter[] }
  | { status: "invalid"; errors: string[] }
  | Unavailable;

export const demoMessages = {
  courseNotFound: (code: string) => `Fant ikke emnet ${code} hos eieren. Ingenting er skrevet.`,
  unavailable: "Fikk ikke kontakt med databasen. Ingenting er skrevet. Prøv igjen senere.",
  noReadySubchapters: (code: string) =>
    `Ingen delkapitler i ${code} kapittel ${DEMO_CHAPTERS[0]}–${DEMO_CHAPTERS[DEMO_CHAPTERS.length - 1]} er klare. Ingenting er skrevet.`,
  invalid: "Demodataene følger ikke skjemaet. Ingenting er skrevet.",
  notReady: (status: string) => `status «${status}»`,
  noSummary: "mangler klart sammendrag",
  tooFewQuestions: `færre enn ${DEMO_MIN_QUESTIONS} spørsmål`,
  tooFewPerTheme: `temaet har færre enn ${DEMO_MIN_PER_THEME} spørsmål`,
  skippedHeading: "Hoppet over:",
  skipped: (s: SkippedSubchapter) => `  ${s.number} ${s.title}: ${s.reason}`,
  written: (count: number, file: string) =>
    `Skrev ${count} ${count === 1 ? "delkapittel" : "delkapitler"} til ${file}.`,
} as const;

/**
 * Bygger demodataene for emnet `courseCode` fra datakilden: kapittel 1–4 med de delkapitlene som er
 * `klart` i `listChapterOverview` og har minst 20 aktive spørsmål og minst 2 per tema (NFR-8).
 * Delkapitler som hoppes over, står i `skipped` med årsak. Resultatet er validert mot skjemaet.
 */
export async function buildDemoData(data: DataSource, courseCode: string): Promise<BuildDemoResult> {
  const courses = await data.listCourses();
  if (courses.status !== "ok") return courses;
  const course = courses.value.find((c) => c.code.toUpperCase() === courseCode.toUpperCase());
  if (!course) return { status: "courseNotFound", courseCode };

  const overview = await listChapterOverview(data, course.id);
  if (overview.status !== "ok") return overview;
  const chapters = overview.value.filter((c) => DEMO_CHAPTERS.includes(c.number));

  const ids = chapters.flatMap((c) => c.subchapters.map((s) => s.id));
  const summaries = await data.listSummaryVersions(ids);
  if (summaries.status !== "ok") return summaries;
  const summaryById = new Map(summaries.value.map((s) => [s.subchapterId, s.latestReady?.text ?? null]));

  const skipped: SkippedSubchapter[] = [];
  const demoChapters: DemoChapter[] = [];
  for (const chapter of chapters) {
    const subchapters: DemoSubchapter[] = [];
    for (const sub of chapter.subchapters) {
      const skip = (reason: string) => skipped.push({ number: sub.number, title: sub.title, reason });
      if (sub.status !== "klart") {
        skip(demoMessages.notReady(sub.status));
        continue;
      }
      const summary = summaryById.get(sub.id) ?? null;
      if (!summary || summary.trim() === "") {
        skip(demoMessages.noSummary);
        continue;
      }
      const bank = await data.listQuizBank(sub.id);
      if (bank.status !== "ok") return bank;
      if (bank.value.length < DEMO_MIN_QUESTIONS) {
        skip(demoMessages.tooFewQuestions);
        continue;
      }
      const themeIndex = new Map<string, number>();
      const perTheme = new Map<string, number>();
      for (const q of bank.value) {
        if (!themeIndex.has(q.themeId)) themeIndex.set(q.themeId, themeIndex.size);
        perTheme.set(q.themeId, (perTheme.get(q.themeId) ?? 0) + 1);
      }
      if ([...perTheme.values()].some((count) => count < DEMO_MIN_PER_THEME)) {
        skip(demoMessages.tooFewPerTheme);
        continue;
      }
      subchapters.push({
        id: demoId.subchapter(sub.number),
        number: sub.number,
        title: sub.title,
        summary,
        themes: [...themeIndex.values()].map((i) => ({ id: demoId.theme(sub.number, i) })),
        questions: bank.value.map((q, i) => ({
          id: demoId.question(sub.number, i),
          themeId: demoId.theme(sub.number, themeIndex.get(q.themeId)!),
          question: q.question,
          options: [...q.options],
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        })),
      });
    }
    if (subchapters.length > 0) demoChapters.push({ number: chapter.number, title: chapter.title, subchapters });
  }

  if (demoChapters.length === 0) return { status: "noReadySubchapters", skipped };

  const demo: DemoData = {
    schemaVersion: DEMO_SCHEMA_VERSION,
    course: {
      id: demoId.course(course.code),
      code: course.code,
      name: course.name,
      learningOutcomes: course.learningOutcomes,
      examForm: course.examForm,
    },
    chapters: demoChapters,
  };
  const validation = validateDemoData(demo);
  if (!validation.ok) return { status: "invalid", errors: validation.errors };
  const written = demoChapters.reduce((sum, c) => sum + c.subchapters.length, 0);
  return { status: "ok", data: demo, written, skipped };
}
