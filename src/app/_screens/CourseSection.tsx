import type { ReactNode } from "react";

/** Kortet rundt emnet på startsiden og i demoen, med den grønne streken øverst. */
export function CourseSection({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-sm">
      <span aria-hidden="true" className="h-2 w-12 rounded-full bg-mint" />
      {children}
    </section>
  );
}
