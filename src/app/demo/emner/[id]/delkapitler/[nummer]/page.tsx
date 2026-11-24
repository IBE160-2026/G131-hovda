import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMain } from "../../../../../(innlogget)/emner/styles";
import { Loading } from "../../../../Loading";
import { DemoSummary } from "./DemoSummary";

export const metadata: Metadata = {
  title: "Sammendrag i demoen – Studievenn",
};

/** Lesesiden i demoen. `nummer` er «n.m». Innholdet leses i nettleseren av `DemoSummary`. */
export default function DemoSummaryPage({ params }: PageProps<"/demo/emner/[id]/delkapitler/[nummer]">) {
  return (
    <main className={pageMain}>
      <Suspense fallback={<Loading />}>
        <DemoSummary params={params} />
      </Suspense>
    </main>
  );
}
