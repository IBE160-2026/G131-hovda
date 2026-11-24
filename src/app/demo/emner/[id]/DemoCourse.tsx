"use client";

import Link from "next/link";
import { use, useCallback } from "react";
import { listChapterOverview, type ChapterOverview } from "@/application/chapterOverview";
import type { Course, DataSource, ReadResult, Unavailable } from "@/application/dataSource";
import { ChapterList } from "../../../_screens/ChapterList";
import { CourseHeader } from "../../../_screens/CourseHeader";
import { CourseSection } from "../../../_screens/CourseSection";
import { Progress } from "../../../_screens/Progress";
import { UnavailableMessage } from "../../../_screens/UnavailableMessage";
import { textLink } from "../../../(innlogget)/emner/styles";
import { Loading } from "../../Loading";
import { demoCourseNotFoundMessage } from "../../messages";
import { useDemoResult } from "../../useDemoResult";

export type DemoCourseResult =
  | { status: "ok"; course: Course; chapters: ReadResult<ChapterOverview[]> }
  | { status: "notFound" }
  | Unavailable;

/** Emnet og kapitlene med status, slik emnekortet i appen viser dem. */
export async function loadDemoCourse(data: DataSource, id: string): Promise<DemoCourseResult> {
  const course = await data.getCourse(id);
  if (course.status !== "ok") return course;
  if (!course.value) return { status: "notFound" };
  return { status: "ok", course: course.value, chapters: await listChapterOverview(data, id) };
}

/** Emnekortet i demoen: eksamensform, læringsutbytte, framdrift og kapittellisten med status. */
export function DemoCourse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const load = useCallback((data: DataSource) => loadDemoCourse(data, id), [id]);
  return <DemoCourseView id={id} result={useDemoResult(load)} />;
}

export function DemoCourseView({ id, result }: { id: string; result: DemoCourseResult | null }) {
  if (!result) return <Loading />;
  if (result.status === "unavailable") return <UnavailableMessage />;
  if (result.status === "notFound") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-lg text-muted">{demoCourseNotFoundMessage}</p>
        <p>
          <Link href="/demo" className={textLink}>
            Gå til emnene
          </Link>
        </p>
      </div>
    );
  }
  return (
    <CourseSection>
      <Progress chapters={result.chapters} />
      <CourseHeader course={result.course} />
      <ChapterList
        chapters={result.chapters}
        subchapterHref={(number) =>
          `/demo/emner/${encodeURIComponent(id)}/delkapitler/${encodeURIComponent(number)}`
        }
      />
    </CourseSection>
  );
}
