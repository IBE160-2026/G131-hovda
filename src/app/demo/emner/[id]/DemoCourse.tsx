"use client";

import Link from "next/link";
import { use, useMemo } from "react";
import { listChapterOverview, type ChapterOverview } from "@/application/chapterOverview";
import type { Course, DataSource, ReadResult, StudyPlan, Unavailable } from "@/application/dataSource";
import { getDemo } from "@/composition/demo";
import { ChapterList } from "../../../_screens/ChapterList";
import { CourseHeader } from "../../../_screens/CourseHeader";
import { CourseSection } from "../../../_screens/CourseSection";
import { DailySuggestion } from "../../../_screens/DailySuggestion";
import { Progress } from "../../../_screens/Progress";
import { UnavailableMessage } from "../../../_screens/UnavailableMessage";
import { textLink } from "../../../(innlogget)/emner/styles";
import { Loading } from "../../Loading";
import { demoCourseNotFoundMessage } from "../../messages";
import { useDemoResult } from "../../useDemoResult";

export type DemoCourseResult =
  | {
      status: "ok";
      course: Course;
      chapters: ReadResult<ChapterOverview[]>;
      /** `null` uten plan, eller når planen ikke kan leses. */
      plan: StudyPlan | null;
      /** Demo-dagen, `ÅÅÅÅ-MM-DD`. */
      today: string;
    }
  | { status: "notFound" }
  | Unavailable;

/** Emnet, kapitlene med status og studieplanen, slik startsiden i appen viser dem. `today` er demo-dagen. */
export async function loadDemoCourse(data: DataSource, id: string, today: string): Promise<DemoCourseResult> {
  const course = await data.getCourse(id);
  if (course.status !== "ok") return course;
  if (!course.value) return { status: "notFound" };
  const [chapters, plan] = await Promise.all([listChapterOverview(data, id), data.getStudyPlan(id)]);
  // Kan planen ikke leses, vises emnet uten forslag og uten foran/bak.
  return { status: "ok", course: course.value, chapters, plan: plan.status === "ok" ? plan.value : null, today };
}

/**
 * Emnekortet i demoen: dagens forslag, framdrift med foran/bak, eksamensform, eksamensdato,
 * læringsutbytte og kapittellisten med status (FR-26 del 2).
 */
export function DemoCourse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const load = useMemo(() => demoCourseLoader(id), [id]);
  return <DemoCourseView id={id} result={useDemoResult(load)} />;
}

/** Lastingen `DemoCourse` bruker: emnet `id` med demo-dagen fra klokka. Klokka hentes først når lastingen kjører, i nettleseren. */
export function demoCourseLoader(id: string) {
  return (data: DataSource) => loadDemoCourse(data, id, getDemo().clock.today());
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
  const subchapterHref = (number: string) =>
    `/demo/emner/${encodeURIComponent(id)}/delkapitler/${encodeURIComponent(number)}`;
  return (
    <CourseSection>
      <DailySuggestion
        chapters={result.chapters}
        plan={result.plan}
        today={result.today}
        subchapterHref={subchapterHref}
      />
      <Progress chapters={result.chapters} plan={result.plan} today={result.today} />
      <CourseHeader course={result.course} examDate={result.plan?.examDate} />
      <ChapterList chapters={result.chapters} subchapterHref={subchapterHref} />
    </CourseSection>
  );
}
