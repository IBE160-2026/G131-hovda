"use client";

import { useActionState } from "react";
import {
  initialReportFormState,
  reportButtonLabel,
  reportCommentLabel,
  reportPendingLabel,
  reportSummaryLabel,
  type ReportFormState,
} from "../../../../formState";
import { secondaryButton } from "../../../../styles";

type Props = {
  action: (state: ReportFormState, formData: FormData) => Promise<ReportFormState>;
  /** Unik per spørsmål på siden, så etiketten og feltet henger sammen. */
  idPrefix: string;
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-muted/40 bg-card px-4 py-2 text-base text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * «Meld feil i spørsmålet» (FR-16): en sammenfoldet seksjon med en valgfri kommentar på høyst 500
 * tegn. Ved feil står teksten igjen, og feilen vises ved feltet.
 */
export function ReportForm({ action, idPrefix }: Props) {
  const [state, formAction, pending] = useActionState(action, initialReportFormState);
  const fieldId = `${idPrefix}-kommentar`;
  const errorId = `${fieldId}-feil`;

  return (
    <details className="rounded-2xl border border-muted/40 px-5 py-3" open={state.attempt > 0 || undefined}>
      <summary className="min-h-11 cursor-pointer py-2 font-semibold text-accent focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent">
        {reportSummaryLabel}
      </summary>
      <form key={state.attempt} action={formAction} className="flex flex-col gap-4 pt-3 pb-2">
        <p role="alert" className="font-semibold text-error empty:hidden">
          {state.formError}
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId} className="font-semibold">
            {reportCommentLabel}
          </label>
          <textarea
            id={fieldId}
            name="kommentar"
            rows={3}
            maxLength={500}
            defaultValue={state.comment}
            aria-describedby={state.commentError ? errorId : undefined}
            aria-invalid={state.commentError ? true : undefined}
            className={inputClass}
          />
          <p id={errorId} role="alert" className="font-semibold text-error empty:hidden">
            {state.commentError}
          </p>
        </div>
        <div>
          <button type="submit" disabled={pending} className={secondaryButton}>
            {pending ? reportPendingLabel : reportButtonLabel}
          </button>
        </div>
      </form>
    </details>
  );
}
