import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMain } from "../../../../../../(innlogget)/emner/styles";
import { Loading } from "../../../../../Loading";
import { DemoQuiz } from "./DemoQuiz";

export const metadata: Metadata = {
  title: "Quiz i demoen – Studievenn",
};

/**
 * Quizen i demoen (FR-26, FR-14). `nummer` er «n.m». Quizen kjører i nettleseren av `DemoQuiz`, og
 * det den besøkende gjør, ligger bare i fanen (`sessionStorage`).
 */
export default function DemoQuizPage({ params }: PageProps<"/demo/emner/[id]/delkapitler/[nummer]/quiz">) {
  return (
    <main className={pageMain}>
      <Suspense fallback={<Loading />}>
        <DemoQuiz params={params} />
      </Suspense>
    </main>
  );
}
