"use client";

import { useCallback } from "react";
import type { Course, DataSource, ReadResult } from "@/application/dataSource";
import { CourseCard } from "../_screens/CourseCard";
import { UnavailableMessage } from "../_screens/UnavailableMessage";
import { Loading } from "./Loading";
import { useDemoResult } from "./useDemoResult";

/** Emnelisten i demoen. Hvert emne lenker rett til kapittellisten, uten «Velg» og uten aktivt emne. */
export function DemoCourses() {
  const load = useCallback((data: DataSource) => data.listCourses(), []);
  return <DemoCoursesView courses={useDemoResult(load)} />;
}

export function DemoCoursesView({ courses }: { courses: ReadResult<Course[]> | null }) {
  if (!courses) return <Loading />;
  if (courses.status !== "ok") return <UnavailableMessage />;
  return (
    <ul className="flex flex-col gap-4">
      {courses.value.map((course) => (
        <CourseCard key={course.id} course={course} href={`/demo/emner/${encodeURIComponent(course.id)}`} />
      ))}
    </ul>
  );
}
