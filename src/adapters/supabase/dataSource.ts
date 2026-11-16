import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseInput } from "@/domain/course";
import type {
  Course,
  DataSource,
  ReadResult,
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
}
