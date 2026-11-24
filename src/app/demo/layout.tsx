import Link from "next/link";
import { demoBadgeText, demoExitLabel, demoNoScriptMessage } from "./messages";

// Lenken har tekstfargen, for aksentfargen har for lav kontrast mot gult i mørk modus.
const exitLink =
  "font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent";

// Demoen (FR-26, UJ-5): åpen for alle, uten innlogging. Sidene leser demofila i nettleseren via
// `@/composition/demo` og importerer aldri `@/composition/server` (AD-3, NFR-5).
export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return (
    <>
      <aside aria-label="Demo" className="bg-sun">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-8">
          <p className="font-semibold">{demoBadgeText}</p>
          <Link href="/" className={exitLink}>
            {demoExitLabel}
          </Link>
        </div>
      </aside>
      <noscript>
        <p className="mx-auto w-full max-w-3xl px-4 pt-6 font-semibold text-error sm:px-8">{demoNoScriptMessage}</p>
      </noscript>
      {children}
    </>
  );
}
