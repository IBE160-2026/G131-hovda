import Link from "next/link";
import type { ReactNode } from "react";
import type { GetQuizResult, QuizItemView } from "@/application/quiz";
import {
  allReportedMessage,
  alreadyCompletedMessage,
  alreadyReportedMessage,
  belowThresholdMessage,
  chooseAnswerMessage,
  completedMessage,
  correctAnswerMessage,
  newQuizLabel,
  quizNotReadyMessage,
  reportedFromBankMessage,
  reportedFromQuizMessage,
  subchapterNotFoundMessage,
  tooFewQuestionsMessage,
  unavailableMessage,
  wrongAnswerMessage,
} from "../(innlogget)/emner/formState";
import { primaryButton, textLink } from "../(innlogget)/emner/styles";

/** En handling skjemaet sender: en server action i appen, en funksjon i nettleseren i demoen. */
export type FormAction = (formData: FormData) => void | Promise<void>;

export type QuizScreenProps = {
  result: GetQuizResult;
  /** Spørringsparameterne `feil` og `meldt`, som i appen. */
  error?: string;
  reportedNow?: string;
  /** Lesesiden for delkapittelet og quizen selv. */
  summaryPath: string;
  quizPath: string;
  /** Hvor man går når delkapittelet ikke finnes: startsiden i appen, kapitlene i demoen. */
  home: { href: string; backLabel: string; linkLabel: string };
  /** Starter eller fortsetter quizen, og viser resultatet når alle er besvart. */
  startAction: FormAction;
  /** Svaret (feltet `svar`) på spørsmålet på `position`. */
  answerAction: (quizId: string, position: number) => FormAction;
  /** Feilrapporten på et spørsmål. Uten den vises ingen feilrapport (demoen). */
  reportForm?: (item: QuizItemView, quizId: string) => ReactNode;
};

function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="font-semibold text-error">
      {children}
    </p>
  );
}

/**
 * Quizen på et delkapittel (FR-10, FR-14), delt mellom appen og demoen: spørsmålet, tilbakemeldingen
 * og resultatet. Under resultatet står det om delkapittelet ble krysset av, og under 80 % kommer
 * tilbudet om sammendraget og en ny quiz (FR-15). Feilrapporten (FR-16) er med når `reportForm` er det.
 */
export function QuizScreen({
  result,
  error,
  reportedNow,
  summaryPath,
  quizPath,
  home,
  startAction,
  answerAction,
  reportForm,
}: QuizScreenProps) {
  const back = (
    <header>
      <Link href={result.status === "ok" ? summaryPath : home.href} className={`text-sm ${textLink}`}>
        {result.status === "ok" ? "Til sammendraget" : home.backLabel}
      </Link>
    </header>
  );

  if (result.status === "unavailable") {
    return (
      <>
        {back}
        <Alert>{unavailableMessage}</Alert>
      </>
    );
  }
  if (result.status === "notFound" || result.status === "notReady") {
    return (
      <>
        {back}
        <div className="flex flex-col gap-3">
          <p className="text-lg text-muted">
            {result.status === "notFound" ? subchapterNotFoundMessage : quizNotReadyMessage}
          </p>
          <p>
            <Link href={home.href} className={textLink}>
              {home.linkLabel}
            </Link>
          </p>
        </div>
      </>
    );
  }

  const { chapter, subchapter, total } = result;
  return (
    <>
      {back}
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold break-words text-muted">
            Kapittel {chapter.number}: {chapter.title}
          </p>
          <h1 className="text-3xl leading-tight font-bold break-words sm:text-4xl">
            Quiz: {subchapter.number} <span className="font-normal">{subchapter.title}</span>
          </h1>
        </header>

        {error === "1" && <Alert>{unavailableMessage}</Alert>}
        {error === "valg" && result.stage === "question" && <Alert>{chooseAnswerMessage}</Alert>}
        {reportForm && reportedNow === "quiz" && (
          <p role="status" className="rounded-2xl bg-card px-5 py-3 text-lg font-semibold">
            {reportedFromQuizMessage}
          </p>
        )}

        {result.stage === "start" &&
          (result.tooFew ? (
            <p className="text-lg text-muted">{tooFewQuestionsMessage}</p>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-lg">Quizen har {total} spørsmål fra spørsmålsbanken. Svarene lagres underveis.</p>
              <form action={startAction}>
                <button type="submit" className={primaryButton}>
                  Start quizen
                </button>
              </form>
            </div>
          ))}

        {result.stage === "question" && (
          <form action={answerAction(result.quizId, result.item.position)} className="flex flex-col gap-6">
            <fieldset className="flex min-w-0 flex-col gap-3">
              <legend className="mb-3 flex flex-col gap-2">
                <span className="text-sm font-semibold text-muted">
                  Spørsmål {result.item.number} av {total}
                </span>
                <span className="text-xl font-semibold break-words">{result.item.question}</span>
              </legend>
              {result.item.options.map((option, i) => (
                <label
                  key={i}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-muted/40 bg-card px-4 py-3 text-lg break-words has-[:checked]:border-accent has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
                >
                  <input type="radio" name="svar" value={i} required className="mt-1.5 size-5 shrink-0 accent-accent" />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
            <div>
              <button type="submit" className={primaryButton}>
                Svar
              </button>
            </div>
          </form>
        )}
        {result.stage === "question" && reportForm?.(result.item, result.quizId)}

        {result.stage === "feedback" && (
          <>
            <Feedback item={result.item} total={total} />
            <p>
              <Link href={quizPath} className={primaryButton}>
                Neste spørsmål
              </Link>
            </p>
            {reportForm?.(result.item, result.quizId)}
          </>
        )}

        {result.stage === "unfinished" && (
          <div className="flex flex-col gap-4">
            <p className="text-lg">Alle spørsmålene er besvart.</p>
            <form action={startAction}>
              <button type="submit" className={primaryButton}>
                Se resultatet
              </button>
            </form>
          </div>
        )}

        {result.stage === "result" && (
          <>
            {result.item && <Feedback item={result.item} total={total} />}
            {result.item &&
              reportForm &&
              (reportedNow === "banken" ? (
                <p role="status" className="rounded-2xl bg-card px-5 py-3 text-lg font-semibold">
                  {reportedFromBankMessage}
                </p>
              ) : result.item.reported ? (
                <p className="text-lg text-muted">{alreadyReportedMessage}</p>
              ) : (
                reportForm(result.item, result.quizId)
              ))}
            <section aria-labelledby="resultat" className="flex flex-col gap-3 rounded-2xl bg-sky px-6 py-5">
              <h2 id="resultat" className="text-lg font-semibold">
                Resultat
              </h2>
              {result.total === 0 ? (
                <p className="text-lg font-semibold">{allReportedMessage}</p>
              ) : (
                <p className="text-3xl font-bold">{result.resultText}</p>
              )}
              {result.completedBy === "this" && <p className="text-lg font-semibold">{completedMessage}</p>}
              {result.completedBy === "earlier" && <p className="text-lg">{alreadyCompletedMessage}</p>}
            </section>
            {result.passed ? (
              <p>
                <Link href={summaryPath} className={textLink}>
                  Tilbake til sammendraget
                </Link>
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {result.total > 0 && <p className="max-w-prose text-lg">{belowThresholdMessage}</p>}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                  <form action={startAction}>
                    <button type="submit" className={primaryButton}>
                      {newQuizLabel}
                    </button>
                  </form>
                  <Link href={summaryPath} className={textLink}>
                    Les sammendraget igjen
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </article>
    </>
  );
}

/** Svaret som ble gitt, om det var riktig, riktig svar og forklaringen. */
function Feedback({ item, total }: { item: QuizItemView; total: number }) {
  const chosen = item.chosenIndex === null ? null : item.options[item.chosenIndex];
  return (
    <section aria-labelledby="tilbakemelding" className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-muted">
        Spørsmål {item.number} av {total}
      </p>
      <p className="text-xl font-semibold break-words">{item.question}</p>
      <div className={`flex flex-col gap-3 rounded-2xl px-6 py-5 ${item.correct ? "bg-mint" : "bg-sun"}`}>
        <h2 id="tilbakemelding" className="text-2xl font-bold">
          {item.correct ? correctAnswerMessage : wrongAnswerMessage}
        </h2>
        {!item.correct && (
          <dl className="flex flex-col gap-2 text-lg break-words">
            <div>
              <dt className="inline font-semibold">Du svarte: </dt>
              <dd className="inline">{chosen}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Riktig svar: </dt>
              <dd className="inline">{item.options[item.correctIndex]}</dd>
            </div>
          </dl>
        )}
        <p className="max-w-prose text-lg leading-relaxed break-words">{item.explanation}</p>
      </div>
    </section>
  );
}
