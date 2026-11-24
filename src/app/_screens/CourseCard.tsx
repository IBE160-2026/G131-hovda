import Link from "next/link";
import type { ReactNode } from "react";
import type { Course } from "@/application/dataSource";
import { textLink } from "../(innlogget)/emner/styles";

/**
 * Et emne i emnelisten. Med `href` er overskriften en lenke. `children` er knappene under,
 * for eksempel «Velg», «Endre» og «Slett».
 */
export function CourseCard({
  course,
  active = false,
  href,
  children,
}: {
  course: Pick<Course, "code" | "name">;
  active?: boolean;
  href?: string;
  children?: ReactNode;
}) {
  const title = (
    <>
      {course.code} <span className="font-normal">{course.name}</span>
    </>
  );
  return (
    <li
      aria-current={active ? "true" : undefined}
      className={`flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ${active ? "ring-3 ring-accent" : ""}`}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {active && (
          <p className="self-start rounded-full bg-mint px-3 py-1 text-sm font-semibold">Aktivt emne</p>
        )}
        <h2 className="text-xl font-semibold break-words">
          {href ? (
            <Link href={href} className={textLink}>
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
      </div>
      {children && <div className="flex flex-wrap items-center gap-4">{children}</div>}
    </li>
  );
}
