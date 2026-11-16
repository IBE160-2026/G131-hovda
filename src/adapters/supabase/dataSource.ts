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
  ReadResult,
  SaveChapterReport,
  Unavailable,
  WriteResult,
} from "@/application/dataSource";

// Bare den delen av Supabase-klienten som adapteren bruker, så testene kan bruke en falsk klient.
export type SupabaseDataClient = Pick<SupabaseClient, "from">;

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

// Postgres-feilkoder: brudd på unik indeks og ugyldig uuid (f.eks. /emner/abc).
const UNIQUE_VIOLATION = "23505";
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
}
