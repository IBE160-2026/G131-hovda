import type { Metadata } from "next";
import Link from "next/link";
import { OwnerOnly } from "../../OwnerOnly";
import { createCourseAction } from "../actions";
import { CourseForm } from "../CourseForm";
import { initialCourseFormState } from "../formState";
import { pageMain, textLink } from "../styles";

export const metadata: Metadata = {
  title: "Nytt emne – Studievenn",
};

export default function NewCoursePage() {
  return (
    <OwnerOnly>
      <main className={pageMain}>
        <header className="flex flex-col gap-3">
          <Link href="/emner" className={`self-start text-sm ${textLink}`}>
            Til emnene
          </Link>
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">Nytt emne</h1>
        </header>
        <CourseForm
          action={createCourseAction}
          initialState={initialCourseFormState()}
          submitLabel="Lagre emnet"
          pendingLabel="Lagrer …"
        />
      </main>
    </OwnerOnly>
  );
}
