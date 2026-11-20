// Datakilde i minnet for testene av brukstilfellene. Samme regler som databasen: unik emnekode
// per eier, on delete set null for aktivt emne, og delkapitler som merkes fjernet i stedet for å slettes.
import {
  chapterChanges,
  planSubchapters,
  subchapterChangeOf,
  type ChapterInput,
  type StoredSubchapter,
} from "@/domain/chapter";
import type { CourseInput } from "@/domain/course";
import type {
  Chapter,
  Course,
  DataSource,
  NewQuestionBank,
  NewQuizQuestion,
  NewSummaryVersion,
  QuestionBankVersion,
  SaveChapterReport,
  SubchapterQuestionBanks,
  SubchapterSummaries,
  SummaryVersion,
} from "../dataSource";

type StoredChapter = Omit<Chapter, "subchapters"> & { courseId: string; subchapters: StoredSubchapter[] };

type StoredTheme = { id: string; subchapterId: string; name: string };

type StoredQuizQuestion = Omit<NewQuizQuestion, "theme"> & {
  id: string;
  subchapterId: string;
  bankVersionId: string;
  themeId: string;
  status: "aktiv" | "trukket";
};

export class MemoryDataSource implements DataSource {
  courses: Course[] = [];
  chapters: StoredChapter[] = [];
  /** Sammendragsversjonene i rekkefølgen de ble lagret. */
  summaryVersions: SummaryVersion[] = [];
  activeId: string | null = null;
  down = false;
  /** Feiler bare lagringen av sammendragsversjoner, så testene kan se at importen fortsetter. */
  summaryWritesDown = false;
  /** Feiler bare lesingen av sammendragsversjoner, etter at kapittelet er lagret. */
  summaryReadsDown = false;
  /** Bankversjonene i rekkefølgen de ble lagret, og temaene og spørsmålene som hører til. */
  questionBankVersions: QuestionBankVersion[] = [];
  themes: StoredTheme[] = [];
  quizQuestions: StoredQuizQuestion[] = [];
  /** Feiler lesingen av bankversjoner. */
  bankReadsDown = false;
  /** Feiler lagringen av spørsmålene etter at versjonen er opprettet, så den blir `feilet`. */
  bankQuestionWritesDown = false;
  /** Antall skrivinger av kapitler og delkapitler, så testene kan se at uendrede rader ikke røres. */
  chapterWrites = 0;
  private nextId = 1;

  private unavailable() {
    return { status: "unavailable" as const };
  }

  private hasCode(code: string, exceptId?: string) {
    return this.courses.some((c) => c.id !== exceptId && c.code.toUpperCase() === code.toUpperCase());
  }

  async listCourses() {
    if (this.down) return this.unavailable();
    const value = [...this.courses].sort((a, b) => a.code.localeCompare(b.code));
    return { status: "ok" as const, value };
  }

  async getCourse(id: string) {
    if (this.down) return this.unavailable();
    return { status: "ok" as const, value: this.courses.find((c) => c.id === id) ?? null };
  }

  async createCourse(input: CourseInput) {
    if (this.down) return this.unavailable();
    if (this.hasCode(input.code)) return { status: "duplicate" as const };
    const course = { ...input, id: `c${this.nextId++}` };
    this.courses.push(course);
    return { status: "ok" as const, value: course };
  }

  async updateCourse(id: string, input: CourseInput) {
    if (this.down) return this.unavailable();
    if (this.hasCode(input.code, id)) return { status: "duplicate" as const };
    const index = this.courses.findIndex((c) => c.id === id);
    if (index < 0) return { status: "ok" as const, value: null };
    this.courses[index] = { ...input, id };
    return { status: "ok" as const, value: this.courses[index] };
  }

  async deleteCourse(id: string) {
    if (this.down) return this.unavailable();
    this.courses = this.courses.filter((c) => c.id !== id);
    const removedSubIds = new Set(
      this.chapters.filter((c) => c.courseId === id).flatMap((c) => c.subchapters.map((s) => s.id)),
    );
    this.chapters = this.chapters.filter((c) => c.courseId !== id);
    this.summaryVersions = this.summaryVersions.filter((v) => !removedSubIds.has(v.subchapterId));
    this.questionBankVersions = this.questionBankVersions.filter((v) => !removedSubIds.has(v.subchapterId));
    this.themes = this.themes.filter((t) => !removedSubIds.has(t.subchapterId));
    this.quizQuestions = this.quizQuestions.filter((q) => !removedSubIds.has(q.subchapterId));
    if (this.activeId === id) this.activeId = null;
    return { status: "ok" as const, value: undefined };
  }

  async getActiveCourse() {
    if (this.down) return this.unavailable();
    return {
      status: "ok" as const,
      value: this.courses.find((c) => c.id === this.activeId) ?? null,
    };
  }

  async setActiveCourse(id: string | null) {
    if (this.down) return this.unavailable();
    this.activeId = id;
    return { status: "ok" as const, value: undefined };
  }

  async listChapters(courseId: string) {
    if (this.down) return this.unavailable();
    const value: Chapter[] = this.chapters
      .filter((c) => c.courseId === courseId)
      .sort((a, b) => a.number - b.number)
      .map((c) => ({
        id: c.id,
        number: c.number,
        title: c.title,
        learningGoals: c.learningGoals,
        keyConcepts: c.keyConcepts,
        subchapters: c.subchapters
          .filter((s) => !s.removed)
          .sort((a, b) => a.position - b.position)
          .map(({ id, number, title, noteText }) => ({ id, number, title, noteText })),
      }));
    return { status: "ok" as const, value };
  }

  async saveChapter(courseId: string, input: ChapterInput) {
    if (this.down) return this.unavailable();
    let chapter = this.chapters.find((c) => c.courseId === courseId && c.number === input.number);
    let chapterChange: SaveChapterReport["chapter"] = "unchanged";
    if (!chapter) {
      chapter = {
        id: `k${this.nextId++}`,
        courseId,
        number: input.number,
        title: input.title,
        learningGoals: input.learningGoals,
        keyConcepts: input.keyConcepts,
        subchapters: [],
      };
      this.chapters.push(chapter);
      this.chapterWrites++;
      chapterChange = "created";
    } else {
      const changes = chapterChanges(chapter, input);
      if (Object.keys(changes).length > 0) {
        Object.assign(chapter, changes);
        this.chapterWrites++;
        chapterChange = "updated";
      }
    }

    const steps = planSubchapters(chapter.subchapters, input.subchapters);
    for (const step of steps) {
      if (step.kind === "create") {
        chapter.subchapters.push({ id: `d${this.nextId++}`, number: step.number, removed: false, ...step.fields });
        this.chapterWrites++;
      } else if (step.kind === "update") {
        const sub = chapter.subchapters.find((s) => s.id === step.id)!;
        Object.assign(sub, step.changes, { removed: false });
        this.chapterWrites++;
      } else if (step.kind === "remove") {
        chapter.subchapters.find((s) => s.id === step.id)!.removed = true;
        this.chapterWrites++;
      }
    }

    const report: SaveChapterReport = {
      chapter: chapterChange,
      subchapters: steps.map((step) => ({ number: step.number, change: subchapterChangeOf(step) })),
    };
    return { status: "ok" as const, value: report };
  }

  async listSummaryVersions(subchapterIds: string[]) {
    if (this.down || this.summaryReadsDown) return this.unavailable();
    const newestFirst = [...this.summaryVersions].reverse();
    const value: SubchapterSummaries[] = subchapterIds.map((subchapterId) => {
      const own = newestFirst.filter((v) => v.subchapterId === subchapterId);
      return {
        subchapterId,
        latest: own[0] ?? null,
        latestReady: own.find((v) => v.status === "klart") ?? null,
      };
    });
    return { status: "ok" as const, value };
  }

  async addSummaryVersion(input: NewSummaryVersion) {
    if (this.down || this.summaryWritesDown) return this.unavailable();
    const version: SummaryVersion = {
      id: `s${this.nextId++}`,
      subchapterId: input.subchapterId,
      status: input.status,
      text: input.status === "klart" ? input.text : null,
      modelId: input.modelId,
      promptVersion: input.promptVersion,
      inputHash: input.inputHash,
      error: input.status === "feilet" ? input.error : null,
      createdAt: new Date(Date.UTC(2026, 10, 18, 0, 0, this.summaryVersions.length)).toISOString(),
    };
    this.summaryVersions.push(version);
    return { status: "ok" as const, value: version };
  }

  async listQuestionBanks(subchapterIds: string[]) {
    if (this.down || this.bankReadsDown) return this.unavailable();
    const newestFirst = [...this.questionBankVersions].reverse();
    const value: SubchapterQuestionBanks[] = subchapterIds.map((subchapterId) => {
      const own = newestFirst.filter((v) => v.subchapterId === subchapterId);
      return {
        subchapterId,
        latest: own[0] ?? null,
        latestReady: own.find((v) => v.status === "klart") ?? null,
      };
    });
    return { status: "ok" as const, value };
  }

  async addQuestionBank(bank: NewQuestionBank) {
    if (this.down) return this.unavailable();
    const version: QuestionBankVersion = {
      id: `b${this.nextId++}`,
      subchapterId: bank.subchapterId,
      status: "lages",
      modelId: bank.modelId,
      promptVersion: bank.promptVersion,
      inputHash: bank.inputHash,
      contentHash: bank.contentHash,
      error: null,
      createdAt: new Date(Date.UTC(2026, 10, 20, 0, 0, this.questionBankVersions.length)).toISOString(),
    };
    this.questionBankVersions.push(version);

    const themeIds = new Map<string, string>();
    for (const name of bank.themes) {
      let theme = this.themes.find((t) => t.subchapterId === bank.subchapterId && t.name === name);
      if (!theme) {
        theme = { id: `t${this.nextId++}`, subchapterId: bank.subchapterId, name };
        this.themes.push(theme);
      }
      themeIds.set(name, theme.id);
    }
    if (this.bankQuestionWritesDown) {
      version.status = "feilet";
      // Samme tekst som Supabase-adapteren lagrer.
      version.error = "Fikk ikke lagret temaene eller spørsmålene.";
      return this.unavailable();
    }
    for (const { theme, ...question } of bank.questions) {
      this.quizQuestions.push({
        ...question,
        id: `q${this.nextId++}`,
        subchapterId: bank.subchapterId,
        bankVersionId: version.id,
        themeId: themeIds.get(theme)!,
        status: "aktiv",
      });
    }
    version.status = "klart";
    return { status: "ok" as const, value: { ...version } };
  }
}
