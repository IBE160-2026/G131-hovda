// Datakilden i demoen (FR-26, AD-3, NFR-5). Leser den frosne demofila i nettleseren. Fila valideres
// med samme skjema som eksporten bruker. Er den ugyldig, gir alle lesinger og skrivinger `unavailable`.
//
// Quizene, elementene og avkrysningene i besøket (2.3) ligger i minnet og speiles etter hver skriving
// til lageret komposisjonsroten gir (`sessionStorage` i nettleseren), under én nøkkel. Reglene er de
// samme som i `MemoryDataSource`. Ugyldig, utdatert eller ulesbar tilstand, eller ID-er som ikke finnes
// i demofila, gir en ny, tom tilstand. Kaster lageret, fortsetter demoen bare i minnet. Emner,
// kapitler, sammendrag, banker og feilrapporter lagres aldri.
//
// Fila har ingen notater eller hasher. Hvert delkapittel får derfor en fast plassholdertekst som
// notat, og sammendraget og banken får hashen av den, så de uendrede brukstilfellene gir «klart».
//
// Studieplanen (3.4) regnes ut fra de faste planinndataene i fila med `planSnapshot`. Demoen har ingen
// avkrysninger før planstart, så G₀ er 0. Tidspunktene i besøket ligger på demo-dagen.
import type {
  Chapter,
  Course,
  DataSource,
  NewQuiz,
  QuestionBankVersion,
  Quiz,
  QuizItem,
  QuizQuestion,
  QuizResultInput,
  ReadResult,
  StudyPlan,
  SubchapterCompletion,
  SubchapterQuestionBanks,
  SubchapterSummaries,
  SummaryVersion,
  Unavailable,
  WriteResult,
} from "@/application/dataSource";
import {
  DEMO_PLAN,
  validateDemoData,
  type DemoData,
  type DemoQuestion,
  type DemoSubchapter,
} from "@/application/demoData";
import { subchapterInputHash } from "@/application/summaryHash";
import { planSnapshot } from "@/domain/studyPlan";

/** Lageret tilstanden speiles til. `sessionStorage` i nettleseren. */
export type DemoStorage = Pick<Storage, "getItem" | "setItem">;

/** Nøkkelen tilstanden lagres under. */
export const DEMO_STATE_KEY = "studievenn-demo";

type StoredQuiz = Omit<Quiz, "items">;
type StoredQuizItem = Omit<QuizItem, "question" | "questionRetired"> & { quizId: string; questionId: string };

/** Det den besøkende har gjort i besøket. `tick` gir tidspunktene, `nextId` ID-ene. */
type DemoState = {
  version: 1;
  tick: number;
  nextId: number;
  quizzes: StoredQuiz[];
  items: StoredQuizItem[];
  completions: SubchapterCompletion[];
};

const emptyState = (): DemoState => ({ version: 1, tick: 0, nextId: 1, quizzes: [], items: [], completions: [] });

/** Midnatt UTC for demo-dagen `today`. I Oslo er det samme dato, kl. 01 på normaltid. */
const startOfDay = (today: string) => `${today}T00:00:00.000Z`;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNat = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const isNullable = <T>(v: unknown, check: (x: unknown) => x is T): boolean => v === null || check(v);
const isBool = (v: unknown): v is boolean => typeof v === "boolean";

/**
 * Tilstanden i `raw`, eller `null` når den er ugyldig, har en annen versjon eller viser til ID-er
 * som ikke finnes i demofila. `subchapters` er delkapitlene i fila, `startMs` starten av demo-dagen.
 */
function parseState(raw: string, subchapters: ReadonlyMap<string, DemoSubchapter>, startMs: number): DemoState | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(value) || value.version !== 1 || !isNat(value.tick) || !isNat(value.nextId)) return null;
  const { quizzes, items, completions } = value;
  if (!Array.isArray(quizzes) || !Array.isArray(items) || !Array.isArray(completions)) return null;

  const quizSubchapter = new Map<string, string>();
  for (const q of quizzes as unknown[]) {
    if (
      !isObject(q) ||
      !isString(q.id) ||
      !isString(q.sessionId) ||
      !isString(q.subchapterId) ||
      !subchapters.has(q.subchapterId) ||
      (q.status !== "pågår" && q.status !== "ferdig") ||
      !isNullable(q.correctCount, isNat) ||
      !isNullable(q.total, isNat) ||
      !isNullable(q.carryThemeId, isString) ||
      !isString(q.createdAt) ||
      !isNullable(q.finishedAt, isString) ||
      quizSubchapter.has(q.id)
    ) {
      return null;
    }
    quizSubchapter.set(q.id, q.subchapterId);
  }
  const running = (quizzes as StoredQuiz[]).filter((q) => q.status === "pågår").map((q) => q.subchapterId);
  if (new Set(running).size !== running.length) return null;

  const itemIds = new Set<string>();
  for (const i of items as unknown[]) {
    if (
      !isObject(i) ||
      !isString(i.id) ||
      itemIds.has(i.id) ||
      !isString(i.quizId) ||
      !isString(i.questionId) ||
      !Number.isSafeInteger(i.position) ||
      (i.position as number) < 1 ||
      (i.status !== "aktiv" && i.status !== "erstattet" && i.status !== "trukket") ||
      !isNullable(i.chosenIndex, isNat) ||
      !isNullable(i.correct, isBool) ||
      !isNullable(i.answeredAt, isString) ||
      !isString(i.createdAt)
    ) {
      return null;
    }
    const subchapterId = quizSubchapter.get(i.quizId);
    const sub = subchapterId ? subchapters.get(subchapterId) : undefined;
    const question = sub?.questions.find((q) => q.id === i.questionId);
    if (!question || (i.chosenIndex !== null && (i.chosenIndex as number) >= question.options.length)) return null;
    itemIds.add(i.id);
  }

  const completed = new Set<string>();
  for (const c of completions as unknown[]) {
    if (
      !isObject(c) ||
      !isString(c.subchapterId) ||
      !isString(c.quizId) ||
      !isString(c.completedAt) ||
      quizSubchapter.get(c.quizId) !== c.subchapterId ||
      completed.has(c.subchapterId)
    ) {
      return null;
    }
    completed.add(c.subchapterId);
  }

  // Telleren må gå forbi alle lagrede tidspunkter, så neste skriving blir nyest.
  const stamps = [
    ...(quizzes as StoredQuiz[]).flatMap((q) => [q.createdAt, q.finishedAt]),
    ...(items as StoredQuizItem[]).flatMap((i) => [i.createdAt, i.answeredAt]),
    ...(completions as SubchapterCompletion[]).map((c) => c.completedAt),
  ].flatMap((s) => (s === null ? [] : [Date.parse(s)]));
  if (stamps.some((ms) => Number.isNaN(ms))) return null;
  const tick = Math.max(value.tick, ...stamps.map((ms) => ms - startMs + 1));

  return {
    version: 1,
    tick,
    nextId: value.nextId,
    quizzes: quizzes as StoredQuiz[],
    items: items as StoredQuizItem[],
    completions: completions as SubchapterCompletion[],
  };
}

/** Notatet hvert delkapittel får i demoen. Det er ikke plassholderen for manglende notater. */
export const DEMO_NOTE_TEXT = "Notatet er ikke med i demoen.";

const DEMO_MODEL_ID = "demo";
const DEMO_PROMPT_VERSION = "demo";

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
  private readonly storage: DemoStorage | null;
  /** Lest fra lageret første gang den trengs. */
  private loaded: DemoState | null = null;
  /** Demo-dagen fra fila (`ÅÅÅÅ-MM-DD`), eller `DEMO_PLAN.today` når fila er ugyldig. `DemoClock` bruker den. */
  readonly today: string;
  /** Tidspunktet versjonene får, og starten for tidspunktene i besøket. Fila har ingen tidspunkter. */
  private readonly createdAt: string;
  private readonly startMs: number;

  /** `storage` er lageret tilstanden speiles til. Uten det ligger den bare i minnet. */
  constructor(input: unknown, storage?: DemoStorage | null) {
    const validation = validateDemoData(input);
    this.demo = validation.ok ? validation.value : null;
    for (const chapter of this.demo?.chapters ?? []) {
      for (const sub of chapter.subchapters) this.subchapters.set(sub.id, sub);
    }
    this.storage = storage ?? null;
    this.today = this.demo?.plan.today ?? DEMO_PLAN.today;
    this.createdAt = startOfDay(this.today);
    this.startMs = Date.parse(this.createdAt);
  }

  /** Tilstanden i besøket. Ugyldig eller ulesbar tilstand i lageret gir en ny, tom tilstand. */
  private state(): DemoState {
    if (this.loaded) return this.loaded;
    let raw: string | null = null;
    try {
      raw = this.storage?.getItem(DEMO_STATE_KEY) ?? null;
    } catch {
      raw = null;
    }
    const parsed = raw === null ? null : parseState(raw, this.subchapters, this.startMs);
    this.loaded = parsed ?? emptyState();
    return this.loaded;
  }

  /** Speiler tilstanden til lageret. Kaster lageret, fortsetter demoen bare i minnet. */
  private save(): void {
    try {
      this.storage?.setItem(DEMO_STATE_KEY, JSON.stringify(this.state()));
    } catch {
      // Privat modus eller fullt lager: tilstanden står i minnet.
    }
  }

  /** Et tidspunkt som øker for hver skriving (starten av demo-dagen + teller), så «nyest» er entydig. */
  private now(): string {
    const state = this.state();
    return new Date(this.startMs + state.tick++).toISOString();
  }

  /** En ny ID med `prefix` som ikke er brukt. */
  private newId(prefix: string): string {
    const state = this.state();
    const taken = new Set([...state.quizzes.flatMap((q) => [q.id, q.sessionId]), ...state.items.map((i) => i.id)]);
    let id: string;
    do id = `demo-${prefix}${state.nextId++}`;
    while (taken.has(id));
    return id;
  }

  private question(subchapterId: string, questionId: string): DemoQuestion | undefined {
    return this.subchapters.get(subchapterId)?.questions.find((q) => q.id === questionId);
  }

  private toQuiz(stored: StoredQuiz): Quiz {
    const items = this.state()
      .items.filter((i) => i.quizId === stored.id)
      .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
      .map((i): QuizItem => {
        const q = this.question(stored.subchapterId, i.questionId)!;
        return {
          id: i.id,
          position: i.position,
          status: i.status,
          question: {
            id: q.id,
            themeId: q.themeId,
            question: q.question,
            options: [...q.options],
            correctIndex: q.correctIndex,
            explanation: q.explanation,
          },
          questionRetired: false,
          chosenIndex: i.chosenIndex,
          correct: i.correct,
          answeredAt: i.answeredAt,
          createdAt: i.createdAt,
        };
      });
    return {
      id: stored.id,
      sessionId: stored.sessionId,
      subchapterId: stored.subchapterId,
      status: stored.status,
      correctCount: stored.correctCount,
      total: stored.total,
      carryThemeId: stored.carryThemeId,
      createdAt: stored.createdAt,
      finishedAt: stored.finishedAt,
      items,
    };
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
              createdAt: this.createdAt,
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
              createdAt: this.createdAt,
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

  async listQuizzes(subchapterId: string): Promise<ReadResult<Quiz[]>> {
    if (!this.demo) return unavailable;
    return ok(
      this.state()
        .quizzes.filter((q) => q.subchapterId === subchapterId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((q) => this.toQuiz(q)),
    );
  }

  async listCompletions(subchapterIds: string[]): Promise<ReadResult<SubchapterCompletion[]>> {
    if (!this.demo) return unavailable;
    const { completions } = this.state();
    return ok(
      subchapterIds.flatMap((id) => {
        const completion = completions.find((c) => c.subchapterId === id);
        return completion ? [{ ...completion }] : [];
      }),
    );
  }

  async listQuestionReports() {
    return this.demo ? ok([]) : unavailable;
  }

  async listSummaryReports() {
    return this.demo ? ok([]) : unavailable;
  }

  /**
   * Planen med de faste datoene i fila. Øyeblikksbildet regnes som i `startPlan`, over alle
   * delkapitlene i fila og uten avkrysninger før planstart, så G₀ er 0 og R₀ antall delkapitler.
   */
  async getStudyPlan(courseId: string): Promise<ReadResult<StudyPlan | null>> {
    if (!this.demo) return unavailable;
    if (courseId !== this.demo.course.id) return ok(null);
    const { examDate, planStart } = this.demo.plan;
    const snapshot = planSnapshot({ activeSubchapterIds: [...this.subchapters.keys()], completions: [], planStart, examDate });
    return ok({ courseId, examDate, planStart, ...snapshot });
  }

  /** Som `MemoryDataSource`: alle elementene får samme tidspunkt, som `now()` i én transaksjon. */
  async createQuiz(input: NewQuiz): Promise<WriteResult<Quiz>> {
    if (!this.demo) return unavailable;
    // Et ukjent delkapittel eller spørsmål ville brutt fremmednøklene i databasen.
    if (!this.subchapters.has(input.subchapterId)) return unavailable;
    if (input.questionIds.some((id) => !this.question(input.subchapterId, id))) return unavailable;
    const state = this.state();
    if (state.quizzes.some((q) => q.subchapterId === input.subchapterId && q.status === "pågår")) {
      return { status: "duplicate" };
    }
    const startedAt = this.now();
    const quiz: StoredQuiz = {
      id: this.newId("z"),
      sessionId: this.newId("o"),
      subchapterId: input.subchapterId,
      status: "pågår",
      correctCount: null,
      total: null,
      carryThemeId: null,
      createdAt: startedAt,
      finishedAt: null,
    };
    state.quizzes.push(quiz);
    input.questionIds.forEach((questionId, i) => {
      state.items.push({
        id: this.newId("i"),
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
    this.save();
    return { status: "ok", value: this.toQuiz(quiz) };
  }

  async answerQuizItem(itemId: string, chosenIndex: number, correct: boolean): Promise<WriteResult<boolean>> {
    if (!this.demo) return unavailable;
    const item = this.state().items.find((i) => i.id === itemId);
    if (!item || item.status !== "aktiv" || item.answeredAt !== null) return { status: "ok", value: false };
    Object.assign(item, { chosenIndex, correct, answeredAt: this.now() });
    this.save();
    return { status: "ok", value: true };
  }

  async replaceQuizItem(itemId: string, questionId: string): Promise<WriteResult<boolean>> {
    if (!this.demo) return unavailable;
    const state = this.state();
    const item = state.items.find((i) => i.id === itemId);
    if (!item || item.status !== "aktiv" || item.answeredAt !== null) return { status: "ok", value: false };
    const quiz = state.quizzes.find((q) => q.id === item.quizId)!;
    if (!this.question(quiz.subchapterId, questionId)) return unavailable;
    item.status = "erstattet";
    state.items.push({
      id: this.newId("i"),
      quizId: item.quizId,
      questionId,
      position: item.position,
      status: "aktiv",
      chosenIndex: null,
      correct: null,
      answeredAt: null,
      createdAt: this.now(),
    });
    this.save();
    return { status: "ok", value: true };
  }

  /** Som `finish_quiz`: resultatet og avkrysningen lagres sammen. Den første avkrysningen står. */
  async saveQuizResult(quizId: string, { correctCount, carryThemeId, completes }: QuizResultInput): Promise<WriteResult<boolean>> {
    if (!this.demo) return unavailable;
    const state = this.state();
    const quiz = state.quizzes.find((q) => q.id === quizId);
    if (!quiz || quiz.status !== "pågår") return { status: "ok", value: false };
    const finishedAt = this.now();
    const total = state.items.filter((i) => i.quizId === quizId && i.status === "aktiv").length;
    Object.assign(quiz, { status: "ferdig", correctCount, total, carryThemeId, finishedAt });
    if (completes && !state.completions.some((c) => c.subchapterId === quiz.subchapterId)) {
      state.completions.push({ subchapterId: quiz.subchapterId, quizId, completedAt: finishedAt });
    }
    this.save();
    return { status: "ok", value: true };
  }

  // Demoen lagrer aldri emner, kapitler, sammendrag, banker, feilrapporter eller studieplaner.
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
  async reportQuizItem() {
    return unavailable;
  }
  async reportSummaryVersion() {
    return unavailable;
  }
  async saveStudyPlan() {
    return unavailable;
  }
}
