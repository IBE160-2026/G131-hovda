"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CourseField } from "@/domain/course";
import type { CourseFormState } from "./formState";
import { primaryButton, textLink } from "./styles";

type Props = {
  action: (state: CourseFormState, formData: FormData) => Promise<CourseFormState>;
  initialState: CourseFormState;
  submitLabel: string;
  pendingLabel: string;
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-muted/40 bg-card px-4 py-2 text-base text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function CourseForm({ action, initialState, submitLabel, pendingLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const { values, errors } = state;

  // Feltet beskrives av hjelpeteksten (om den finnes) og av feilmeldingen.
  const described = (field: CourseField, hint?: string) =>
    [hint, errors[field] ? `${field}-feil` : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <form key={state.attempt} action={formAction} className="flex flex-col gap-5" noValidate>
      <p id="emne-feil" role="alert" className="font-semibold text-error empty:hidden">
        {state.formError}
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="code" className="font-semibold">
          Emnekode
        </label>
        <p id="code-hjelp" className="text-sm text-muted">
          Bokstaver og tall uten mellomrom, for eksempel IBE430.
        </p>
        <input
          id="code"
          name="code"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          required
          defaultValue={values.code}
          aria-describedby={described("code", "code-hjelp")}
          aria-invalid={errors.code ? true : undefined}
          className={inputClass}
        />
        <p id="code-feil" role="alert" className="font-semibold text-error empty:hidden">
          {errors.code}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="font-semibold">
          Navn
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="off"
          required
          defaultValue={values.name}
          aria-describedby={described("name")}
          aria-invalid={errors.name ? true : undefined}
          className={inputClass}
        />
        <p id="name-feil" role="alert" className="font-semibold text-error empty:hidden">
          {errors.name}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="learningOutcomes" className="font-semibold">
          Læringsutbytte
        </label>
        <textarea
          id="learningOutcomes"
          name="learningOutcomes"
          rows={8}
          defaultValue={values.learningOutcomes}
          className={`${inputClass} min-h-40`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="examForm" className="font-semibold">
          Eksamensform
        </label>
        <textarea
          id="examForm"
          name="examForm"
          rows={3}
          defaultValue={values.examForm}
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? pendingLabel : submitLabel}
        </button>
        <Link href="/emner" className={textLink}>
          Avbryt
        </Link>
      </div>
    </form>
  );
}
