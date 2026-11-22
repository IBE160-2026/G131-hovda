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
  NewQuiz,
  NewQuizQuestion,
  NewSummaryVersion,
  QuestionBankVersion,
  QuestionReport,
  Quiz,
  QuizItem,
  QuizQuestion,
  QuizResultInput,
  SaveChapterReport,
  SubchapterCompletion,
  SubchapterQuestionBanks,
  SubchapterSummaries,
  SummaryReport,
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

type StoredQuiz = Omit<Quiz, "items">;

type StoredQuizItem = Omit<QuizItem, "question" | "questionRetired"> & { quizId: string; questionId: string };

type StoredQuestionReport = { questionId: string; quizItemId: string | null; comment: string | null; reportedAt: string };

type StoredSummaryReport = { summaryVersionId: string; comment: string | null; reportedAt: string };

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
  sessions: { id: string; startedAt: string; endedAt: string | null }[] = [];
  quizzes: StoredQuiz[] = [];
  /** Elementene i rekkefølgen de ble lagret, også de erstattede. */
  quizItems: StoredQuizItem[] = [];
  /** Feiler lesingen av bank og quizer. */
  quizReadsDown = false;
  /** Feiler alle skrivinger til quizene. */
  quizWritesDown = false;
  /** Feiler bare erstatningen, etter at svaret er lagret. */
  replaceWritesDown = false;
  /** Feiler lagringen av resultatet, og dermed også avkrysningen. */
  resultWritesDown = false;
  /** Avkrysningene, én per delkapittel, i rekkefølgen de ble lagret. */
  completions: SubchapterCompletion[] = [];
  /** Feiler lesingen av avkrysningene. */
  completionReadsDown = false;
  /** Feilrapportene, én per spørsmål, i rekkefølgen de ble lagret. */
  questionReports: StoredQuestionReport[] = [];
  /** Feiler rapporten, og da er ingenting endret. */
  reportWritesDown = false;
  /** Feiler lesingen av feilrapportene. */
  reportReadsDown = false;
  /** Rapportene på sammendrag, én per versjon, i rekkefølgen de ble lagret. */
  summaryReports: StoredSummaryReport[] = [];
  /** Feiler rapporten på et sammendrag, og da er ingenting lagret. */
  summaryReportWritesDown = false;
  /** Feiler lesingen av rapportene på sammendrag. */
  summaryReportReadsDown = false;
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
    const keptVersions = new Set(this.summaryVersions.map((v) => v.id));
    this.summaryReports = this.summaryReports.filter((r) => keptVersions.has(r.summaryVersionId));
    this.questionBankVersions = this.questionBankVersions.filter((v) => !removedSubIds.has(v.subchapterId));
    this.themes = this.themes.filter((t) => !removedSubIds.has(t.subchapterId));
    this.quizQuestions = this.quizQuestions.filter((q) => !removedSubIds.has(q.subchapterId));
    const removedQuizIds = new Set(this.quizzes.filter((q) => removedSubIds.has(q.subchapterId)).map((q) => q.id));
    this.quizzes = this.quizzes.filter((q) => !removedQuizIds.has(q.id));
    this.quizItems = this.quizItems.filter((i) => !removedQuizIds.has(i.quizId));
    this.completions = this.completions.filter((c) => !removedSubIds.has(c.subchapterId));
    const keptQuestions = new Set(this.quizQuestions.map((q) => q.id));
    this.questionReports = this.questionReports.filter((r) => keptQuestions.has(r.questionId));
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

  /** Et tidspunkt som øker for hver skriving til quizene, så «nyest» og «for lengst siden» er entydig. */
  private quizTick = 0;
  private now() {
    return new Date(Date.UTC(2026, 10, 21, 0, 0, 0, this.quizTick++)).toISOString();
  }

  private toQuizQuestion(id: string): QuizQuestion {
    const q = this.quizQuestions.find((x) => x.id === id)!;
    return {
      id: q.id,
      themeId: q.themeId,
      question: q.question,
      options: [...q.options],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    };
  }

  private toQuiz(stored: StoredQuiz): Quiz {
    const items = this.quizItems
      .filter((i) => i.quizId === stored.id)
      .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
      .map((i) => ({
        id: i.id,
        position: i.position,
        status: i.status,
        question: this.toQuizQuestion(i.questionId),
        questionRetired: this.quizQuestions.find((q) => q.id === i.questionId)!.status === "trukket",
        chosenIndex: i.chosenIndex,
        correct: i.correct,
        answeredAt: i.answeredAt,
        createdAt: i.createdAt,
      }));
    return { ...stored, items };
  }

  async listQuizBank(subchapterId: string) {
    if (this.down || this.quizReadsDown) return this.unavailable();
    const ready = [...this.questionBankVersions].reverse().find((v) => v.subchapterId === subchapterId && v.status === "klart");
    const value = ready
      ? this.quizQuestions
          .filter((q) => q.bankVersionId === ready.id && q.status === "aktiv")
          .map((q) => this.toQuizQuestion(q.id))
      : [];
    return { status: "ok" as const, value };
  }

  async listQuizzes(subchapterId: string) {
    if (this.down || this.quizReadsDown) return this.unavailable();
    const value = this.quizzes
      .filter((q) => q.subchapterId === subchapterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((q) => this.toQuiz(q));
    return { status: "ok" as const, value };
  }

  async createQuiz(input: NewQuiz) {
    if (this.down || this.quizWritesDown) return this.unavailable();
    if (this.quizzes.some((q) => q.subchapterId === input.subchapterId && q.status === "pågår")) {
      return { status: "duplicate" as const };
    }
    const startedAt = this.now();
    const session = { id: `o${this.nextId++}`, startedAt, endedAt: null };
    this.sessions.push(session);
    const quiz: StoredQuiz = {
      id: `z${this.nextId++}`,
      sessionId: session.id,
      subchapterId: input.subchapterId,
      status: "pågår",
      correctCount: null,
      total: null,
      carryThemeId: null,
      createdAt: startedAt,
      finishedAt: null,
    };
    this.quizzes.push(quiz);
    input.questionIds.forEach((questionId, i) => {
      this.quizItems.push({
        id: `i${this.nextId++}`,
        quizId: quiz.id,
        questionId,
        position: i + 1,
        status: "aktiv",
        chosenIndex: null,
        correct: null,
        answeredAt: null,
        createdAt: startedAt,
      });
    });
    return { status: "ok" as const, value: this.toQuiz(quiz) };
  }

  async answerQuizItem(itemId: string, chosenIndex: number, correct: boolean) {
    if (this.down || this.quizWritesDown) return this.unavailable();
    const item = this.quizItems.find((i) => i.id === itemId);
    if (!item || item.status !== "aktiv" || item.answeredAt !== null) return { status: "ok" as const, value: false };
    Object.assign(item, { chosenIndex, correct, answeredAt: this.now() });
    return { status: "ok" as const, value: true };
  }

  async replaceQuizItem(itemId: string, questionId: string) {
    if (this.down || this.quizWritesDown || this.replaceWritesDown) return this.unavailable();
    const item = this.quizItems.find((i) => i.id === itemId);
    if (!item || item.status !== "aktiv" || item.answeredAt !== null) return { status: "ok" as const, value: false };
    item.status = "erstattet";
    this.quizItems.push({
      id: `i${this.nextId++}`,
      quizId: item.quizId,
      questionId,
      position: item.position,
      status: "aktiv",
      chosenIndex: null,
      correct: null,
      answeredAt: null,
      createdAt: this.now(),
    });
    return { status: "ok" as const, value: true };
  }

  /** Som `finish_quiz`: resultatet og avkrysningen lagres sammen, eller ingen av dem. Totalen er de aktive elementene. */
  async saveQuizResult(quizId: string, { correctCount, carryThemeId, completes }: QuizResultInput) {
    if (this.down || this.quizWritesDown || this.resultWritesDown) return this.unavailable();
    const quiz = this.quizzes.find((q) => q.id === quizId);
    if (!quiz || quiz.status !== "pågår") return { status: "ok" as const, value: false };
    const finishedAt = this.now();
    const total = this.quizItems.filter((i) => i.quizId === quizId && i.status === "aktiv").length;
    Object.assign(quiz, { status: "ferdig", correctCount, total, carryThemeId, finishedAt });
    // Én per delkapittel: den første står (on conflict do nothing).
    if (completes && !this.completions.some((c) => c.subchapterId === quiz.subchapterId)) {
      this.completions.push({ subchapterId: quiz.subchapterId, quizId, completedAt: finishedAt });
    }
    return { status: "ok" as const, value: true };
  }

  /** Som `report_quiz_question`: rapporten, tilbaketrekkingen og uttaket skjer sammen, eller ikke. */
  async reportQuizItem(itemId: string, comment: string | null) {
    if (this.down || this.reportWritesDown) return this.unavailable();
    const item = this.quizItems.find((i) => i.id === itemId);
    if (!item) return { status: "ok" as const, value: false };
    const quiz = this.quizzes.find((q) => q.id === item.quizId)!;
    const reportedAt = this.now();
    if (!this.questionReports.some((r) => r.questionId === item.questionId)) {
      this.questionReports.push({ questionId: item.questionId, quizItemId: item.id, comment, reportedAt });
    }
    const question = this.quizQuestions.find((q) => q.id === item.questionId)!;
    if (question.status === "aktiv") question.status = "trukket";
    if (quiz.status === "pågår" && item.status === "aktiv") item.status = "trukket";
    return { status: "ok" as const, value: true };
  }

  async listQuestionReports(subchapterIds: string[]) {
    if (this.down || this.reportReadsDown) return this.unavailable();
    const wanted = new Set(subchapterIds);
    const value: QuestionReport[] = this.questionReports.flatMap((r) => {
      const q = this.quizQuestions.find((x) => x.id === r.questionId)!;
      if (!wanted.has(q.subchapterId)) return [];
      const theme = this.themes.find((t) => t.id === q.themeId)!.name;
      return [{ subchapterId: q.subchapterId, question: q.question, theme, comment: r.comment, reportedAt: r.reportedAt }];
    });
    return { status: "ok" as const, value };
  }

  /** Som `insert … on conflict do nothing`: den første rapporten på en versjon står. */
  async reportSummaryVersion(versionId: string, comment: string | null) {
    if (this.down || this.summaryReportWritesDown) return this.unavailable();
    if (!this.summaryVersions.some((v) => v.id === versionId)) return { status: "ok" as const, value: false };
    if (!this.summaryReports.some((r) => r.summaryVersionId === versionId)) {
      this.summaryReports.push({ summaryVersionId: versionId, comment, reportedAt: this.now() });
    }
    return { status: "ok" as const, value: true };
  }

  async listSummaryReports(subchapterIds: string[]) {
    if (this.down || this.summaryReportReadsDown) return this.unavailable();
    const wanted = new Set(subchapterIds);
    const value: SummaryReport[] = this.summaryReports.flatMap((r) => {
      const version = this.summaryVersions.find((v) => v.id === r.summaryVersionId)!;
      if (!wanted.has(version.subchapterId)) return [];
      return [{ subchapterId: version.subchapterId, summaryVersionId: r.summaryVersionId, comment: r.comment, reportedAt: r.reportedAt }];
    });
    return { status: "ok" as const, value };
  }

  async listCompletions(subchapterIds: string[]) {
    if (this.down || this.completionReadsDown) return this.unavailable();
    const value: SubchapterCompletion[] = subchapterIds.flatMap((id) => {
      const completion = this.completions.find((c) => c.subchapterId === id);
      return completion ? [{ ...completion }] : [];
    });
    return { status: "ok" as const, value };
  }
}
