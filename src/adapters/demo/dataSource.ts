// Datakilden i demoen (FR-26, AD-3, NFR-5). Leser den frosne demofila i nettleseren og skriver
// aldri noe. Fila valideres med samme skjema som eksporten bruker. Er den ugyldig, gir alle lesinger
// `unavailable`. Skrivemetodene gir alltid `unavailable` (2.3 legger til quiztilstanden i besøket).
//
// Fila har ingen notater eller hasher. Hvert delkapittel får derfor en fast plassholdertekst som
// notat, og sammendraget og banken får hashen av den, så de uendrede brukstilfellene gir «klart».
import type {
  Chapter,
  Course,
  DataSource,
  QuestionBankVersion,
  QuizQuestion,
  ReadResult,
  SubchapterQuestionBanks,
  SubchapterSummaries,
  SummaryVersion,
  Unavailable,
} from "@/application/dataSource";
import { validateDemoData, type DemoData, type DemoSubchapter } from "@/application/demoData";
import { subchapterInputHash } from "@/application/summaryHash";

/** Notatet hvert delkapittel får i demoen. Det er ikke plassholderen for manglende notater. */
export const DEMO_NOTE_TEXT = "Notatet er ikke med i demoen.";

const DEMO_MODEL_ID = "demo";
const DEMO_PROMPT_VERSION = "demo";
/** Tidspunktet versjonene får. Fila har ingen tidspunkter. */
const DEMO_CREATED_AT = "2026-12-01T00:00:00.000Z";

const unavailable: Unavailable = { status: "unavailable" };

function ok<T>(value: T): ReadResult<T> {
  return { status: "ok", value };
}

/** Kapitlene i demoen har ikke læringsmål eller nøkkelbegreper, så hashen regnes med tomme felt. */
const noGoals = { learningGoals: "", keyConcepts: "" };

export class DemoDataSource implements DataSource {
  private readonly demo: DemoData | null;
  private readonly subchapters = new Map<string, DemoSubchapter>();
  private hash: Promise<string> | null = null;

  constructor(input: unknown) {
    const validation = validateDemoData(input);
    this.demo = validation.ok ? validation.value : null;
    for (const chapter of this.demo?.chapters ?? []) {
      for (const sub of chapter.subchapters) this.subchapters.set(sub.id, sub);
    }
  }

  /** Hashen av plassholdernotatet. Den er lik for alle delkapitlene, så den regnes én gang. */
  private inputHash(): Promise<string> {
    this.hash ??= subchapterInputHash(noGoals, DEMO_NOTE_TEXT);
    return this.hash;
  }

  private course(): Course | null {
    if (!this.demo) return null;
    const { id, code, name, learningOutcomes, examForm } = this.demo.course;
    return { id, code, name, learningOutcomes, examForm };
  }

  async listCourses(): Promise<ReadResult<Course[]>> {
    const course = this.course();
    return course ? ok([course]) : unavailable;
  }

  async getCourse(id: string): Promise<ReadResult<Course | null>> {
    const course = this.course();
    if (!course) return unavailable;
    return ok(course.id === id ? course : null);
  }

  async getActiveCourse(): Promise<ReadResult<Course | null>> {
    const course = this.course();
    return course ? ok(course) : unavailable;
  }

  async listChapters(courseId: string): Promise<ReadResult<Chapter[]>> {
    if (!this.demo) return unavailable;
    if (courseId !== this.demo.course.id) return ok([]);
    return ok(
      this.demo.chapters.map((chapter) => ({
        id: `demo-kapittel-${chapter.number}`,
        number: chapter.number,
        title: chapter.title,
        ...noGoals,
        subchapters: chapter.subchapters.map((sub) => ({
          id: sub.id,
          number: sub.number,
          title: sub.title,
          noteText: DEMO_NOTE_TEXT,
        })),
      })),
    );
  }

  async listSummaryVersions(subchapterIds: string[]): Promise<ReadResult<SubchapterSummaries[]>> {
    if (!this.demo) return unavailable;
    const inputHash = await this.inputHash();
    return ok(
      subchapterIds.map((subchapterId) => {
        const sub = this.subchapters.get(subchapterId);
        const version: SummaryVersion | null = sub
          ? {
              id: `${sub.id}-sammendrag`,
              subchapterId,
              status: "klart",
              text: sub.summary,
              modelId: DEMO_MODEL_ID,
              promptVersion: DEMO_PROMPT_VERSION,
              inputHash,
              error: null,
              createdAt: DEMO_CREATED_AT,
            }
          : null;
        return { subchapterId, latest: version, latestReady: version };
      }),
    );
  }

  async listQuestionBanks(subchapterIds: string[]): Promise<ReadResult<SubchapterQuestionBanks[]>> {
    if (!this.demo) return unavailable;
    const inputHash = await this.inputHash();
    return ok(
      subchapterIds.map((subchapterId) => {
        const sub = this.subchapters.get(subchapterId);
        const version: QuestionBankVersion | null = sub
          ? {
              id: `${sub.id}-bank`,
              subchapterId,
              status: "klart",
              modelId: DEMO_MODEL_ID,
              promptVersion: DEMO_PROMPT_VERSION,
              inputHash,
              contentHash: "",
              error: null,
              createdAt: DEMO_CREATED_AT,
            }
          : null;
        return { subchapterId, latest: version, latestReady: version };
      }),
    );
  }

  async listQuizBank(subchapterId: string): Promise<ReadResult<QuizQuestion[]>> {
    if (!this.demo) return unavailable;
    const sub = this.subchapters.get(subchapterId);
    return ok(
      (sub?.questions ?? []).map((q) => ({
        id: q.id,
        themeId: q.themeId,
        question: q.question,
        options: [...q.options],
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      })),
    );
  }

  async listQuizzes() {
    return this.demo ? ok([]) : unavailable;
  }

  async listCompletions() {
    return this.demo ? ok([]) : unavailable;
  }

  async listQuestionReports() {
    return this.demo ? ok([]) : unavailable;
  }

  async listSummaryReports() {
    return this.demo ? ok([]) : unavailable;
  }

  // Demoen lagrer ingenting.
  async createCourse() {
    return unavailable;
  }
  async updateCourse() {
    return unavailable;
  }
  async deleteCourse() {
    return unavailable;
  }
  async setActiveCourse() {
    return unavailable;
  }
  async saveChapter() {
    return unavailable;
  }
  async addSummaryVersion() {
    return unavailable;
  }
  async addQuestionBank() {
    return unavailable;
  }
  async createQuiz() {
    return unavailable;
  }
  async answerQuizItem() {
    return unavailable;
  }
  async replaceQuizItem() {
    return unavailable;
  }
  async saveQuizResult() {
    return unavailable;
  }
  async reportQuizItem() {
    return unavailable;
  }
  async reportSummaryVersion() {
    return unavailable;
  }
}
