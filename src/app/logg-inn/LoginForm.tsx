"use client";

import { useActionState } from "react";
import { logIn, type LoginState } from "./actions";

const initialState: LoginState = { email: "", error: null };

const inputClass =
  "min-h-11 w-full rounded-xl border border-muted/40 bg-card px-4 py-2 text-base text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(logIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="font-semibold">
          E-post
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          key={state.email}
          aria-describedby="innlogging-feil"
          aria-invalid={state.error ? true : undefined}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="font-semibold">
          Passord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby="innlogging-feil"
          aria-invalid={state.error ? true : undefined}
          className={inputClass}
        />
      </div>
      <p id="innlogging-feil" role="alert" className="min-h-6 font-semibold text-error">
        {state.error}
      </p>
      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-contrast transition-colors hover:bg-accent-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-70"
        >
          {pending ? "Logger inn …" : "Logg inn"}
        </button>
      </div>
    </form>
  );
}
