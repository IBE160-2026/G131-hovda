import type { Metadata } from "next";
import Link from "next/link";
import { getSubchapterSummary } from "@/application/chapterOverview";
import { parseSummaryMarkdown, type InlineSegment } from "@/domain/summaryMarkdown";
import { getDataSourceForRender } from "@/composition/server";
import { OwnerOnly } from "../../../../OwnerOnly";
import {
  noSummaryMessage,
  outdatedMessage,
  subchapterNotFoundMessage,
  unavailableMessage,
} from "../../../formState";
import { pageMain, textLink } from "../../../styles";

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

  if (result.status === "unavailable") {
    return (
      <p role="alert" className="font-semibold text-error">
        {unavailableMessage}
      </p>
    );
  }
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

  const { chapter, subchapter, summary, summaryStatus } = result;
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold break-words text-muted">
          Kapittel {chapter.number}: {chapter.title}
        </p>
        <h1 className="text-3xl leading-tight font-bold break-words sm:text-4xl">
          {subchapter.number} <span className="font-normal">{subchapter.title}</span>
        </h1>
      </header>
      {summary?.text ? (
        <>
          {summaryStatus !== "klart" && (
            <p className="max-w-prose rounded-xl bg-sun px-4 py-3 font-semibold">{outdatedMessage}</p>
          )}
          <SummaryText text={summary.text} />
        </>
      ) : (
        <p className="text-lg text-muted">{noSummaryMessage}</p>
      )}
    </article>
  );
}

function Inline({ segments }: { segments: InlineSegment[] }) {
  return segments.map((segment, i) =>
    segment.kind === "bold" ? <strong key={i}>{segment.text}</strong> : <span key={i}>{segment.text}</span>,
  );
}

/** Sammendraget med avsnitt, punktlister og fet tekst. React escaper teksten, så ingen HTML slipper gjennom. */
function SummaryText({ text }: { text: string }) {
  return (
    <div className="flex max-w-prose flex-col gap-4 text-lg leading-relaxed break-words">
      {parseSummaryMarkdown(text).map((block, i) =>
        block.kind === "list" ? (
          <ul key={i} className="flex list-disc flex-col gap-2 pl-6">
            {block.items.map((item, j) => (
              <li key={j}>
                <Inline segments={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            {block.lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <Inline segments={line} />
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
