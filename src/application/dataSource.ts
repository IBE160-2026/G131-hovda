// Porten for eierens data. Brukstilfellene og sidene kjenner bare denne, ikke Supabase (AD-1).
// En DataSource gjelder alltid én eier, som komposisjonsroten har verifisert.
import type { CourseInput } from "@/domain/course";

export type Course = CourseInput & { id: string };

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
}
