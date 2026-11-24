import type { Metadata } from "next";
import { pageMain } from "../(innlogget)/emner/styles";
import { DemoCourses } from "./DemoCourses";

export const metadata: Metadata = {
  title: "Demo – Studievenn",
};

/** Emnelisten i demoen. Innholdet leses i nettleseren av `DemoCourses`. */
export default function DemoPage() {
  return (
    <main className={pageMain}>
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">Studievenn</p>
        <h1 className="text-3xl leading-tight font-bold sm:text-4xl">Emner</h1>
      </header>
      <DemoCourses />
    </main>
  );
}
