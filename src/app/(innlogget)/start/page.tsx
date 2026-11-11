import type { Metadata } from "next";
import { OwnerOnly } from "../OwnerOnly";
import { logOut } from "./actions";

export const metadata: Metadata = {
  title: "Start – Studievenn",
};

export default function StartPage() {
  return (
    <OwnerOnly>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-8 sm:py-20">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-wide text-accent uppercase">Studievenn</p>
          <form action={logOut}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-accent px-5 py-2 text-base font-semibold text-accent transition-colors hover:bg-card focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Logg ut
            </button>
          </form>
        </header>
        <section className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-sm">
          <span aria-hidden="true" className="h-2 w-12 rounded-full bg-mint" />
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">Hei!</h1>
          <p className="max-w-prose text-lg text-muted">
            Du er logget inn. Snart finner du emnene dine her, med sammendrag, quiz og plan.
          </p>
        </section>
      </main>
    </OwnerOnly>
  );
}
