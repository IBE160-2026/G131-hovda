import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { pageMain, textLink } from "../../../(innlogget)/emner/styles";
import { Loading } from "../../Loading";
import { DemoCourse } from "./DemoCourse";

export const metadata: Metadata = {
  title: "Emne i demoen – Studievenn",
};

/** Emnekortet i demoen. Innholdet leses i nettleseren av `DemoCourse`. */
export default function DemoCoursePage({ params }: PageProps<"/demo/emner/[id]">) {
  return (
    <main className={pageMain}>
      <header>
        <Link href="/demo" className={`text-sm ${textLink}`}>
          Til emnene
        </Link>
      </header>
      <Suspense fallback={<Loading />}>
        <DemoCourse params={params} />
      </Suspense>
    </main>
  );
}
