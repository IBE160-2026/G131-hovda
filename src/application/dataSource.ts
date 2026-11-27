// Porten for eierens data. Brukstilfellene og sidene kjenner bare denne, ikke Supabase (AD-1).
// En DataSource gjelder alltid én eier, som komposisjonsroten har verifisert.
import type { ChapterChange, ChapterInput, SubchapterChange } from "@/domain/chapter";
import type { CourseInput } from "@/domain/course";
import type { QuestionBankStatus } from "@/domain/questionBank";
import type { QuizItemState } from "@/domain/quiz";
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

/** Et aktivt spørsmål i banken, slik quizen viser det. */
export type QuizQuestion = {
  id: string;
  themeId: string;
  question: string;
  /** Fire alternativer. */
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type QuizStatus = "pågår" | "ferdig";

/** Et element i en quiz: spørsmålet på en posisjon, og svaret når det er gitt. */
export type QuizItem = {
  id: string;
  position: number;
  status: QuizItemState["status"];
  /** Spørsmålet slik det er lagret, også om banken senere har fått en ny versjon. */
  question: QuizQuestion;
  /** Om spørsmålet er trukket tilbake fra banken, for eksempel fordi det er meldt som feil (1.9a). */
  questionRetired: boolean;
  /** `null` når elementet ikke er besvart. */
  chosenIndex: number | null;
  correct: boolean | null;
  /** ISO-tidspunkt i UTC, `null` når elementet ikke er besvart. */
  answeredAt: string | null;
  /** Når spørsmålet ble valgt til quizen. ISO-tidspunkt i UTC. */
  createdAt: string;
};

/** En quiz med alle elementene, også de erstattede, sortert på posisjon og så tidspunkt. */
export type Quiz = {
  id: string;
  sessionId: string;
  subchapterId: string;
  status: QuizStatus;
  /** Satt når quizen er ferdig. */
  correctCount: number | null;
  total: number | null;
  carryThemeId: string | null;
  createdAt: string;
  finishedAt: string | null;
  items: QuizItem[];
};

export type NewQuiz = { subchapterId: string; questionIds: string[] };

/** Resultatet `finishQuiz` lagrer. `completes` sier om delkapittelet krysses av (`isCompleted`). */
export type QuizResultInput = { correctCount: number; carryThemeId: string | null; completes: boolean };

/**
 * At delkapittelet er gjennomført (AD-13): quizen som krysset det av, og når. Det finnes én per
 * delkapittel, og den angres aldri.
 */
export type SubchapterCompletion = {
  subchapterId: string;
  quizId: string;
  /** ISO-tidspunkt i UTC. */
  completedAt: string;
};

/** Et spørsmål eieren har meldt som feil (1.9a), slik importen lister det. */
export type QuestionReport = {
  subchapterId: string;
  question: string;
  /** Navnet på temaet. */
  theme: string;
  /** `null` når eieren ikke skrev noen kommentar. */
  comment: string | null;
  /** ISO-tidspunkt i UTC. */
  reportedAt: string;
};

/** Et sammendrag eieren har meldt som feil (1.9b). Rapporten gjelder én versjon. */
export type SummaryReport = {
  subchapterId: string;
  summaryVersionId: string;
  /** `null` når eieren ikke skrev noen kommentar. */
  comment: string | null;
  /** ISO-tidspunkt i UTC. */
  reportedAt: string;
};

/**
 * Studieplanen for et emne (FR-3 del 2, AD-15): eksamensdatoen, planstart og øyeblikksbildet ved
 * planstart. Ett emne har én plan. Datoene er rene datoer, `ÅÅÅÅ-MM-DD`.
 */
export type StudyPlan = {
  courseId: string;
  examDate: string;
  planStart: string;
  /** Aktive delkapitler gjennomført før planstart. */
  g0: number;
  /** Aktive delkapitler som ikke var gjennomført ved planstart. */
  r0: number;
  /** Studiedager fra og med planstart til og med dagen før eksamensdatoen. */
  d: number;
};

/**
 * Et gjennomgangsspørsmål for hele kapittelet (FR-27, AD-6). ID-en er stabil, og spørsmålet trekkes
 * tilbake med status i stedet for å slettes.
 */
export type ReviewQuestion = {
  id: string;
  chapterId: string;
  /** Plassen i notatfila, fra 1. Gjelder de aktive. */
  position: number;
  text: string;
  status: "aktiv" | "trukket";
};

/** Hva `syncReviewQuestions` gjorde. */
export type ReviewQuestionSync = {
  /** Aktive spørsmål etterpå, det vil si spørsmålene i fila. */
  active: number;
  /** Nye spørsmål, også tilbaketrukne som ble aktive igjen. */
  added: number;
  /** Aktive spørsmål som ble trukket tilbake, fordi de ikke står i fila lenger. */
  retired: number;
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
  /**
   * De aktive spørsmålene i siste klare versjon av spørsmålsbanken, i bankens rekkefølge. Tom når
   * delkapittelet ikke har noen klar bank eller ikke er eierens.
   */
  listQuizBank(subchapterId: string): Promise<ReadResult<QuizQuestion[]>>;
  /** Quizene på delkapittelet med elementene, nyeste først. */
  listQuizzes(subchapterId: string): Promise<ReadResult<Quiz[]>>;
  /**
   * Oppretter en ny økt, en quiz som `pågår` og ett element per spørsmål på posisjon 1, 2 og så
   * videre. `duplicate` når delkapittelet alt har en quiz i gang. Bare `startQuiz` kaller denne.
   */
  createQuiz(quiz: NewQuiz): Promise<WriteResult<Quiz>>;
  /**
   * Lagrer svaret på et aktivt, ubesvart element. `false` når elementet alt er besvart eller ikke
   * finnes, og da er ingenting endret. Bare `answerQuiz` kaller denne.
   */
  answerQuizItem(itemId: string, chosenIndex: number, correct: boolean): Promise<WriteResult<boolean>>;
  /**
   * Markerer et aktivt, ubesvart element som `erstattet` og lager et nytt med spørsmålet på samme
   * posisjon. `false` når elementet ikke kan erstattes, og da er ingenting endret.
   */
  replaceQuizItem(itemId: string, questionId: string): Promise<WriteResult<boolean>>;
  /**
   * Setter en quiz som `pågår` til `ferdig` med resultatet, som så aldri endres, og krysser av
   * delkapittelet når `completes` er sann, i samme transaksjon. Totalen er antallet aktive elementer
   * (de som teller), og settes av datakilden. Er delkapittelet alt krysset av, beholdes den første
   * avkrysningen. `false` når quizen alt er ferdig eller ikke finnes, og da er ingenting endret.
   * Feiler lagringen, er ingenting lagret. Bare `finishQuiz` kaller denne.
   */
  saveQuizResult(quizId: string, result: QuizResultInput): Promise<WriteResult<boolean>>;
  /**
   * Avkrysningene for delkapitlene, i samme rekkefølge som `subchapterIds`, men bare for dem som er
   * krysset av. Delkapitler som ikke er eierens, gir ingen.
   */
  listCompletions(subchapterIds: string[]): Promise<ReadResult<SubchapterCompletion[]>>;
  /**
   * Melder spørsmålet i elementet som feil, i én transaksjon (1.9a): rapporten lagres (én per
   * spørsmål, så å melde på nytt ikke endrer den), spørsmålet trekkes tilbake fra banken, og når
   * quizen pågår og elementet er aktivt, får elementet status `trukket`. `comment` er trimmet, maks
   * 500 tegn, eller `null`. `false` når elementet ikke finnes, og da er ingenting endret. Bare
   * `reportQuizQuestion` kaller denne.
   */
  reportQuizItem(itemId: string, comment: string | null): Promise<WriteResult<boolean>>;
  /** Spørsmålene som er meldt som feil i delkapitlene, eldste først. */
  listQuestionReports(subchapterIds: string[]): Promise<ReadResult<QuestionReport[]>>;
  /**
   * Melder sammendragsversjonen som feil (1.9b). Én rapport per versjon, så å melde på nytt endrer
   * ingenting. Versjonen endres ikke. `comment` er trimmet, maks 500 tegn, eller `null`. `false` når
   * versjonen ikke finnes eller ikke er eierens, og da er ingenting lagret. Bare `reportSummary`
   * kaller denne.
   */
  reportSummaryVersion(versionId: string, comment: string | null): Promise<WriteResult<boolean>>;
  /**
   * Rapportene for alle versjonene av sammendragene i delkapitlene, eldste først. Om en rapport
   * gjelder siste klare versjon, avgjør den som leser.
   */
  listSummaryReports(subchapterIds: string[]): Promise<ReadResult<SummaryReport[]>>;
  /** Studieplanen for emnet. `null` når emnet ikke har noen plan, ikke finnes eller ikke er eierens. */
  getStudyPlan(courseId: string): Promise<ReadResult<StudyPlan | null>>;
  /**
   * Lagrer planen for emnet. Finnes det alt en plan, erstattes den (én plan per emne).
   * Bare `startPlan` kaller denne.
   */
  saveStudyPlan(plan: StudyPlan): Promise<WriteResult<StudyPlan>>;
  /**
   * Alle gjennomgangsspørsmålene i kapittelet: de aktive i rekkefølge, og så de tilbaketrukne.
   * Tom når kapittelet ikke har noen eller ikke er eierens.
   */
  listReviewQuestions(chapterId: string): Promise<ReadResult<ReviewQuestion[]>>;
  /**
   * Gjør `texts` (i filens rekkefølge, uten doble) til kapittelets aktive gjennomgangsspørsmål, i én
   * transaksjon. Spørsmål gjenkjennes på normalisert tekst (`normalizeReviewQuestion`): et aktivt
   * spørsmål beholder ID-en og får ny plass, et tilbaketrukket blir aktivt igjen, og ellers lages et
   * nytt. Aktive spørsmål som ikke er med, trekkes tilbake. Ingenting slettes. `unavailable` når
   * kapittelet ikke finnes eller ikke er eierens, og da er ingenting endret. Bare `importChapter`
   * kaller denne.
   */
  syncReviewQuestions(chapterId: string, texts: string[]): Promise<WriteResult<ReviewQuestionSync>>;
}
