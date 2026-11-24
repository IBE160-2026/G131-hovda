import type { Metadata } from "next";
import Link from "next/link";
import { getSubchapterSummary } from "@/application/chapterOverview";
import { getDataSourceForRender } from "@/composition/server";
import { SummaryArticle } from "../../../../../_screens/SummaryArticle";
import { UnavailableMessage } from "../../../../../_screens/UnavailableMessage";
import { OwnerOnly } from "../../../../OwnerOnly";
import {
  subchapterNotFoundMessage,
  summaryReportedMessage,
  summaryReportLabel,
} from "../../../formState";
import { pageMain, primaryButton, textLink } from "../../../styles";
import { reportSummaryAction } from "./actions";
import { startQuizAction } from "./quiz/actions";
import { ReportForm } from "./ReportForm";

export const metadata: Metadata = {
  title: "Sammendrag – Studievenn",
};

/** Lesesiden for sammendraget av et delkapittel (FR-11). `nummer` er «n.m» (AD-5). */
export default function SubchapterSummaryPage({ params }: PageProps<"/emner/[id]/delkapitler/[nummer]">) {
  return (
    <OwnerOnly>
      <main className={pageMain}>
        <header>
          <Link href="/start" className={`text-sm ${textLink}`}>
            Til startsiden
          </Link>
        </header>
        <SubchapterSummary params={params} />
      </main>
    </OwnerOnly>
  );
}

export async function SubchapterSummary({
  params,
}: Pick<PageProps<"/emner/[id]/delkapitler/[nummer]">, "params">) {
  const { id, nummer } = await params;
  const data = await getDataSourceForRender();
  if (!data) return null;
  const result = await getSubchapterSummary(data, id, nummer);

  if (result.status === "unavailable") return <UnavailableMessage />;
  if (result.status === "notFound") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-lg text-muted">{subchapterNotFoundMessage}</p>
        <p>
          <Link href="/start" className={textLink}>
            Gå til startsiden
          </Link>
        </p>
      </div>
    );
  }

  const { chapter, subchapter, summary, summaryStatus, quizReady, reported } = result;
  return (
    <SummaryArticle
      chapter={chapter}
      subchapter={subchapter}
      summary={summary}
      summaryStatus={summaryStatus}
      actions={
        <>
          {quizReady && (
            <form action={startQuizAction.bind(null, id, nummer)}>
              <button type="submit" className={primaryButton}>
                Ta quizen
              </button>
            </form>
          )}
          {summary?.text &&
            (reported ? (
              <p role="status" className="max-w-prose rounded-xl bg-sun px-4 py-3 font-semibold">
                {summaryReportedMessage}
              </p>
            ) : (
              <div className="max-w-prose">
                <ReportForm
                  action={reportSummaryAction.bind(null, id, nummer, summary.id)}
                  idPrefix="meld-sammendrag"
                  label={summaryReportLabel}
                />
              </div>
            ))}
        </>
      }
    />
  );
}
