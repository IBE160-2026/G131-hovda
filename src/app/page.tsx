import Link from "next/link";
import { Suspense } from "react";
import { RedirectIfOwner } from "./RedirectIfOwner";

const features = [
  {
    title: "Les sammendraget",
    text: "Korte sammendrag laget fra dine egne notater, på norsk.",
    color: "bg-sun",
  },
  {
    title: "Ta quizen",
    text: "Ti spørsmål per delkapittel, med forklaring når du svarer feil.",
    color: "bg-mint",
  },
  {
    title: "Hold planen",
    text: "Se hva du skal gjøre i kveld, og om du ligger foran eller bak.",
    color: "bg-sky",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-12 sm:px-8 sm:py-20">
      <Suspense fallback={null}>
        <RedirectIfOwner />
      </Suspense>
      <header className="flex flex-col gap-4">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">
          Studievenn
        </p>
        <h1 className="text-3xl leading-tight font-bold break-words sm:text-5xl">
          Kveldsøkta di, klar på ett trykk
        </h1>
        <p className="max-w-prose text-lg text-muted">
          Studievenn gjør notatene dine om til sammendrag og quiz, og hjelper
          deg å holde planen fram mot eksamen.
        </p>
        <div>
          <Link
            href="/logg-inn"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-contrast transition-colors hover:bg-accent-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Logg inn
          </Link>
        </div>
      </header>

      <section aria-labelledby="slik-virker-det">
        <h2 id="slik-virker-det" className="sr-only">
          Slik virker det
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="flex flex-col gap-2 rounded-2xl bg-card p-5 shadow-sm"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-12 rounded-full ${feature.color}`}
              />
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="text-muted">{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
