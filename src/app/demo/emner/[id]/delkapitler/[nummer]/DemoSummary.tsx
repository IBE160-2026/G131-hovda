"use client";

import Link from "next/link";
import { use, useCallback } from "react";
import { getSubchapterSummary, type SubchapterSummaryResult } from "@/application/chapterOverview";
import type { DataSource } from "@/application/dataSource";
import { getDemo } from "@/composition/demo";
import { SummaryArticle } from "../../../../../_screens/SummaryArticle";
import { UnavailableMessage } from "../../../../../_screens/UnavailableMessage";
import { subchapterNotFoundMessage } from "../../../../../(innlogget)/emner/formState";
import { primaryButton, textLink } from "../../../../../(innlogget)/emner/styles";
import { Loading } from "../../../../Loading";
import { useDemoResult } from "../../../../useDemoResult";
import { startDemoQuiz, useDemoNavigate } from "./quiz/DemoQuiz";

/** Lesesiden i demoen: sammendraget fra demofila og «Ta quizen», uten feilrapport. */
export function DemoSummary({ params }: { params: Promise<{ id: string; nummer: string }> }) {
  const { id, nummer } = use(params);
  const load = useCallback((data: DataSource) => getSubchapterSummary(data, id, nummer), [id, nummer]);
  const navigate = useDemoNavigate();
  return (
    <>
      <header>
        <Link href={chaptersHref(id)} className={`text-sm ${textLink}`}>
          Til kapitlene
        </Link>
      </header>
      <DemoSummaryView
        id={id}
        result={useDemoResult(load)}
        startQuizAction={async () => navigate(await startDemoQuiz(getDemo().data, id, nummer))}
      />
    </>
  );
}

const chaptersHref = (id: string) => `/demo/emner/${encodeURIComponent(id)}`;

export function DemoSummaryView({
  id,
  result,
  startQuizAction,
}: {
  id: string;
  result: SubchapterSummaryResult | null;
  /** Starter eller fortsetter quizen, som «Ta quizen» i appen. */
  startQuizAction: (formData: FormData) => void | Promise<void>;
}) {
  if (!result) return <Loading />;
  if (result.status === "unavailable") return <UnavailableMessage />;
  if (result.status === "notFound") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-lg text-muted">{subchapterNotFoundMessage}</p>
        <p>
          <Link href={chaptersHref(id)} className={textLink}>
            Gå til kapitlene
          </Link>
        </p>
      </div>
    );
  }
  return (
    <SummaryArticle
      chapter={result.chapter}
      subchapter={result.subchapter}
      summary={result.summary}
      summaryStatus={result.summaryStatus}
      actions={
        result.quizReady && (
          <form action={startQuizAction}>
            <button type="submit" className={primaryButton}>
              Ta quizen
            </button>
          </form>
        )
      }
    />
  );
}
