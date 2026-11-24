"use client";

import Link from "next/link";
import { use, useCallback } from "react";
import { getSubchapterSummary, type SubchapterSummaryResult } from "@/application/chapterOverview";
import type { DataSource } from "@/application/dataSource";
import { SummaryArticle } from "../../../../../_screens/SummaryArticle";
import { UnavailableMessage } from "../../../../../_screens/UnavailableMessage";
import { subchapterNotFoundMessage } from "../../../../../(innlogget)/emner/formState";
import { textLink } from "../../../../../(innlogget)/emner/styles";
import { Loading } from "../../../../Loading";
import { useDemoResult } from "../../../../useDemoResult";

/** Lesesiden i demoen: sammendraget fra demofila, uten quiz og feilrapport (2.3 legger til quizen). */
export function DemoSummary({ params }: { params: Promise<{ id: string; nummer: string }> }) {
  const { id, nummer } = use(params);
  const load = useCallback((data: DataSource) => getSubchapterSummary(data, id, nummer), [id, nummer]);
  return (
    <>
      <header>
        <Link href={chaptersHref(id)} className={`text-sm ${textLink}`}>
          Til kapitlene
        </Link>
      </header>
      <DemoSummaryView id={id} result={useDemoResult(load)} />
    </>
  );
}

const chaptersHref = (id: string) => `/demo/emner/${encodeURIComponent(id)}`;

export function DemoSummaryView({ id, result }: { id: string; result: SubchapterSummaryResult | null }) {
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
    />
  );
}
