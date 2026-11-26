import type { Course } from "@/application/dataSource";
import { norwegianDate } from "@/domain/studyPlan";
import { textLink } from "../(innlogget)/emner/styles";

/**
 * Emnekortet: kode og navn, eksamensform, eksamensdato og læringsutbytte. `examDate` (`ÅÅÅÅ-MM-DD`)
 * vises når emnet har en studieplan.
 */
export function CourseHeader({ course, examDate }: { course: Course; examDate?: string | null }) {
  return (
    <>
      <h1 className="text-3xl leading-tight font-bold break-words sm:text-4xl">
        {course.code} <span className="font-normal">{course.name}</span>
      </h1>
      {course.examForm && (
        <p className="max-w-prose text-lg break-words whitespace-pre-line text-muted">
          <span className="font-semibold">Eksamensform:</span> {course.examForm}
        </p>
      )}
      {examDate && (
        <p className="max-w-prose text-lg text-muted">
          <span className="font-semibold">Eksamensdato:</span> <time dateTime={examDate}>{norwegianDate(examDate)}</time>
        </p>
      )}
      {course.learningOutcomes && (
        <details className="max-w-prose">
          <summary className={`cursor-pointer ${textLink}`}>Læringsutbytte</summary>
          <p className="mt-3 break-words whitespace-pre-line">{course.learningOutcomes}</p>
        </details>
      )}
    </>
  );
}
