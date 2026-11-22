import type { SupabaseClient } from "@supabase/supabase-js";
import {
  chapterChanges,
  planSubchapters,
  subchapterChangeOf,
  type ChapterInput,
  type StoredChapterFields,
  type StoredSubchapter,
  type SubchapterFields,
} from "@/domain/chapter";
import type { CourseInput } from "@/domain/course";
import type {
  Chapter,
  Course,
  DataSource,
  NewQuestionBank,
  NewQuiz,
  NewSummaryVersion,
  QuestionBankVersion,
  QuestionReport,
  Quiz,
  QuizItem,
  QuizQuestion,
  QuizResultInput,
  QuizStatus,
  ReadResult,
  SaveChapterReport,
  SubchapterCompletion,
  SubchapterQuestionBanks,
  SubchapterSummaries,
  SummaryReport,
  SummaryVersion,
  Unavailable,
  WriteResult,
} from "@/application/dataSource";
import type { QuestionBankStatus } from "@/domain/questionBank";
import type { SummaryStatus } from "@/domain/summary";

// Bare den delen av Supabase-klienten som adapteren bruker, så testene kan bruke en falsk klient.
export type SupabaseDataClient = Pick<SupabaseClient, "from" | "rpc">;

type PostgrestErrorLike = { code?: string } | null;

type CourseRow = {
  id: string;
  code: string;
  name: string;
  learning_outcomes: string;
  exam_form: string;
};

const courseColumns = "id, code, name, learning_outcomes, exam_form";

type ChapterRow = {
  id: string;
  number: number;
  title: string;
  learning_goals: string;
  key_concepts: string;
};

type SubchapterRow = {
  id: string;
  chapter_id: string;
  number: string;
  position: number;
  title: string;
  note_text: string;
  removed_at: string | null;
};

const chapterColumns = "id, number, title, learning_goals, key_concepts";
const subchapterColumns = "id, chapter_id, number, position, title, note_text, removed_at";

type SummaryVersionRow = {
  id: string;
  subchapter_id: string;
  status: SummaryStatus;
  text: string | null;
  model_id: string;
  prompt_version: string;
  input_hash: string;
  error: string | null;
  created_at: string;
};

const summaryVersionColumns =
  "id, subchapter_id, status, text, model_id, prompt_version, input_hash, error, created_at";

function toSummaryVersion(row: SummaryVersionRow): SummaryVersion {
  return {
    id: row.id,
    subchapterId: row.subchapter_id,
    status: row.status,
    text: row.text,
    modelId: row.model_id,
    promptVersion: row.prompt_version,
    inputHash: row.input_hash,
    error: row.error,
    createdAt: row.created_at,
  };
}

type QuestionBankVersionRow = {
  id: string;
  subchapter_id: string;
  status: QuestionBankStatus;
  model_id: string;
  prompt_version: string;
  input_hash: string;
  content_hash: string;
  error: string | null;
  created_at: string;
};

const questionBankVersionColumns =
  "id, subchapter_id, status, model_id, prompt_version, input_hash, content_hash, error, created_at";

function toQuestionBankVersion(row: QuestionBankVersionRow): QuestionBankVersion {
  return {
    id: row.id,
    subchapterId: row.subchapter_id,
    status: row.status,
    modelId: row.model_id,
    promptVersion: row.prompt_version,
    inputHash: row.input_hash,
    contentHash: row.content_hash,
    error: row.error,
    createdAt: row.created_at,
  };
}

type QuizQuestionRow = {
  id: string;
  theme_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

const quizQuestionColumns = "id, theme_id, question, options, correct_index, explanation";

function toQuizQuestion(row: QuizQuestionRow): QuizQuestion {
  return {
    id: row.id,
    themeId: row.theme_id,
    question: row.question,
    options: row.options,
    correctIndex: row.correct_index,
    explanation: row.explanation,
  };
}

type QuizItemRow = {
  id: string;
  position: number;
  status: QuizItem["status"];
  chosen_index: number | null;
  correct: boolean | null;
  answered_at: string | null;
  created_at: string;
  quiz_questions: QuizQuestionRow & { status: "aktiv" | "trukket" };
};

type QuizRow = {
  id: string;
  session_id: string;
  subchapter_id: string;
  status: QuizStatus;
  correct_count: number | null;
  total: number | null;
  carry_theme_id: string | null;
  created_at: string;
  finished_at: string | null;
  quiz_items: QuizItemRow[];
};

type CompletionRow = { subchapter_id: string; quiz_id: string; completed_at: string };

type QuestionReportRow = {
  comment: string | null;
  reported_at: string;
  quiz_questions: { subchapter_id: string; question: string; themes: { name: string } };
};

// Spørsmålet og temaet hentes med rapporten. `!inner`: bare rapporter for delkapitlene i filteret.
const questionReportColumns =
  "comment, reported_at, " +
  "quiz_questions!question_reports_question_fkey!inner(subchapter_id, question, themes!quiz_questions_theme_fkey(name))";

type SummaryReportRow = {
  summary_version_id: string;
  comment: string | null;
  reported_at: string;
  summary_versions: { subchapter_id: string };
};

// Delkapittelet hentes fra versjonen. `!inner`: bare rapporter for delkapitlene i filteret.
const summaryReportColumns =
  "summary_version_id, comment, reported_at, summary_versions!summary_reports_summary_version_fkey!inner(subchapter_id)";

// Elementene og spørsmålene hentes med quizen i én spørring. FK-navnene sier hvilken kobling som menes.
const quizColumns =
  "id, session_id, subchapter_id, status, correct_count, total, carry_theme_id, created_at, finished_at, " +
  "quiz_items!quiz_items_quiz_fkey(id, position, status, chosen_index, correct, answered_at, created_at, " +
  `quiz_questions!quiz_items_question_fkey(${quizQuestionColumns}, status))`;

function toQuiz(row: QuizRow): Quiz {
  return {
    id: row.id,
    sessionId: row.session_id,
    subchapterId: row.subchapter_id,
    status: row.status,
    correctCount: row.correct_count,
    total: row.total,
    carryThemeId: row.carry_theme_id,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    items: [...row.quiz_items]
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
      .map((item) => ({
        id: item.id,
        position: item.position,
        status: item.status,
        question: toQuizQuestion(item.quiz_questions),
        questionRetired: item.quiz_questions.status === "trukket",
        chosenIndex: item.chosen_index,
        correct: item.correct,
        answeredAt: item.answered_at,
        createdAt: item.created_at,
      })),
  };
}

/** Lagres på versjonen når temaene eller spørsmålene ikke kunne lagres. */
const BANK_SAVE_FAILED = "Fikk ikke lagret temaene eller spørsmålene.";

function toChapterFields(row: ChapterRow): StoredChapterFields {
  return { title: row.title, learningGoals: row.learning_goals, keyConcepts: row.key_concepts };
}

// Bare feltene som er med, så en oppdatering bare rører det som er endret.
function toChapterRow(fields: Partial<StoredChapterFields>) {
  return {
    ...(fields.title !== undefined && { title: fields.title }),
    ...(fields.learningGoals !== undefined && { learning_goals: fields.learningGoals }),
    ...(fields.keyConcepts !== undefined && { key_concepts: fields.keyConcepts }),
  };
}

function toSubchapterRow(fields: Partial<SubchapterFields>) {
  return {
    ...(fields.title !== undefined && { title: fields.title }),
    ...(fields.noteText !== undefined && { note_text: fields.noteText }),
    ...(fields.position !== undefined && { position: fields.position }),
  };
}

// Postgres-feilkoder: brudd på unik indeks, brudd på FK og ugyldig uuid (f.eks. /emner/abc).
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const INVALID_TEXT_REPRESENTATION = "22P02";

const unavailable: Unavailable = { status: "unavailable" };

function toCourse(row: CourseRow): Course {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    learningOutcomes: row.learning_outcomes,
    examForm: row.exam_form,
  };
}

function toRow(input: CourseInput) {
  return {
    code: input.code,
    name: input.name,
    learning_outcomes: input.learningOutcomes,
    exam_form: input.examForm,
  };
}

export function toWriteFailure(error: PostgrestErrorLike): { status: "duplicate" } | Unavailable {
  return error?.code === UNIQUE_VIOLATION ? { status: "duplicate" } : unavailable;
}

function isInvalidId(error: PostgrestErrorLike): boolean {
  return error?.code === INVALID_TEXT_REPRESENTATION;
}

// Kaster klienten (nettverksfeil o.l.), betyr det at databasen ikke svarer akkurat nå.
async function guarded<T>(run: () => Promise<T | Unavailable>): Promise<T | Unavailable> {
  try {
    return await run();
  } catch {
    return unavailable;
  }
}

/**
 * DataSource mot Supabase for én eier. RLS slipper bare gjennom eierens rader, og adapteren
 * filtrerer i tillegg på eier (AD-10).
 */
export class SupabaseDataSource implements DataSource {
  constructor(
    private readonly client: SupabaseDataClient,
    private readonly ownerId: string,
  ) {}

  listCourses(): Promise<ReadResult<Course[]>> {
    return guarded(async () => {
      const { data, error } = await this.client
        .from("courses")
        .select(courseColumns)
        .eq("owner_id", this.ownerId)
        .order("code");
      if (error || !data) return unavailable;
      return { status: "ok", value: (data as CourseRow[]).map(toCourse) };
    });
  }

  getCourse(id: string): Promise<ReadResult<Course | null>> {
    return guarded(async () => {
      const { data, error } = await this.client
        .from("courses")
        .select(courseColumns)
        .eq("owner_id", this.ownerId)
        .eq("id", id)
        .maybeSingle();
      if (isInvalidId(error)) return { status: "ok", value: null };
      if (error) return unavailable;
      return { status: "ok", value: data ? toCourse(data as CourseRow) : null };
    });
  }

  createCourse(input: CourseInput): Promise<WriteResult<Course>> {
    return guarded(async () => {
      const { data, error } = await this.client
        .from("courses")
        .insert({ owner_id: this.ownerId, ...toRow(input) })
        .select(courseColumns)
        .single();
      if (error || !data) return toWriteFailure(error);
      return { status: "ok", value: toCourse(data as CourseRow) };
    });
  }

  updateCourse(id: string, input: CourseInput): Promise<WriteResult<Course | null>> {
    return guarded(async () => {
      const { data, error } = await this.client
        .from("courses")
        .update(toRow(input))
        .eq("owner_id", this.ownerId)
        .eq("id", id)
        .select(courseColumns)
        .maybeSingle();
      if (isInvalidId(error)) return { status: "ok", value: null };
      if (error) return toWriteFailure(error);
      return { status: "ok", value: data ? toCourse(data as CourseRow) : null };
    });
  }

  deleteCourse(id: string): Promise<WriteResult> {
    return guarded(async () => {
      const { error } = await this.client
        .from("courses")
        .delete()
        .eq("owner_id", this.ownerId)
        .eq("id", id);
      // En ugyldig id peker ikke på noe emne, så det er ingenting å slette.
      if (error && !isInvalidId(error)) return unavailable;
      return { status: "ok", value: undefined };
    });
  }

  getActiveCourse(): Promise<ReadResult<Course | null>> {
    return guarded(async () => {
      const { data, error } = await this.client
        .from("user_settings")
        .select("active_course_id")
        .eq("owner_id", this.ownerId)
        .maybeSingle();
      if (error) return unavailable;
      const activeId = (data as { active_course_id: string | null } | null)?.active_course_id;
      if (!activeId) return { status: "ok", value: null };
      return this.getCourse(activeId);
    });
  }

  setActiveCourse(id: string | null): Promise<WriteResult> {
    return guarded(async () => {
      const { error } = await this.client
        .from("user_settings")
        .upsert({ owner_id: this.ownerId, active_course_id: id }, { onConflict: "owner_id" });
      if (error) return unavailable;
      return { status: "ok", value: undefined };
    });
  }

  listChapters(courseId: string): Promise<ReadResult<Chapter[]>> {
    return guarded(async () => {
      const chapters = await this.client
        .from("chapters")
        .select(chapterColumns)
        .eq("owner_id", this.ownerId)
        .eq("course_id", courseId)
        .order("number");
      if (isInvalidId(chapters.error)) return { status: "ok", value: [] };
      if (chapters.error || !chapters.data) return unavailable;
      const chapterRows = chapters.data as ChapterRow[];
      if (chapterRows.length === 0) return { status: "ok", value: [] };

      const subchapters = await this.client
        .from("subchapters")
        .select(subchapterColumns)
        .eq("owner_id", this.ownerId)
        .in(
          "chapter_id",
          chapterRows.map((c) => c.id),
        )
        .is("removed_at", null)
        .order("position");
      if (subchapters.error || !subchapters.data) return unavailable;
      const subRows = subchapters.data as SubchapterRow[];

      return {
        status: "ok",
        value: chapterRows.map((row) => ({
          ...toChapterFields(row),
          id: row.id,
          number: row.number,
          subchapters: subRows
            .filter((s) => s.chapter_id === row.id)
            .map((s) => ({ id: s.id, number: s.number, title: s.title, noteText: s.note_text })),
        })),
      };
    });
  }

  saveChapter(courseId: string, input: ChapterInput): Promise<WriteResult<SaveChapterReport>> {
    return guarded(async () => {
      const existing = await this.client
        .from("chapters")
        .select(chapterColumns)
        .eq("owner_id", this.ownerId)
        .eq("course_id", courseId)
        .eq("number", input.number)
        .maybeSingle();
      if (existing.error) return unavailable;

      let chapterId: string;
      let chapterChange: SaveChapterReport["chapter"] = "unchanged";
      let stored: StoredSubchapter[] = [];

      if (!existing.data) {
        const created = await this.client
          .from("chapters")
          .insert({
            owner_id: this.ownerId,
            course_id: courseId,
            number: input.number,
            title: input.title,
            learning_goals: input.learningGoals,
            key_concepts: input.keyConcepts,
          })
          .select("id")
          .single();
        if (created.error || !created.data) return unavailable;
        chapterId = (created.data as { id: string }).id;
        chapterChange = "created";
      } else {
        const row = existing.data as ChapterRow;
        chapterId = row.id;
        const changes = chapterChanges(toChapterFields(row), input);
        if (Object.keys(changes).length > 0) {
          const updated = await this.client
            .from("chapters")
            .update(toChapterRow(changes))
            .eq("owner_id", this.ownerId)
            .eq("id", chapterId);
          if (updated.error) return unavailable;
          chapterChange = "updated";
        }

        const subs = await this.client
          .from("subchapters")
          .select(subchapterColumns)
          .eq("owner_id", this.ownerId)
          .eq("chapter_id", chapterId);
        if (subs.error || !subs.data) return unavailable;
        stored = (subs.data as SubchapterRow[]).map((s) => ({
          id: s.id,
          number: s.number,
          position: s.position,
          title: s.title,
          noteText: s.note_text,
          removed: s.removed_at !== null,
        }));
      }

      const steps = planSubchapters(stored, input.subchapters);

      const creates = steps.flatMap((step) =>
        step.kind === "create"
          ? [{ owner_id: this.ownerId, chapter_id: chapterId, number: step.number, ...toSubchapterRow(step.fields) }]
          : [],
      );
      if (creates.length > 0) {
        const inserted = await this.client.from("subchapters").insert(creates);
        if (inserted.error) return unavailable;
      }

      for (const step of steps) {
        if (step.kind !== "update") continue;
        const updated = await this.client
          .from("subchapters")
          .update({ ...toSubchapterRow(step.changes), ...(step.restore ? { removed_at: null } : {}) })
          .eq("owner_id", this.ownerId)
          .eq("id", step.id);
        if (updated.error) return unavailable;
      }

      const removedIds = steps.flatMap((step) => (step.kind === "remove" ? [step.id] : []));
      if (removedIds.length > 0) {
        const removed = await this.client
          .from("subchapters")
          .update({ removed_at: new Date().toISOString() })
          .eq("owner_id", this.ownerId)
          .in("id", removedIds);
        if (removed.error) return unavailable;
      }

      return {
        status: "ok",
        value: {
          chapter: chapterChange,
          subchapters: steps.map((step) => ({ number: step.number, change: subchapterChangeOf(step) })),
        },
      };
    });
  }

  listSummaryVersions(subchapterIds: string[]): Promise<ReadResult<SubchapterSummaries[]>> {
    return guarded(async () => {
      let rows: SummaryVersionRow[] = [];
      if (subchapterIds.length > 0) {
        // Nyeste først, så den første raden per delkapittel er siste versjon. Alle versjonene
        // hentes, siden det er få per delkapittel.
        const { data, error } = await this.client
          .from("summary_versions")
          .select(summaryVersionColumns)
          .eq("owner_id", this.ownerId)
          .in("subchapter_id", subchapterIds)
          .order("created_at", { ascending: false });
        if (error || !data) return unavailable;
        rows = data as SummaryVersionRow[];
      }
      return {
        status: "ok",
        value: subchapterIds.map((subchapterId) => {
          const own = rows.filter((r) => r.subchapter_id === subchapterId);
          const ready = own.find((r) => r.status === "klart");
          return {
            subchapterId,
            latest: own[0] ? toSummaryVersion(own[0]) : null,
            latestReady: ready ? toSummaryVersion(ready) : null,
          };
        }),
      };
    });
  }

  addSummaryVersion(version: NewSummaryVersion): Promise<WriteResult<SummaryVersion>> {
    return guarded(async () => {
      const { data, error } = await this.client
        .from("summary_versions")
        .insert({
          owner_id: this.ownerId,
          subchapter_id: version.subchapterId,
          status: version.status,
          text: version.status === "klart" ? version.text : null,
          error: version.status === "feilet" ? version.error : null,
          model_id: version.modelId,
          prompt_version: version.promptVersion,
          input_hash: version.inputHash,
        })
        .select(summaryVersionColumns)
        .single();
      if (error || !data) return unavailable;
      return { status: "ok", value: toSummaryVersion(data as SummaryVersionRow) };
    });
  }

  listQuestionBanks(subchapterIds: string[]): Promise<ReadResult<SubchapterQuestionBanks[]>> {
    return guarded(async () => {
      let rows: QuestionBankVersionRow[] = [];
      if (subchapterIds.length > 0) {
        // Nyeste først, som for sammendragene. Bare versjonene, ikke spørsmålene.
        const { data, error } = await this.client
          .from("question_bank_versions")
          .select(questionBankVersionColumns)
          .eq("owner_id", this.ownerId)
          .in("subchapter_id", subchapterIds)
          .order("created_at", { ascending: false });
        if (error || !data) return unavailable;
        rows = data as QuestionBankVersionRow[];
      }
      return {
        status: "ok",
        value: subchapterIds.map((subchapterId) => {
          const own = rows.filter((r) => r.subchapter_id === subchapterId);
          const ready = own.find((r) => r.status === "klart");
          return {
            subchapterId,
            latest: own[0] ? toQuestionBankVersion(own[0]) : null,
            latestReady: ready ? toQuestionBankVersion(ready) : null,
          };
        }),
      };
    });
  }

  addQuestionBank(bank: NewQuestionBank): Promise<WriteResult<QuestionBankVersion>> {
    return guarded(async () => {
      const created = await this.client
        .from("question_bank_versions")
        .insert({
          owner_id: this.ownerId,
          subchapter_id: bank.subchapterId,
          status: "lages",
          model_id: bank.modelId,
          prompt_version: bank.promptVersion,
          input_hash: bank.inputHash,
          content_hash: bank.contentHash,
        })
        .select(questionBankVersionColumns)
        .single();
      if (created.error || !created.data) return unavailable;
      const versionId = (created.data as QuestionBankVersionRow).id;

      // PostgREST har ingen transaksjoner. Feiler noe etter at versjonen finnes, blir den `feilet`
      // og leses aldri som klar (AD-8).
      const fail = async (): Promise<Unavailable> => {
        try {
          await this.client
            .from("question_bank_versions")
            .update({ status: "feilet", error: BANK_SAVE_FAILED })
            .eq("owner_id", this.ownerId)
            .eq("id", versionId);
        } catch {
          // Versjonen blir stående som `lages`, som heller ikke leses som klar.
        }
        return unavailable;
      };

      try {
        // Eksisterende temaer med samme navn gjenbrukes (AD-14).
        const themes = await this.client
          .from("themes")
          .upsert(
            bank.themes.map((name) => ({ owner_id: this.ownerId, subchapter_id: bank.subchapterId, name })),
            { onConflict: "owner_id,subchapter_id,name" },
          )
          .select("id, name");
        if (themes.error || !themes.data) return await fail();
        const themeIds = new Map((themes.data as { id: string; name: string }[]).map((t) => [t.name, t.id]));
        if (bank.themes.some((name) => !themeIds.has(name))) return await fail();

        const questions = await this.client.from("quiz_questions").insert(
          bank.questions.map((q, i) => ({
            owner_id: this.ownerId,
            subchapter_id: bank.subchapterId,
            bank_version_id: versionId,
            theme_id: themeIds.get(q.theme),
            position: i + 1,
            question: q.question,
            options: q.options,
            correct_index: q.correctIndex,
            explanation: q.explanation,
            source_number: q.sourceNumber,
            rewritten: q.originalText !== null,
            original_text: q.originalText,
          })),
        );
        if (questions.error) return await fail();

        const ready = await this.client
          .from("question_bank_versions")
          .update({ status: "klart" })
          .eq("owner_id", this.ownerId)
          .eq("id", versionId)
          .select(questionBankVersionColumns)
          .single();
        if (ready.error || !ready.data) return await fail();
        return { status: "ok", value: toQuestionBankVersion(ready.data as QuestionBankVersionRow) };
      } catch {
        return await fail();
      }
    });
  }

  listQuizBank(subchapterId: string): Promise<ReadResult<QuizQuestion[]>> {
    return guarded(async () => {
      const version = await this.client
        .from("question_bank_versions")
        .select("id")
        .eq("owner_id", this.ownerId)
        .eq("subchapter_id", subchapterId)
        .eq("status", "klart")
        .order("created_at", { ascending: false })
        .limit(1);
      if (isInvalidId(version.error)) return { status: "ok", value: [] };
      if (version.error || !version.data) return unavailable;
      const [ready] = version.data as { id: string }[];
      if (!ready) return { status: "ok", value: [] };

      const questions = await this.client
        .from("quiz_questions")
        .select(quizQuestionColumns)
        .eq("owner_id", this.ownerId)
        .eq("bank_version_id", ready.id)
        .eq("status", "aktiv")
        .order("position");
      if (questions.error || !questions.data) return unavailable;
      return { status: "ok", value: (questions.data as QuizQuestionRow[]).map(toQuizQuestion) };
    });
  }

  listQuizzes(subchapterId: string): Promise<ReadResult<Quiz[]>> {
    return guarded(async () => {
      const { data, error } = await this.client
        .from("quizzes")
        .select(quizColumns)
        .eq("owner_id", this.ownerId)
        .eq("subchapter_id", subchapterId)
        .order("created_at", { ascending: false });
      if (isInvalidId(error)) return { status: "ok", value: [] };
      if (error || !data) return unavailable;
      return { status: "ok", value: (data as unknown as QuizRow[]).map(toQuiz) };
    });
  }

  createQuiz(input: NewQuiz): Promise<WriteResult<Quiz>> {
    return guarded(async () => {
      // Økt, quiz og elementer lages i én transaksjon i databasen (create_quiz), så en feil
      // underveis aldri etterlater en quiz i gang uten spørsmål. 23505: en quiz er alt i gang.
      const { data, error } = await this.client.rpc("create_quiz", {
        p_subchapter_id: input.subchapterId,
        p_question_ids: input.questionIds,
      });
      if (error || typeof data !== "string") return toWriteFailure(error);

      const created = await this.client
        .from("quizzes")
        .select(quizColumns)
        .eq("owner_id", this.ownerId)
        .eq("id", data)
        .single();
      if (created.error || !created.data) return unavailable;
      return { status: "ok", value: toQuiz(created.data as unknown as QuizRow) };
    });
  }

  answerQuizItem(itemId: string, chosenIndex: number, correct: boolean): Promise<WriteResult<boolean>> {
    return guarded(async () => {
      // Filteret på `answered_at` gjør at bare det første svaret lagres, også ved to samtidige.
      const { data, error } = await this.client
        .from("quiz_items")
        .update({ chosen_index: chosenIndex, correct, answered_at: new Date().toISOString() })
        .eq("owner_id", this.ownerId)
        .eq("id", itemId)
        .eq("status", "aktiv")
        .is("answered_at", null)
        .select("id");
      if (isInvalidId(error)) return { status: "ok", value: false };
      if (error || !data) return unavailable;
      return { status: "ok", value: (data as unknown[]).length > 0 };
    });
  }

  replaceQuizItem(itemId: string, questionId: string): Promise<WriteResult<boolean>> {
    return guarded(async () => {
      // Det gamle elementet merkes og det nye lages i én transaksjon (replace_quiz_item), så
      // posisjonen aldri står uten aktivt element.
      const { data, error } = await this.client.rpc("replace_quiz_item", {
        p_item_id: itemId,
        p_question_id: questionId,
      });
      if (isInvalidId(error)) return { status: "ok", value: false };
      if (error || typeof data !== "boolean") return unavailable;
      return { status: "ok", value: data };
    });
  }

  saveQuizResult(quizId: string, result: QuizResultInput): Promise<WriteResult<boolean>> {
    return guarded(async () => {
      // Resultatet fryses og delkapittelet krysses av i én transaksjon (finish_quiz), så det aldri
      // finnes en ferdig quiz over 80 % uten avkrysning. Totalen (antallet aktive elementer) settes i
      // funksjonen.
      const { data, error } = await this.client.rpc("finish_quiz", {
        p_quiz_id: quizId,
        p_correct_count: result.correctCount,
        p_carry_theme_id: result.carryThemeId,
        p_completes: result.completes,
      });
      if (isInvalidId(error)) return { status: "ok", value: false };
      if (error || typeof data !== "boolean") return unavailable;
      return { status: "ok", value: data };
    });
  }

  reportQuizItem(itemId: string, comment: string | null): Promise<WriteResult<boolean>> {
    return guarded(async () => {
      // Rapporten, tilbaketrekkingen og uttaket av quizen skjer i én transaksjon
      // (report_quiz_question), så ingenting er endret hvis kallet feiler.
      const { data, error } = await this.client.rpc("report_quiz_question", {
        p_item_id: itemId,
        p_comment: comment,
      });
      if (isInvalidId(error)) return { status: "ok", value: false };
      if (error || typeof data !== "boolean") return unavailable;
      return { status: "ok", value: data };
    });
  }

  listQuestionReports(subchapterIds: string[]): Promise<ReadResult<QuestionReport[]>> {
    return guarded(async () => {
      if (subchapterIds.length === 0) return { status: "ok", value: [] };
      const { data, error } = await this.client
        .from("question_reports")
        .select(questionReportColumns)
        .eq("owner_id", this.ownerId)
        .in("quiz_questions.subchapter_id", subchapterIds)
        .order("reported_at");
      if (error || !data) return unavailable;
      return {
        status: "ok",
        value: (data as unknown as QuestionReportRow[]).map((row) => ({
          subchapterId: row.quiz_questions.subchapter_id,
          question: row.quiz_questions.question,
          theme: row.quiz_questions.themes.name,
          comment: row.comment,
          reportedAt: row.reported_at,
        })),
      };
    });
  }

  reportSummaryVersion(versionId: string, comment: string | null): Promise<WriteResult<boolean>> {
    return guarded(async () => {
      // `insert … on conflict do nothing`: å melde på nytt gir ingen ny rad og endrer ikke den første.
      // Den sammensatte FK-en til versjonen avviser en versjon som ikke finnes eller ikke er eierens.
      const { error } = await this.client
        .from("summary_reports")
        .upsert(
          { owner_id: this.ownerId, summary_version_id: versionId, comment },
          { onConflict: "owner_id,summary_version_id", ignoreDuplicates: true },
        );
      if (isInvalidId(error) || error?.code === FOREIGN_KEY_VIOLATION) return { status: "ok", value: false };
      if (error) return unavailable;
      return { status: "ok", value: true };
    });
  }

  listSummaryReports(subchapterIds: string[]): Promise<ReadResult<SummaryReport[]>> {
    return guarded(async () => {
      if (subchapterIds.length === 0) return { status: "ok", value: [] };
      const { data, error } = await this.client
        .from("summary_reports")
        .select(summaryReportColumns)
        .eq("owner_id", this.ownerId)
        .in("summary_versions.subchapter_id", subchapterIds)
        .order("reported_at");
      if (error || !data) return unavailable;
      return {
        status: "ok",
        value: (data as unknown as SummaryReportRow[]).map((row) => ({
          subchapterId: row.summary_versions.subchapter_id,
          summaryVersionId: row.summary_version_id,
          comment: row.comment,
          reportedAt: row.reported_at,
        })),
      };
    });
  }

  listCompletions(subchapterIds: string[]): Promise<ReadResult<SubchapterCompletion[]>> {
    return guarded(async () => {
      if (subchapterIds.length === 0) return { status: "ok", value: [] };
      const { data, error } = await this.client
        .from("subchapter_completions")
        .select("subchapter_id, quiz_id, completed_at")
        .eq("owner_id", this.ownerId)
        .in("subchapter_id", subchapterIds);
      if (error || !data) return unavailable;
      const byId = new Map((data as CompletionRow[]).map((r) => [r.subchapter_id, r]));
      return {
        status: "ok",
        value: subchapterIds.flatMap((id) => {
          const row = byId.get(id);
          return row ? [{ subchapterId: row.subchapter_id, quizId: row.quiz_id, completedAt: row.completed_at }] : [];
        }),
      };
    });
  }
}
