import type { Metadata } from "next";
import Link from "next/link";
import { getDataSourceForRender } from "@/composition/server";
import { OwnerOnly } from "../../../OwnerOnly";
import { deleteCourseAction } from "../../actions";
import { notFoundMessage, unavailableMessage } from "../../formState";
import { dangerButton, pageMain, secondaryButton, textLink } from "../../styles";

export const metadata: Metadata = {
  title: "Slett emne – Studievenn",
};

export default function DeleteCoursePage({
  params,
  searchParams,
}: PageProps<"/emner/[id]/slett">) {
  return (
    <OwnerOnly>
      <main className={pageMain}>
        <header className="flex flex-col gap-3">
          <Link href="/emner" className={`self-start text-sm ${textLink}`}>
            Til emnene
          </Link>
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">Slett emne</h1>
        </header>
        <ConfirmDelete params={params} searchParams={searchParams} />
      </main>
    </OwnerOnly>
  );
}

async function ConfirmDelete({
  params,
  searchParams,
}: Pick<PageProps<"/emner/[id]/slett">, "params" | "searchParams">) {
  const { id } = await params;
  const failed = (await searchParams).feil !== undefined;
  const data = await getDataSourceForRender();
  if (!data) return null;
  const course = await data.getCourse(id);

  if (course.status !== "ok") {
    return (
      <p role="alert" className="font-semibold text-error">
        {unavailableMessage}
      </p>
    );
  }
  if (!course.value) return <p className="text-lg text-muted">{notFoundMessage}</p>;

  return (
    <section className="flex flex-col gap-6 rounded-2xl bg-card p-6 shadow-sm">
      {failed && (
        <p role="alert" className="font-semibold text-error">
          {unavailableMessage}
        </p>
      )}
      <p className="text-lg break-words">
        Vil du slette{" "}
        <strong>
          {course.value.code} {course.value.name}
        </strong>
        ? Emnet blir borte for godt.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <form action={deleteCourseAction.bind(null, course.value.id)}>
          <button type="submit" className={dangerButton}>
            Slett emnet
          </button>
        </form>
        <Link href="/emner" className={secondaryButton}>
          Avbryt
        </Link>
      </div>
    </section>
  );
}
