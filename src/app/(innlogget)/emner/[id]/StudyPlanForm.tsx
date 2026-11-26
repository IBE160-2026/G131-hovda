"use client";

import { useActionState } from "react";
import type { StudyPlanField } from "@/domain/studyPlan";
import type { StudyPlanFormState } from "../formState";
import { primaryButton } from "../styles";

type Props = {
  action: (state: StudyPlanFormState, formData: FormData) => Promise<StudyPlanFormState>;
  initialState: StudyPlanFormState;
};

const inputClass =
  "min-h-11 w-full max-w-xs rounded-xl border border-muted/40 bg-card px-4 py-2 text-base text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Eksamensdato og planstart, med egen knapp, så emnet kan endres uten at planen starter på nytt. */
export function StudyPlanForm({ action, initialState }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const { values, errors } = state;

  const described = (field: StudyPlanField, hint: string) =>
    [hint, errors[field] ? `${field}-feil` : undefined].filter(Boolean).join(" ");

  return (
    <form key={state.attempt} action={formAction} className="flex flex-col gap-5" noValidate>
      <p id="plan-feil" role="alert" className="font-semibold text-error empty:hidden">
        {state.formError}
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="examDate" className="font-semibold">
          Eksamensdato
        </label>
        <p id="examDate-hjelp" className="text-sm text-muted">
          Datoen planen skal være ferdig. Delkapitlene fordeles på studiedagene (mandag–fredag) fram til den.
        </p>
        <input
          id="examDate"
          name="examDate"
          type="date"
          required
          defaultValue={values.examDate}
          aria-describedby={described("examDate", "examDate-hjelp")}
          aria-invalid={errors.examDate ? true : undefined}
          className={inputClass}
        />
        <p id="examDate-feil" role="alert" className="font-semibold text-error empty:hidden">
          {errors.examDate}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="planStart" className="font-semibold">
          Planstart (valgfri)
        </label>
        <p id="planStart-hjelp" className="text-sm text-muted">
          Står feltet tomt, starter planen i dag. Det du alt har gjennomført, teller ikke som etterslep.
        </p>
        <input
          id="planStart"
          name="planStart"
          type="date"
          defaultValue={values.planStart}
          aria-describedby={described("planStart", "planStart-hjelp")}
          aria-invalid={errors.planStart ? true : undefined}
          className={inputClass}
        />
        <p id="planStart-feil" role="alert" className="font-semibold text-error empty:hidden">
          {errors.planStart}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Lagrer …" : "Lagre planen"}
        </button>
        <p role="status" className="font-semibold empty:hidden">
          {state.message}
        </p>
      </div>
    </form>
  );
}
