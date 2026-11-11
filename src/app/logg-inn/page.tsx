import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RedirectIfOwner } from "../RedirectIfOwner";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Logg inn – Studievenn",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-12 sm:py-20">
      <Suspense fallback={null}>
        <RedirectIfOwner />
      </Suspense>
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          className="text-sm font-semibold tracking-wide text-accent uppercase underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Studievenn
        </Link>
        <h1 className="text-3xl leading-tight font-bold">Logg inn</h1>
        <p className="text-muted">Bare eieren av appen har konto.</p>
      </header>
      <LoginForm />
    </main>
  );
}
