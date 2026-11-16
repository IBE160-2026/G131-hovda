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
import type { Chapter, Course, DataSource, SaveChapterReport } from "../dataSource";

type StoredChapter = Omit<Chapter, "subchapters"> & { courseId: string; subchapters: StoredSubchapter[] };

export class MemoryDataSource implements DataSource {
  courses: Course[] = [];
  chapters: StoredChapter[] = [];
  activeId: string | null = null;
  down = false;
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
    this.chapters = this.chapters.filter((c) => c.courseId !== id);
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
}
