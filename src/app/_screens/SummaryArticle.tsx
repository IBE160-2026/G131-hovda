import type { ReactNode } from "react";
import type { Chapter, Subchapter, SummaryVersion } from "@/application/dataSource";
import type { SubchapterStatus } from "@/domain/summary";
import { parseSummaryMarkdown, type InlineSegment } from "@/domain/summaryMarkdown";
import { noSummaryMessage, outdatedMessage } from "../(innlogget)/emner/formState";

/**
 * Lesesiden for sammendraget av et delkapittel (FR-11): kapittel, tittel, merknad når notatet er
 * endret, og sammendraget. `actions` står til slutt i artikkelen, for eksempel quizen og feilrapporten.
 */
export function SummaryArticle({
  chapter,
  subchapter,
  summary,
  summaryStatus,
  actions,
}: {
  chapter: Pick<Chapter, "number" | "title">;
  subchapter: Pick<Subchapter, "number" | "title">;
  summary: Pick<SummaryVersion, "text"> | null;
  summaryStatus: SubchapterStatus;
  actions?: ReactNode;
}) {
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
      {actions}
    </article>
  );
}

function Inline({ segments }: { segments: InlineSegment[] }) {
  return segments.map((segment, i) =>
    segment.kind === "bold" ? <strong key={i}>{segment.text}</strong> : <span key={i}>{segment.text}</span>,
  );
}

/** Sammendraget med avsnitt, punktlister og fet tekst. React escaper teksten, så ingen HTML slipper gjennom. */
export function SummaryText({ text }: { text: string }) {
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
