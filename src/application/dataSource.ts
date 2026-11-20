// Porten for eierens data. Brukstilfellene og sidene kjenner bare denne, ikke Supabase (AD-1).
// En DataSource gjelder alltid én eier, som komposisjonsroten har verifisert.
import type { ChapterChange, ChapterInput, SubchapterChange } from "@/domain/chapter";
import type { CourseInput } from "@/domain/course";
import type { QuestionBankStatus } from "@/domain/questionBank";
import type { SummaryStatus } from "@/domain/summary";

export type Course = CourseInput & { id: string };

export type Subchapter = { id: string; number: string; title: string; noteText: string };

/** Et kapittel med de aktive delkapitlene i rekkefølge (fjernede er ikke med). */
export type Chapter = Omit<ChapterInput, "subchapters"> & { id: string; subchapters: Subchapter[] };

/** Hva `saveChapter` gjorde. Delkapitlene står i filens rekkefølge, og fjernede til slutt. */
export type SaveChapterReport = {
  chapter: ChapterChange;
  subchapters: { number: string; change: SubchapterChange }[];
};

/** En versjon av sammendraget for et delkapittel (AD-8). Versjoner endres ikke etter at de er lagret. */
export type SummaryVersion = {
  id: string;
  subchapterId: string;
  status: SummaryStatus;
  /** Teksten når statusen er `klart`. */
  text: string | null;
  modelId: string;
  promptVersion: string;
  inputHash: string;
  /** Årsaken når statusen er `feilet`. */
  error: string | null;
  /** ISO-tidspunkt i UTC. */
  createdAt: string;
};

/** En ny versjon fra importen. Importen lagrer bare `klart`. */
export type NewSummaryVersion = {
  subchapterId: string;
  modelId: string;
  promptVersion: string;
  inputHash: string;
} & ({ status: "klart"; text: string } | { status: "feilet"; error: string });

/** Siste versjon og siste klare versjon for ett delkapittel. `null` når det ikke finnes noen. */
export type SubchapterSummaries = {
  subchapterId: string;
  latest: SummaryVersion | null;
  latestReady: SummaryVersion | null;
};

/**
 * En versjon av spørsmålsbanken for et delkapittel (AD-8). Temaene og spørsmålene hører til
 * versjonen og leses først av quizen (1.7).
 */
export type QuestionBankVersion = {
  id: string;
  subchapterId: string;
  status: QuestionBankStatus;
  modelId: string;
  promptVersion: string;
  inputHash: string;
  /** Hashen av temaene og spørsmålene, så importen ser om banken i innholdsfilen er den samme. */
  contentHash: string;
  /** Årsaken når statusen er `feilet`. */
  error: string | null;
  /** ISO-tidspunkt i UTC. */
  createdAt: string;
};

/** Et nytt quizspørsmål fra innholdsfilen. */
export type NewQuizQuestion = {
  question: string;
  /** Fire alternativer. */
  options: string[];
  correctIndex: number;
  explanation: string;
  /** Navnet på et tema i `themes`. */
  theme: string;
  /** Nummeret i `## Spørsmålsbank` for eierens egne spørsmål, ellers `null`. */
  sourceNumber: number | null;
  /** Originalteksten for et omskrevet Ja/Nei-spørsmål, ellers `null`. */
  originalText: string | null;
};

/** En hel ny spørsmålsbank fra importen: temalisten og spørsmålene i filens rekkefølge. */
export type NewQuestionBank = {
  subchapterId: string;
  modelId: string;
  promptVersion: string;
  inputHash: string;
  contentHash: string;
  themes: string[];
  questions: NewQuizQuestion[];
};

/** Siste versjon og siste klare versjon av spørsmålsbanken for ett delkapittel. */
export type SubchapterQuestionBanks = {
  subchapterId: string;
  latest: QuestionBankVersion | null;
  latestReady: QuestionBankVersion | null;
};

export type Unavailable = { status: "unavailable" };

export type ReadResult<T> = { status: "ok"; value: T } | Unavailable;

// `duplicate`: eieren har allerede et emne med samme kode (uansett store/små bokstaver).
export type WriteResult<T = void> =
  | { status: "ok"; value: T }
  | { status: "duplicate" }
  | Unavailable;

export interface DataSource {
  /** Eierens emner, sortert på kode. */
  listCourses(): Promise<ReadResult<Course[]>>;
  /** `null` når emnet ikke finnes eller ikke er eierens. */
  getCourse(id: string): Promise<ReadResult<Course | null>>;
  createCourse(input: CourseInput): Promise<WriteResult<Course>>;
  /** `null` når emnet ikke finnes eller ikke er eierens. */
  updateCourse(id: string, input: CourseInput): Promise<WriteResult<Course | null>>;
  deleteCourse(id: string): Promise<WriteResult>;
  getActiveCourse(): Promise<ReadResult<Course | null>>;
  setActiveCourse(id: string | null): Promise<WriteResult>;
  /** Kapitlene i emnet, sortert på nummer, med aktive delkapitler i rekkefølge. */
  listChapters(courseId: string): Promise<ReadResult<Chapter[]>>;
  /**
   * Lagrer kapittelet i emnet: oppretter, oppdaterer bare endrede felt, merker delkapitler som er
   * borte fra filen, som fjernet, og gjør fjernede aktive igjen når de kommer tilbake. Uendrede
   * rader røres ikke. Bare `importChapter` kaller denne.
   */
  saveChapter(courseId: string, chapter: ChapterInput): Promise<WriteResult<SaveChapterReport>>;
  /**
   * Siste versjon og siste klare versjon av sammendraget for hvert av delkapitlene, i samme
   * rekkefølge som `subchapterIds`. Delkapitler som ikke er eierens, gir ingen versjoner.
   */
  listSummaryVersions(subchapterIds: string[]): Promise<ReadResult<SubchapterSummaries[]>>;
  /** Lagrer en ny versjon av sammendraget. Bare `importChapter` kaller denne. */
  addSummaryVersion(version: NewSummaryVersion): Promise<WriteResult<SummaryVersion>>;
  /**
   * Siste versjon og siste klare versjon av spørsmålsbanken for hvert av delkapitlene, i samme
   * rekkefølge som `subchapterIds`. Delkapitler som ikke er eierens, gir ingen versjoner.
   */
  listQuestionBanks(subchapterIds: string[]): Promise<ReadResult<SubchapterQuestionBanks[]>>;
  /**
   * Lagrer en ny spørsmålsbank: versjonen som `lages`, temaene (eksisterende temaer med samme navn
   * gjenbrukes), spørsmålene, og til slutt versjonen som `klart`. Feiler lagringen underveis, settes
   * versjonen til `feilet` og svaret er `unavailable`. Bare `importChapter` kaller denne.
   */
  addQuestionBank(bank: NewQuestionBank): Promise<WriteResult<QuestionBankVersion>>;
}
